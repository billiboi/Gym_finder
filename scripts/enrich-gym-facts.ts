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
const envFiles = envFile.split(',').map((value) => value.trim()).filter(Boolean);
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const limit = Number(args.get('--limit') || '10');
// Wave tracking: gyms already processed by a previous run carry a non-pending
// source_discovery_status (written by apply-gym-facts.ts). Without this filter
// every run re-searches the same first N candidates. Pass e.g.
// --redo-status=no_sources_found to deliberately retry an earlier outcome.
const redoStatuses = new Set(
  (args.get('--redo-status') || '')
    .split(',')
    .map((value) => clean(value))
    .filter(Boolean)
);
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

// Treats a missing column as 'pending' so the script still works against an
// environment where the enrichment migration is not readable (staging's
// PostgREST schema cache is stuck on these columns).
function discoveryStatusOf(gym: Gym) {
  return clean(gym.source_discovery_status) || 'pending';
}

function notYetProcessed(gym: Gym) {
  const status = discoveryStatusOf(gym);
  return status === 'pending' || redoStatuses.has(status);
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
      description: 'Tipo di fonte da cui viene il valore. "article" copre aggregatori/directory di terze parti (usali solo come conferma secondaria). "none" se il campo e vuoto.',
      enum: ['official_site', 'google_business', 'social', 'article', 'none']
    },
    confidence: {
      type: 'string',
      description: 'Confidenza sul valore. Se identity_match e false, non puo superare "low". "high" SOLO da official_site o google_business chiaramente corrispondente; le fonti "article" (directory/aggregatori) non superano mai "medium", nemmeno se piu directory concordano; "medium" da social ufficiali o article corroborati; "low" da singola fonte terza isolata o dati ambigui; "none" se il campo e vuoto.',
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
    'VERIFICA IDENTITA (passo piu importante):',
    '1. Prima di estrarre qualsiasi dato, conferma che la fonte si riferisca esattamente a questa palestra e non a una sede diversa o a un\'attivita omonima. L\'indirizzo e il segnale decisivo: se corrisponde nome e citta ma l\'indirizzo e diverso, e un\'altra sede o un omonimo, non usarla.',
    '2. Se l\'indirizzo non e disponibile in archivio, l\'identita e piu debole: confermala con almeno un altro segnale forte (il telefono gia noto, o il dominio del sito gia noto) prima di superare confidence "low". In mancanza di corroborazione, resta prudente.',
    '3. Imposta identity_match a true solo se sei ragionevolmente sicuro. In caso di dubbio, identity_match = false e spiega brevemente in identity_notes cosa hai trovato e perche e incerto.',
    '',
    'ESTRAZIONE DATI:',
    '4. Estrai solo questi campi: telefono, sito web ufficiale, orari di apertura, informazioni su prezzo o abbonamento.',
    '5. Fonti in ordine di affidabilita: sito ufficiale > scheda Google Business > pagine social ufficiali (Facebook, Instagram). Evita aggregatori e directory di terze parti che si limitano a ripubblicare dati: sono una fonte tipica di contaminazione tra omonimi. Usali solo come conferma secondaria, mai come unica fonte.',
    '6. Non usare MAI palestreinzona.it come fonte: e il sito che stiamo arricchendo, quindi citarlo non conferma nulla. Ignora anche le pagine che si limitano a ripubblicare i suoi dati. Se l\'unica fonte per un campo e palestreinzona.it, quel campo non ha conferma indipendente: lascialo vuoto o abbassane la confidence di conseguenza.',
    '7. La confidence di OGNI campo dipende dall\'identita E dal tipo di fonte. Se identity_match e false, nessun campo puo superare "low". Se identity_match e true: "high" SOLO da official_site o google_business chiaramente corrispondente. Le fonti "article" (aggregatori, directory, paginegialle, reteimprese, ecc.) non possono MAI superare "medium", nemmeno se piu directory concordano: spesso si copiano a vicenda, quindi la corroborazione tra directory non equivale a conferme indipendenti. "medium" per social ufficiali e per article corroborati da piu fonti; "low" per una singola fonte terza isolata o per dati ambigui.',
    '8. Non inventare mai un valore. Se non trovi un dato con ragionevole certezza, lascialo vuoto con value "", confidence "none" e source_type "none". Meglio un campo vuoto che un dato sbagliato.',
    '9. source_url deve puntare alla pagina specifica da cui hai letto il dato (es. la pagina contatti o orari), non alla sola homepage quando puoi essere piu preciso.',
    '',
    'CONFRONTO CON L\'ARCHIVIO:',
    '10. I valori "gia noti in archivio" nel messaggio utente sono indizi da verificare, non da ricopiare. Confermali solo se una fonte indipendente li conferma davvero.',
    '11. Se trovi un valore che contraddice quello in archivio (es. un telefono diverso), riporta comunque il valore trovato con la sua fonte e segnala la discrepanza in identity_notes.',
    '',
    'FORMATO:',
    '12. Telefono: formato italiano leggibile (es. "+39 0332 123456" o "0332 123456"). Orari: testo conciso e leggibile (es. "Lun-Ven 9:00-22:00, Sab 9:00-13:00"). Prezzo: testo conciso che indica a cosa si riferisce (es. "Abbonamento mensile da 40 euro").',
    '',
    '13. Quando hai finito la ricerca, chiama record_gym_facts esattamente una volta con il risultato completo. Non chiamarlo piu di una volta e non continuare a cercare dopo averlo chiamato.'
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
    `- Sito gia noto in archivio (da verificare, non da ricopiare): ${website || 'nessuno'}`,
    `- Telefono gia noto in archivio (da verificare, non da ricopiare): ${phone || 'nessuno'}`,
    '',
    'Prima verifica l\'identita di QUESTA specifica palestra (indirizzo decisivo), poi conferma o completa telefono, sito ufficiale, orari e informazioni sul prezzo.'
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
    source_discovery_status_before: discoveryStatusOf(gym),
    stop_reason: stopReason,
    tool_called: Boolean(captured),
    error: errorMessage,
    facts: captured
  };
}

// Accepts a comma-separated list so Supabase credentials and ANTHROPIC_API_KEY
// can live in different env files. Loaded left to right; the first file that
// defines a key wins, so put the intended Supabase target first.
for (const file of envFiles) {
  await loadEnvFile(path.resolve(file));
}

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
const belowThreshold = activeRows.filter((gym) => !meetsDescriptionThreshold(gym));
const pending = belowThreshold.filter(notYetProcessed);
const candidates = pending.slice(0, limit);

console.log(
  `[enrich-gym-facts:dry-run] env=${envFile} total=${allRows.length} active=${activeRows.length} ` +
    `below_threshold=${belowThreshold.length} not_yet_processed=${pending.length} candidates=${candidates.length}` +
    (redoStatuses.size ? ` redo_status=${[...redoStatuses].join(',')}` : '')
);

if (!candidates.length) {
  console.log('[enrich-gym-facts:dry-run] nessun candidato da processare. Usa --redo-status=... per rilanciare esiti precedenti.');
  process.exit(0);
}

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
