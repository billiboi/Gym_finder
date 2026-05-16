import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDisciplineField } from '../src/lib/disciplines.js';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.staging.local';
const apply = process.argv.includes('--apply');
const allowProduction = process.argv.includes('--allow-production');
const now = new Date().toISOString();
const stamp = now.replace(/[:.]/g, '-');
const reportFile = `data/supabase-discipline-normalization-report-${stamp}.json`;

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function ensureStagingTarget({ supabaseUrl, table }) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  const tableName = String(table || '').toLowerCase();
  const looksProduction =
    envName === 'production' ||
    envName === 'prod' ||
    tableName.includes('prod') ||
    url.includes('prod');

  if (looksProduction && !allowProduction) {
    throw new Error('Target bloccato: questo script non scrive su production.');
  }

  if (envName !== 'staging' && !allowProduction) {
    throw new Error('SUPABASE_ENV deve essere "staging" per procedere.');
  }
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function clean(value) {
  return String(value ?? '').trim();
}

function activeGym(gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function rawDisciplines(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length) {
    return gym.disciplines.map(clean).filter(Boolean);
  }

  return clean(gym?.discipline)
    .split('|')
    .map(clean)
    .filter(Boolean);
}

function sameDisciplines(left, right) {
  return left.join(' | ') === right.join(' | ');
}

async function readCount(baseUrl, table, serviceKey) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=id`, {
    method: 'HEAD',
    headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' })
  });

  if (!response.ok) throw new Error(`Conteggio non riuscito (${response.status}).`);
  return response.headers.get('content-range')?.split('/')?.[1] || 'unknown';
}

async function readGyms(baseUrl, table, serviceKey) {
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=2000`,
    { headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' }) }
  );

  if (!response.ok) {
    throw new Error(`Lettura non riuscita (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function patchGym(baseUrl, table, serviceKey, id, patch) {
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(patch)
    }
  );

  if (!response.ok) {
    throw new Error(`Update ${id} non riuscito (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Update ${id} inatteso: record restituiti=${Array.isArray(rows) ? rows.length : 'non-array'}`);
  }

  return rows[0];
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';

ensureStagingTarget({ supabaseUrl, table });

const beforeCount = await readCount(supabaseUrl, table, serviceKey);
const gyms = await readGyms(supabaseUrl, table, serviceKey);
const activeCount = gyms.filter(activeGym).length;

const changes = gyms
  .filter(activeGym)
  .map((gym) => {
    const original = rawDisciplines(gym);
    if (!original.length) return null;

    const normalized = normalizeDisciplineField(original, original);
    const disciplines = normalized.disciplines || [];
    const aliases = normalized.aliases || [];
    const slugs = normalized.slugs || [];

    if (!aliases.length && sameDisciplines(original, disciplines)) return null;

    const weeklyHours = gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {};
    const patch = {
      discipline: disciplines[0] || gym.discipline || 'Fitness',
      disciplines,
      weekly_hours: {
        ...weeklyHours,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: slugs,
        _discipline_original: {
          migrated_at: now,
          discipline: gym.discipline || '',
          disciplines: Array.isArray(gym.disciplines) ? gym.disciplines : []
        }
      }
    };

    return {
      id: gym.id,
      name: gym.nome || gym.name || '',
      before: original,
      after: disciplines,
      aliases,
      slugs,
      patch
    };
  })
  .filter(Boolean);

const applied = [];
if (apply) {
  for (const change of changes) {
    const updated = await patchGym(supabaseUrl, table, serviceKey, change.id, change.patch);
    applied.push({
      id: change.id,
      name: change.name,
      discipline: updated.discipline,
      disciplines: updated.disciplines,
      weekly_hours: {
        _discipline_aliases: updated.weekly_hours?._discipline_aliases || [],
        _discipline_canonical_slugs: updated.weekly_hours?._discipline_canonical_slugs || [],
        _discipline_original: updated.weekly_hours?._discipline_original || null
      }
    });
  }
}

const afterCount = await readCount(supabaseUrl, table, serviceKey);
const report = {
  mode: apply ? 'apply' : 'dry-run',
  env: process.env.SUPABASE_ENV || '',
  table,
  beforeCount,
  afterCount,
  activeCount,
  changeCount: changes.length,
  changedIds: changes.map((change) => change.id),
  changes: changes.map(({ patch, ...change }) => change),
  applied
};

await mkdir(path.dirname(reportFile), { recursive: true });
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `[discipline-normalize] mode=${report.mode} table=${table} before=${beforeCount} after=${afterCount} active=${activeCount} changes=${changes.length} report=${reportFile}`
);
for (const change of changes) {
  console.log(
    `[discipline-normalize] ${change.id} ${change.before.join(' | ')} -> ${change.after.join(' | ')}`
  );
}
