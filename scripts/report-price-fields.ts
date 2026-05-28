import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';

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

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !key) throw new Error('Missing Supabase env.');

const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=5000`, {
  method: 'GET',
  headers: headers(key)
});

if (!response.ok) {
  throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
}

const rows = await response.json();
const active = Array.isArray(rows) ? rows.filter((row) => !row.deleted_at) : [];
const priced = active.filter((row) => clean(row.price_info));
const withPriceSource = active.filter((row) => clean(row.price_source_url));
const withOfficialSource = active.filter((row) => clean(row.official_source_url || row.source_url || row.price_source_url));
const reviewPriced = priced.filter((row) => Boolean(row.needs_review));

function hostForUrl(value: unknown) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function hostsMatch(left: string, right: string) {
  return Boolean(left && right && (left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)));
}

function reviewReasonBlocksPrice(reason: unknown) {
  return /brand_mismatch|city_mismatch|source_domain_mismatch|address_mismatch|branch_mismatch|quick_check_city_mismatch/i.test(
    clean(reason)
  );
}

function priceSourceIsSafe(row: any) {
  const priceHost = hostForUrl(row.price_source_url);
  const websiteHost = hostForUrl(row.website || row.sito);
  const officialHost = hostForUrl(row.official_source_url || row.source_url);
  return Boolean(clean(row.price_info) && priceHost && (hostsMatch(priceHost, websiteHost) || hostsMatch(priceHost, officialHost)));
}

const publishablePriced = priced.filter((row) => priceSourceIsSafe(row) && !reviewReasonBlocksPrice(row.review_reason));

console.log(
  JSON.stringify(
    {
      env_file: envFile,
      table,
      total: Array.isArray(rows) ? rows.length : 0,
      active: active.length,
      priced: priced.length,
      with_price_source: withPriceSource.length,
      with_any_official_source: withOfficialSource.length,
      priced_needs_review: reviewPriced.length,
      publishable_priced_by_current_rules: publishablePriced.length,
      sample_publishable_priced: publishablePriced.slice(0, 30).map((row) => ({
        id: row.id,
        nome: row.nome,
        price_info: row.price_info,
        price_source_url: row.price_source_url,
        official_source_url: row.official_source_url,
        sito: row.sito,
        needs_review: row.needs_review,
        review_reason: row.review_reason
      })),
      sample_priced: priced.slice(0, 30).map((row) => ({
        id: row.id,
        nome: row.nome,
        price_info: row.price_info,
        price_source_url: row.price_source_url,
        official_source_url: row.official_source_url,
        source_url: row.source_url,
        sito: row.sito,
        verified_commercial_info: row.verified_commercial_info,
        commercial_info_last_checked_at: row.commercial_info_last_checked_at,
        needs_review: row.needs_review,
        review_reason: row.review_reason
      }))
    },
    null,
    2
  )
);
