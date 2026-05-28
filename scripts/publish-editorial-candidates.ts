import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isUnsafePublicDescription } from '../src/lib/gym-description.js';

type Gym = Record<string, any>;
type Candidate = {
  id: string;
  slug: string;
  nome: string;
  citta: string;
  indirizzo: string;
  descrizione_generata: string;
  descrizione_source: string;
  descrizione_quality_score: number;
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const candidatesFile = args.get('--candidates') || '';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const confirmPublish = args.has('--confirm-publish');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupOut = args.get('--backup-out') || `data/editorial-publish-backup-staging-${stamp}.json`;
const logOut = args.get('--log-out') || `data/editorial-publish-log-${stamp}.json`;

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
    throw new Error('Publish bloccato: usa solo staging/preview con SUPABASE_ENV=staging.');
  }
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function hasOwnerDescription(gym: Gym) {
  return Boolean(clean(gym.descrizione_owner));
}

function hasVerifiedEditorialDescription(gym: Gym) {
  const source = clean(gym.descrizione_source).toLowerCase();
  return Boolean(clean(gym.descrizione_editoriale) && (source.includes('verificat') || gym.descrizione_last_reviewed_at || gym.descrizione_quality_score >= 80));
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

async function patchGym(baseUrl: string, key: string, id: string, patch: Record<string, any>) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(key, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    throw new Error(`Publish ${id} non riuscito (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function loadCandidates(filePath: string) {
  if (!filePath) throw new Error('Specifica --candidates=data/editorial-publish-candidates-....json');
  const payload = JSON.parse(await readFile(path.resolve(filePath), 'utf8'));
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (!rows.length) throw new Error(`File candidati senza righe: ${filePath}`);
  return rows as Candidate[];
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !key) throw new Error('Missing Supabase staging write env.');
ensureStagingTarget(supabaseUrl);

const candidates = await loadCandidates(candidatesFile);
const gyms = await readGyms(supabaseUrl, key);
const byId = new Map(gyms.map((gym) => [clean(gym.id), gym]));
const context = {
  names: gyms.map((gym) => clean(gym.nome || gym.name)).filter(Boolean),
  cities: gyms.map((gym) => clean(gym.citta || gym.city)).filter(Boolean)
};

const targets = candidates.map((candidate) => {
  const gym = byId.get(clean(candidate.id));
  let skipReason = '';
  if (!gym) skipReason = 'scheda_non_trovata';
  else if (hasOwnerDescription(gym)) skipReason = 'descrizione_owner_presente';
  else if (hasVerifiedEditorialDescription(gym)) skipReason = 'descrizione_editoriale_verificata';
  else if (Boolean(gym.descrizione_needs_review)) skipReason = 'scheda_needs_review';
  else if (isUnsafePublicDescription(gym, candidate.descrizione_generata, context)) skipReason = 'descrizione_generata_unsafe';

  return { candidate, gym, canPublish: !skipReason, skipReason };
});

await mkdir(path.dirname(backupOut), { recursive: true });
await writeFile(
  backupOut,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: { env_file: envFile, table, target: 'staging', candidates: candidatesFile },
      selected_count: candidates.length,
      backup_count: targets.filter((target) => target.gym).length,
      records: targets.map((target) => target.gym).filter(Boolean)
    },
    null,
    2
  )}\n`,
  'utf8'
);

if (!confirmPublish) {
  await writeFile(
    logOut,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        mode: 'publish_plan_only',
        selected_count: candidates.length,
        can_publish_count: targets.filter((target) => target.canPublish).length,
        backup_file: backupOut,
        targets: targets.map((target) => ({
          id: target.candidate.id,
          nome: target.candidate.nome,
          citta: target.candidate.citta,
          can_publish: target.canPublish,
          skip_reason: target.skipReason,
          descrizione_pubblica: target.candidate.descrizione_generata
        }))
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  console.log(`[editorial:publish:plan] selected=${candidates.length} can_publish=${targets.filter((target) => target.canPublish).length}`);
  console.log(`[editorial:publish:plan] backup=${backupOut}`);
  console.log(`[editorial:publish:plan] log=${logOut}`);
  throw new Error('Publish non eseguito: aggiungi --confirm-publish dopo aver verificato piano e backup.');
}

const applied = [];
const skipped = [];
for (const target of targets) {
  if (!target.canPublish) {
    skipped.push({
      id: target.candidate.id,
      reason: target.skipReason
    });
    continue;
  }

  const patch = {
    descrizione_pubblica: target.candidate.descrizione_generata,
    descrizione_source: `${target.candidate.descrizione_source}:published_staging`,
    descrizione_quality_score: target.candidate.descrizione_quality_score,
    descrizione_needs_review: false
  };
  const result = await patchGym(supabaseUrl, key, target.candidate.id, patch);
  applied.push({
    id: target.candidate.id,
    result_count: result.length,
    patch
  });
}

await writeFile(
  logOut,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      mode: 'publish',
      source: { env_file: envFile, table, target: 'staging', candidates: candidatesFile },
      selected_count: candidates.length,
      backup_file: backupOut,
      applied_count: applied.length,
      skipped_count: skipped.length,
      applied,
      skipped
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log(`[editorial:publish] selected=${candidates.length} applied=${applied.length} skipped=${skipped.length}`);
console.log(`[editorial:publish] backup=${backupOut}`);
console.log(`[editorial:publish] log=${logOut}`);
