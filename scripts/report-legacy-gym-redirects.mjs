import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=') || '1'];
}));
const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = args.get('--out') || `data/legacy-gym-redirect-report-${stamp}.json`;

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
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

function clean(value) {
  return String(value || '').trim();
}

function slugPart(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '');
}

function slugifyGym(gym) {
  return clean(gym?._canonical_slug) || slugPart(gym?.name || gym?.nome || 'palestra') || 'palestra';
}

function legacySlugifyGym(gym) {
  const base = slugPart(gym?.name || gym?.nome || 'palestra') || 'palestra';
  const id = clean(gym?.id);
  return id ? `${base}-${id}` : base;
}

function isArchivedGym(gym) {
  return Boolean(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc`, {
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`
  }
});

if (!response.ok) {
  throw new Error(`Cannot read ${table}: ${response.status} ${await response.text()}`);
}

const gyms = await response.json();
const rows = gyms
  .map((gym) => {
    const oldSlug = legacySlugifyGym(gym);
    const newSlug = slugifyGym(gym);
    const archived = isArchivedGym(gym);

    return {
      id: clean(gym.id),
      nome: clean(gym.name || gym.nome),
      old_slug: oldSlug,
      old_url: `/palestre/${oldSlug}`,
      new_slug: newSlug,
      new_url: `/palestre/${newSlug}`,
      status: archived ? 410 : oldSlug !== newSlug ? 301 : 200
    };
  })
  .filter((row) => row.old_slug.includes('-csv-'))
  .sort((a, b) => a.old_slug.localeCompare(b.old_slug, 'it'));

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify({ generated_at: new Date().toISOString(), count: rows.length, rows }, null, 2)}\n`);

const summary = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log(`[legacy-redirect-report] count=${rows.length} status=${JSON.stringify(summary)} file=${outFile}`);
