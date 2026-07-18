// Stage A (Tema 3) of the description-enrichment pipeline: searches the web
// for facts about a gym (phone, website, hours, price) via Claude Haiku 4.5 +
// the web_search server tool, and reports them with source URL + confidence.
// Dry-run only. Never writes to Supabase (gyms or gym_facts) - promoting
// facts into gym_facts is a later apply mode, not built yet. See
// src/lib/description-readiness.js for the completeness gate this feeds.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { clean, firstValue } from '../src/lib/gym-normalizer.js';
import {
  computeDescriptionReadinessScore,
  descriptionGatingFieldsPresent,
  meetsDescriptionThreshold
} from '../src/lib/description-readiness.js';

type Gym = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const limit = Number(args.get('--limit') || '10');
const maxSearchUses = Number(args.get('--max-search-uses') || '4');
const maxIterations = Number(args.get('--max-iterations') || '6');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/gym-facts-dry-run-${stamp}.json`;

function parseEnvValue(value: string) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function activeGym(gym: Gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function idOf(gym: Gym) {
  return clean(gym.id);
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name || 'Questa struttura');
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function addressOf(gym: Gym) {
  return clean(gym.indirizzo || gym.address);
}

function websiteOf(gym: Gym) {
  return clean(firstValue(gym, ['sito', 'website']));
}

function phoneOf(gym: Gym) {
  return clean(firstValue(gym, ['telefono', 'phone']));
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=5000`, {
    method: 'GET',
    headers: supabaseHeaders(key)
  });

  if (!response.ok) {
    throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

const FACT_SCHEMA = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: 'Valore trovato (es. numero di telefono, URL del sito, testo orari, testo prezzo). Stringa vuota se non trovato.'
    },
    source_url: {
      type: 'string',
      description: 'URL della pagina da cui e stato estratto il valore. Stringa vuota se non trovato.'
    },
    source_type: {
      type: 'string',
      enum: ['official_site', 'google_business', 'social', 'article', 'none']
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low', 'none']
    }
  },
  required: ['value', 'source_url', 'source_type', 'confidence'],
  additionalProperties: false
} as const;

const RECORD_FACTS_SCHEMA = {
  type: 'object',
  properties: {
    identity_match: {
      type: 'boolean',
      description:
        'true solo se sei sicuro che le fonti trovate si riferiscano esattamente a questa palestra (stesso nome, stessa citta, stesso indirizzo se disponibile) e non a una sede diversa o un\'attivita omonima.'
    },
    identity_notes: {
      type: 'string',
      description: 'Breve nota su cosa hai trovato, soprattutto se identity_match e false o incerto. Stringa vuota se non serve.'
    },
    telefono: FACT_SCHEMA,
    sito: FACT_SCHEMA,
    orari: FACT_SCHEMA,
    prezzo: FACT_SCHEMA
  },
  required: ['identity_match', 'identity_notes', 'telefono', 'sito', 'orari', 'prezzo'],
  additionalProperties: false
} as const;

function buildSystemPrompt() {
  return [
    'Sei un agente di raccolta dati per palestreinzona.it, una directory italiana di palestre.',
    'Il tuo compito e verificare e arricchire i dati di UNA specifica palestra usando la ricerca web.',
    '',
    'Regole:',
    '1. Prima di estrarre qualsiasi dato, verifica che le fonti trovate si riferiscano esattamente a questa palestra: stesso nome, stessa citta, stesso indirizzo (se disponibile). Se trovi una palestra con nome simile ma indirizzo o citta diversi, non usarla come fonte.',
    '2. Cerca solo tra queste fonti: sito ufficiale, scheda Google Business, pagine social ufficiali (Facebook, Instagram), articoli di terze parti affidabili.',
    '3. Estrai solo questi campi: telefono, sito web ufficiale, orari di apertura, informazioni su prezzo o abbonamento.',
    '4. Non inventare mai un valore. Se non trovi un dato con ragionevole certezza, lascialo vuoto con confidence "none" e source_type "none".',
    '5. Assegna confidence "high" solo se il dato viene dal sito ufficiale o da una scheda Google Business chiaramente corrispondente. "medium" per social ufficiali. "low" per fonti terze o dati ambigui.',
    '6. Quando hai finito la ricerca, chiama record_gym_facts esattamente una volta con il risultato completo. Non chiamarlo piu di una volta e non continuare a cercare dopo averlo chiamato.'
  ].join('\n');
}

