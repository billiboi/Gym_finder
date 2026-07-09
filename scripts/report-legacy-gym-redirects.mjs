import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withCanonicalGymSlugs } from '../src/lib/gym-canonical-slug.js';

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

function isArchivedGym(gym) {
  return Boolean(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
// Same fetch order as the sitemap and detail route so duplicate-name
// disambiguation assigns identical slugs here and on the live site.
const response = await fetch(
  `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=updated_at.desc.nullslast,nome.asc.nullslast,id.asc`,
  {
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`
  }
});

if (!response.ok) {
  throw new Error(`Cannot read ${table}: ${response.status} ${await response.text()}`);
}

const rawGyms = await response.json();

// _legacy_slug (base-id) is context-independent: compute it for every row,
// active or archived, through the same canonicalization the live site uses.
const legacySlugById = new Map(
  withCanonicalGymSlugs(rawGyms).map((gym) => [String(gym.id), gym._legacy_slug])
);

// _canonical_slug depends on which OTHER gyms are currently active
// (duplicate-name disambiguation), so it must be computed over the
// active-only catalog -- the same set the sitemap and detail route use.
const activeGyms = rawGyms.filter((gym) => !isArchivedGym(gym));
const canonicalSlugById = new Map(
  withCanonicalGymSlugs(activeGyms).map((gym) => [String(gym.id), gym._canonical_slug])
);

const rows = rawGyms
  .map((gym) => {
    const id = clean(gym.id);
    const archived = isArchivedGym(gym);
    const oldSlug = legacySlugById.get(id) || '';
    const newSlug = archived ? '' : canonicalSlugById.get(id) || '';

    return {
      id,
      nome: clean(gym.name || gym.nome),
      old_slug: oldSlug,
      old_url: `/palestre/${oldSlug}`,
      new_slug: newSlug,
      new_url: newSlug ? `/palestre/${newSlug}` : '',
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
