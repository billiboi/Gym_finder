import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const apply = process.argv.includes('--apply');
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';

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

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function clean(value) {
  return String(value || '').trim();
}

async function loadOfficialOverrides() {
  let code = await readFile('src/lib/gym-detail.js', 'utf8');
  code = code.replace(/^\uFEFF?import[^\n]+\n/, '');
  code = code.replace(/export function /g, 'function ');
  code = code.replace(/export const /g, 'const ');
  code += '\n;globalThis.__overrides = OFFICIAL_GYM_OVERRIDES;';

  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);

  return context.__overrides || {};
}

function toPatch(override) {
  return {
    official_source_url: clean(override.sourceUrl || override.website),
    editorial_summary: clean(override.presentation),
    editorial_highlights: Array.isArray(override.highlights) ? override.highlights.map(clean).filter(Boolean) : [],
    editorial_faq_items: Array.isArray(override.faqItems)
      ? override.faqItems
          .map((item) => ({
            question: clean(item?.question),
            answer: clean(item?.answer)
          }))
          .filter((item) => item.question && item.answer)
      : [],
    enrichment_status: 'published',
    enrichment_notes: 'Imported from reviewed official-source overrides.',
    enrichment_updated_at: new Date().toISOString()
  };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const overrides = await loadOfficialOverrides();
const overrideEntries = Object.entries(overrides)
  .map(([name, override]) => [clean(name), override])
  .filter(([, override]) => clean(override?.presentation) && Array.isArray(override?.highlights));

const selectUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent('id,name,city,website,editorial_summary,enrichment_status')}&order=name.asc`;
const readResponse = await fetch(selectUrl, {
  headers: headers(serviceKey, { Prefer: 'count=exact' })
});

if (!readResponse.ok) {
  throw new Error(`Read failed (${readResponse.status})`);
}

const rows = await readResponse.json();
const updates = [];

for (const [name, override] of overrideEntries) {
  const matches = rows.filter((row) => clean(row.name) === name);
  for (const row of matches) {
    updates.push({
      id: row.id,
      name: row.name,
      city: row.city,
      had_editorial: Boolean(clean(row.editorial_summary)),
      patch: toPatch(override)
    });
  }
}

const beforeWithEditorial = rows.filter((row) => clean(row.editorial_summary)).length;
const touchedWithoutEditorial = updates.filter((item) => !item.had_editorial).length;

console.log(
  `[sync-official-overrides-enrichment] mode=${apply ? 'apply' : 'dry-run'} overrides=${overrideEntries.length} matched_rows=${updates.length} before_with_editorial=${beforeWithEditorial} newly_enriched=${touchedWithoutEditorial}`
);

for (const item of updates) {
  console.log(`- ${item.id} | ${item.name}${item.city ? ` | ${item.city}` : ''}${item.had_editorial ? ' | already had editorial' : ''}`);
}

if (!apply) {
  console.log('[sync-official-overrides-enrichment] dry run only; pass --apply to update Supabase.');
  process.exit(0);
}

for (const item of updates) {
  const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(item.id)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: headers(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(item.patch)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Patch failed for ${item.id} (${response.status}). ${details}`);
  }
}

console.log(`[sync-official-overrides-enrichment] updated_rows=${updates.length}`);
