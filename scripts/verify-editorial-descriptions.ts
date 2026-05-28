import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isUnsafePublicDescription, similarityScore } from '../src/lib/gym-description.js';

type Gym = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const sourcePreview = args.get('--source-preview') || 'editorial-preview-2026-05-28T08-08-10-317Z';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const candidatesJsonOut = args.get('--candidates-json-out') || `data/editorial-publish-candidates-${stamp}.json`;
const candidatesCsvOut = args.get('--candidates-csv-out') || `data/editorial-publish-candidates-${stamp}.csv`;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseEnvValue(value: string) {
  const trimmed = clean(value);
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

function ensureStagingTarget(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  if (envName !== 'staging' || targetEnv === 'production' || url.includes('prod')) {
    throw new Error('Verifica bloccata: usa solo staging/preview con SUPABASE_ENV=staging.');
  }
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function activeGym(gym: Gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name);
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function publishBlockReason(gym: Gym) {
  const name = fold(nameOf(gym));
  const city = fold(cityOf(gym));
  const address = fold(gym.indirizzo || gym.address);
  const score = Number(gym.descrizione_quality_score || 0);
  const suspiciousNamePattern =
    /\b(onde d'?urto|antincendio|corso addetto|vestimee|piscine|balneare|fisioterapia|farmacia|negozio|store|shop|abbigliamento)\b/i;
  const suspiciousAddressPattern = /\b(dietro|\/city|presso|interno)\b/i;

  if (score < 90) return 'quality_score_sotto_90';
  if (!city || /^\d{4,5}$/.test(city)) return 'citta_mancante_o_numerica';
  if (!address || suspiciousAddressPattern.test(address)) return 'indirizzo_mancante_o_sospetto';
  if (suspiciousNamePattern.test(name)) return 'nome_sospetto_non_palestra';
  return '';
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=5000`, {
    method: 'GET',
    headers: headers(key)
  });

  if (!response.ok) {
    throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !readKey) throw new Error('Missing Supabase staging env.');
ensureStagingTarget(supabaseUrl);

const rows = (await readGyms(supabaseUrl, readKey)).filter(activeGym);
const generated = rows.filter((gym) => clean(gym.descrizione_generata));
const generatedFromPreview = generated.filter((gym) => clean(gym.descrizione_source).includes(sourcePreview));
const context = {
  names: rows.map(nameOf).filter(Boolean),
  cities: rows.map(cityOf).filter(Boolean)
};

const exactGroups = new Map<string, Gym[]>();
for (const gym of generatedFromPreview) {
  const key = clean(gym.descrizione_generata).toLowerCase();
  exactGroups.set(key, [...(exactGroups.get(key) || []), gym]);
}

const exactDuplicates = [...exactGroups.entries()].filter(([, gyms]) => gyms.length > 1);
const nearDuplicatePairs: Array<{ left: string; right: string; score: number }> = [];
for (let i = 0; i < generatedFromPreview.length; i += 1) {
  for (let j = i + 1; j < generatedFromPreview.length; j += 1) {
    const left = generatedFromPreview[i];
    const right = generatedFromPreview[j];
    const leftText = clean(left.descrizione_generata);
    const rightText = clean(right.descrizione_generata);
    if (leftText.length < 80 || rightText.length < 80) continue;
    const score = similarityScore(leftText, rightText);
    if (score >= 0.85) {
      nearDuplicatePairs.push({ left: clean(left.id), right: clean(right.id), score: Number(score.toFixed(3)) });
    }
  }
}

const unsafe = generatedFromPreview.filter((gym) => isUnsafePublicDescription(gym, gym.descrizione_generata, context));
const publicMatchesGenerated = generatedFromPreview.filter(
  (gym) => clean(gym.descrizione_pubblica) && clean(gym.descrizione_pubblica) === clean(gym.descrizione_generata)
);
const unsafeIds = new Set(unsafe.map((gym) => clean(gym.id)));
const exactDuplicateIds = new Set(exactDuplicates.flatMap(([, gyms]) => gyms.map((gym) => clean(gym.id))));
const nearDuplicateIds = new Set(nearDuplicatePairs.flatMap((pair) => [pair.left, pair.right]));
const broadCandidates = generatedFromPreview
  .filter((gym) => !gym.descrizione_needs_review)
  .filter((gym) => !unsafeIds.has(clean(gym.id)))
  .filter((gym) => !exactDuplicateIds.has(clean(gym.id)))
  .filter((gym) => !nearDuplicateIds.has(clean(gym.id)));
const blockedCandidates = broadCandidates
  .map((gym) => ({ gym, reason: publishBlockReason(gym) }))
  .filter((item) => item.reason)
  .map((item) => ({
    id: clean(item.gym.id),
    nome: nameOf(item.gym),
    citta: cityOf(item.gym),
    reason: item.reason,
    descrizione_quality_score: Number(item.gym.descrizione_quality_score || 0)
  }));
const blockedCandidateIds = new Set(blockedCandidates.map((item) => item.id));
const candidates = broadCandidates
  .filter((gym) => !blockedCandidateIds.has(clean(gym.id)))
  .map((gym) => ({
    id: clean(gym.id),
    slug: clean(gym.slug || gym._canonical_slug),
    nome: nameOf(gym),
    citta: cityOf(gym),
    indirizzo: clean(gym.indirizzo || gym.address),
    descrizione_generata: clean(gym.descrizione_generata),
    descrizione_source: clean(gym.descrizione_source),
    descrizione_quality_score: Number(gym.descrizione_quality_score || 0)
  }));

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function candidatesToCsv(rows: typeof candidates) {
  const headers = [
    'id',
    'slug',
    'nome',
    'citta',
    'indirizzo',
    'descrizione_generata',
    'descrizione_source',
    'descrizione_quality_score'
  ];
  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof typeof row])).join(';'))].join('\n');
}

const payload = {
  active_records: rows.length,
  generated_records_total: generated.length,
  generated_from_preview: generatedFromPreview.length,
  exact_duplicate_groups: exactDuplicates.length,
  exact_duplicate_records: exactDuplicates.reduce((total, [, gyms]) => total + gyms.length, 0),
  near_duplicate_pairs: nearDuplicatePairs.length,
  needs_review: generatedFromPreview.filter((gym) => Boolean(gym.descrizione_needs_review)).length,
  unsafe_generated: unsafe.length,
  descrizione_pubblica_equal_generated: publicMatchesGenerated.length,
  broad_publish_candidate_count: broadCandidates.length,
  blocked_publish_candidate_count: blockedCandidates.length,
  publish_candidate_count: candidates.length,
  publish_candidate_files: {
    json: candidatesJsonOut,
    csv: candidatesCsvOut
  },
  sample_exact_duplicates: exactDuplicates.slice(0, 3).map(([, gyms]) => gyms.map((gym) => clean(gym.id))),
  sample_near_duplicates: nearDuplicatePairs.slice(0, 10),
  sample_unsafe: unsafe.slice(0, 10).map((gym) => ({
    id: clean(gym.id),
    nome: nameOf(gym),
    citta: cityOf(gym),
    quality_score: gym.descrizione_quality_score,
    needs_review: Boolean(gym.descrizione_needs_review),
    descrizione_generata: clean(gym.descrizione_generata)
  }))
};

await mkdir(path.dirname(candidatesJsonOut), { recursive: true });
await writeFile(
  candidatesJsonOut,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: { env_file: envFile, table, target: 'staging', source_preview: sourcePreview },
      criteria: {
        generated_from_preview: true,
        descrizione_needs_review: false,
        unsafe_generated: false,
        exact_duplicate: false,
        near_duplicate: false,
        conservative_publish_block: false,
        minimum_quality_score: 90
      },
      broad_candidate_count: broadCandidates.length,
      blocked_candidate_count: blockedCandidates.length,
      blocked_candidates: blockedCandidates,
      count: candidates.length,
      rows: candidates
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(candidatesCsvOut, `${candidatesToCsv(candidates)}\n`, 'utf8');

console.log(JSON.stringify(payload, null, 2));
