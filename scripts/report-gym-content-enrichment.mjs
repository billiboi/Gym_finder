import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';
const outFile =
  outArg?.split('=').slice(1).join('=') ||
  `data/enrichment-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

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

function clean(value) {
  return String(value || '').trim();
}

function hasArrayItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const baseSelect = [
  'id',
  'name',
  'city',
  'website',
  'description',
  'social_links',
  'price_info'
];
const editorialSelect = [
  'id',
  'name',
  'city',
  'website',
  'description',
  'social_links',
  'price_info',
  'official_source_url',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'enrichment_status'
];

async function fetchRows(columns) {
  const select = columns.join(',');
  const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&order=name.asc`;
  return fetch(url, {
    headers: headers(serviceKey, { Prefer: 'count=exact' })
  });
}

let hasEditorialSchema = true;
let response = await fetchRows(editorialSelect);

if (!response.ok && response.status === 400) {
  hasEditorialSchema = false;
  response = await fetchRows(baseSelect);
}

if (!response.ok) {
  let details = '';
  try {
    const payload = await response.json();
    details = payload?.message || payload?.hint || JSON.stringify(payload);
  } catch {
    details = await response.text().catch(() => '');
  }
  throw new Error(`Enrichment report failed (${response.status}). ${details}`);
}

const gyms = await response.json();
const rows = gyms.map((gym) => {
  const website = clean(gym.website);
  const hasWebsite = Boolean(website);
  const hasEditorial =
    Boolean(clean(gym.editorial_summary)) ||
    hasArrayItems(gym.editorial_highlights) ||
    hasArrayItems(gym.editorial_faq_items);

  const missing = [];
  if (!hasWebsite) missing.push('website');
  if (!hasEditorial) missing.push('editorial_content');
  if (!hasArrayItems(gym.social_links)) missing.push('social_links');
  if (!clean(gym.price_info)) missing.push('price_info');

  return {
    id: clean(gym.id),
    name: clean(gym.name),
    city: clean(gym.city),
    website,
    enrichment_status: clean(gym.enrichment_status) || 'pending',
    has_description: Boolean(clean(gym.description)),
    has_official_source: Boolean(clean(gym.official_source_url)),
    has_editorial: hasEditorial,
    has_social_links: hasArrayItems(gym.social_links),
    has_price_info: Boolean(clean(gym.price_info)),
    missing
  };
});

const summary = {
  total: rows.length,
  with_website: rows.filter((row) => row.website).length,
  without_website: rows.filter((row) => !row.website).length,
  missing_editorial_with_website: rows.filter((row) => row.website && !row.has_editorial).length,
  missing_socials_with_website: rows.filter((row) => row.website && !row.has_social_links).length,
  missing_price_with_website: rows.filter((row) => row.website && !row.has_price_info).length
};

const report = {
  generated_at: new Date().toISOString(),
  table,
  has_editorial_schema: hasEditorialSchema,
  summary,
  rows
};

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `[report-gym-content-enrichment] total=${summary.total} with_website=${summary.with_website} editorial_schema=${hasEditorialSchema} missing_editorial_with_website=${summary.missing_editorial_with_website} file=${outFile}`
);