function buildUserPrompt(gym: Gym) {
  const name = nameOf(gym);
  const city = cityOf(gym);
  const address = addressOf(gym);
  const website = websiteOf(gym);
  const phone = phoneOf(gym);

  return [
    'Palestra da verificare:',
    `- Nome: ${name}`,
    `- Citta: ${city || 'non disponibile'}`,
    `- Indirizzo: ${address || 'non disponibile'}`,
    `- Sito gia noto in archivio: ${website || 'nessuno'}`,
    `- Telefono gia noto in archivio: ${phone || 'nessuno'}`,
    '',
    'Cerca sul web e conferma o completa telefono, sito ufficiale, orari e informazioni sul prezzo per QUESTA specifica palestra.'
  ].join('\n');
}

async function enrichGym(anthropic: Anthropic, gym: Gym) {
  let captured: Record<string, any> | null = null;

  const recordFacts = betaTool({
    name: 'record_gym_facts',
    description: 'Registra i fatti estratti dal web per questa palestra specifica, con url sorgente e livello di confidenza per ciascun campo. Chiamalo esattamente una volta, al termine della ricerca.',
    inputSchema: RECORD_FACTS_SCHEMA,
    run: (input) => {
      captured = input;
      return 'Fatti registrati.';
    }
  });

  const webSearch = {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: maxSearchUses
  } as const;

  const runner = anthropic.beta.messages.toolRunner({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    max_iterations: maxIterations,
    system: buildSystemPrompt(),
    tools: [webSearch, recordFacts],
    messages: [{ role: 'user', content: buildUserPrompt(gym) }]
  });

  let stopReason: string | null = null;
  let errorMessage = '';
  try {
    const finalMessage = await runner;
    stopReason = finalMessage.stop_reason;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  return {
    id: idOf(gym),
    nome: nameOf(gym),
    citta: cityOf(gym),
    indirizzo: addressOf(gym),
    sito_esistente: websiteOf(gym),
    telefono_esistente: phoneOf(gym),
    readiness_score_before: computeDescriptionReadinessScore(gym),
    gating_fields_present_before: descriptionGatingFieldsPresent(gym),
    stop_reason: stopReason,
    tool_called: Boolean(captured),
    error: errorMessage,
    facts: captured
  };
}

await loadEnvFile(path.resolve(envFile));

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    'Missing ANTHROPIC_API_KEY. Add it to the env file passed via --env-file (default .env.staging.local) or export it in the shell before running this script.'
  );
}

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!readKey) throw new Error('Missing Supabase read key.');

const allRows = await readGyms(supabaseUrl, readKey);
const activeRows = allRows.filter(activeGym);
const candidates = activeRows.filter((gym) => !meetsDescriptionThreshold(gym)).slice(0, limit);

console.log(`[enrich-gym-facts:dry-run] env=${envFile} total=${allRows.length} active=${activeRows.length} candidates=${candidates.length}`);

const anthropic = new Anthropic();
const results = [];

for (const gym of candidates) {
  console.log(`[enrich-gym-facts:dry-run] searching id=${idOf(gym)} nome="${nameOf(gym)}" citta="${cityOf(gym)}"`);
  const result = await enrichGym(anthropic, gym);
  results.push(result);
  console.log(
    `  -> tool_called=${result.tool_called} identity_match=${result.facts?.identity_match ?? 'n/a'} error=${result.error || 'none'}`
  );
}

const summary = {
  candidates: results.length,
  tool_called: results.filter((row) => row.tool_called).length,
  identity_match_true: results.filter((row) => row.facts?.identity_match === true).length,
  errors: results.filter((row) => row.error).length
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(
  jsonOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: { env_file: envFile, table, mode: 'dry_run_read_only' },
      model: 'claude-haiku-4-5',
      summary,
      rows: results
    },
    null,
    2
  )
);

console.log(`[enrich-gym-facts:dry-run] ${JSON.stringify(summary)}`);
console.log(`[enrich-gym-facts:dry-run] json=${jsonOut}`);
