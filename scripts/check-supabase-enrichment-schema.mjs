import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';

const expectedColumns = [
  'social_links',
  'price_info',
  'price_source_url',
  'price_updated_at',
  'data_verified_at',
  'official_source_url',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'enrichment_status',
  'enrichment_notes',
  'enrichment_updated_at'
];

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

function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const select = expectedColumns.join(',');
const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=1`;

const response = await fetch(url, {
  headers: supabaseHeaders(serviceKey)
});

if (response.ok) {
  console.log(`[check-supabase-enrichment-schema] OK table=${table} columns=${expectedColumns.join(',')}`);
  process.exit(0);
}

let details = '';
try {
  const payload = await response.json();
  details = String(payload?.message || payload?.hint || JSON.stringify(payload)).trim();
} catch {
  details = await response.text().catch(() => '');
}

console.error(
  `[check-supabase-enrichment-schema] missing_or_inaccessible table=${table} status=${response.status} columns=${expectedColumns.join(',')}`
);
if (details) console.error(details);
process.exit(1);
