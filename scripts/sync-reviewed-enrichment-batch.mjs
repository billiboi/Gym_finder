import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const batchArg = process.argv.find((arg) => arg.startsWith('--batch='));
const apply = process.argv.includes('--apply');
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';
const batchFile = batchArg?.split('=').slice(1).join('=');

if (!batchFile) {
  throw new Error('Missing --batch=path/to/batch.json');
}

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

function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      question: clean(item?.question),
      answer: clean(item?.answer)
    }))
    .filter((item) => item.question && item.answer);
}

function normalizePatch(entry) {
  const patch = {
    enrichment_status: clean(entry.enrichment_status) || 'published',
    enrichment_notes: clean(entry.enrichment_notes),
    enrichment_updated_at: new Date().toISOString()
  };

  if (Object.hasOwn(entry, 'official_source_url')) {
    patch.official_source_url = clean(entry.official_source_url);
  }

  if (Object.hasOwn(entry, 'editorial_summary')) {
    patch.editorial_summary = clean(entry.editorial_summary);
  }

  if (Object.hasOwn(entry, 'editorial_highlights')) {
    patch.editorial_highlights = Array.isArray(entry.editorial_highlights)
      ? entry.editorial_highlights.map(clean).filter(Boolean)
      : [];
  }

  if (Object.hasOwn(entry, 'editorial_faq_items')) {
    patch.editorial_faq_items = normalizeFaqItems(entry.editorial_faq_items);
  }

  if (Object.hasOwn(entry, 'price_info')) {
    patch.price_info = clean(entry.price_info);
    patch.price_source_url = clean(entry.price_source_url) || clean(entry.official_source_url);
    patch.price_updated_at = new Date().toISOString();
  }

  return patch;
}

await loadEnvFile(path.resolve(envFile));

const batch = JSON.parse(await readFile(batchFile, 'utf8'));
const entries = Array.isArray(batch?.entries) ? batch.entries : [];

if (!entries.length) {
  throw new Error(`Batch has no entries: ${batchFile}`);
}

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const ids = entries.map((entry) => clean(entry.id)).filter(Boolean);

if (ids.length !== entries.length) {
  throw new Error('Every batch entry must include an id.');
}

const selectUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent('id,name,city,editorial_summary,price_info,enrichment_status')}&id=in.(${ids.map(encodeURIComponent).join(',')})&order=name.asc`;
const readResponse = await fetch(selectUrl, {
  headers: headers(serviceKey, { Prefer: 'count=exact' })
});

if (!readResponse.ok) {
  const details = await readResponse.text().catch(() => '');
  throw new Error(`Read failed (${readResponse.status}). ${details}`);
}

const rows = await readResponse.json();
const rowById = new Map(rows.map((row) => [clean(row.id), row]));
const missing = ids.filter((id) => !rowById.has(id));

if (missing.length) {
  throw new Error(`Batch references missing Supabase ids: ${missing.join(', ')}`);
}

const updates = entries.map((entry) => {
  const id = clean(entry.id);
  const row = rowById.get(id);
  return {
    id,
    name: row.name,
    city: row.city,
    had_editorial: Boolean(clean(row.editorial_summary)),
    had_price: Boolean(clean(row.price_info)),
    patch: normalizePatch(entry)
  };
});

const beforeWithEditorial = rows.filter((row) => clean(row.editorial_summary)).length;
const newlyEnriched = updates.filter((item) => !item.had_editorial).length;
const entriesWithPrice = updates.filter((item) => Object.hasOwn(item.patch, 'price_info')).length;
const newlyPriced = updates.filter((item) => Object.hasOwn(item.patch, 'price_info') && !item.had_price).length;

console.log(
  `[sync-reviewed-enrichment-batch] mode=${apply ? 'apply' : 'dry-run'} batch=${clean(batch.batch) || path.basename(batchFile)} entries=${entries.length} matched_rows=${updates.length} selected_before_with_editorial=${beforeWithEditorial} newly_enriched=${newlyEnriched} entries_with_price=${entriesWithPrice} newly_priced=${newlyPriced}`
);

for (const item of updates) {
  console.log(`- ${item.id} | ${item.name}${item.city ? ` | ${item.city}` : ''}${item.had_editorial ? ' | already had editorial' : ''}${item.had_price ? ' | already had price' : ''}`);
}

if (!apply) {
  console.log('[sync-reviewed-enrichment-batch] dry run only; pass --apply to update Supabase.');
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

console.log(`[sync-reviewed-enrichment-batch] updated_rows=${updates.length}`);
