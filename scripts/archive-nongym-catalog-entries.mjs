import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Reviewed 2026-07-10 against docs/gsc-analysis-2026-07-09.md P4 (catalog contamination).
// Each entry was manually confirmed by the product owner as not a gym/martial-arts business.
const CONFIRMED_NON_GYM_IDS = [
  { id: 'csv-131', nome: 'Cisalfa Sport Gavirate', reason: 'retail_chain' },
  { id: 'csv-132', nome: 'Cisalfa Sport Varese', reason: 'retail_chain' },
  { id: 'csv-175', nome: "Decathlon Sant'Antonino", reason: 'retail_chain' },
  { id: 'csv-414', nome: 'Old Wild West - Tradate P.C. Centradate', reason: 'retail_chain' },
  { id: 'csv-514', nome: 'Ritmo Shoes - Tradate', reason: 'retail_chain' },
  { id: 'csv-592', nome: 'Supermercato Migros - Bellinzona - Piazza del Sole', reason: 'retail_chain' },
  { id: 'csv-616', nome: 'Tigot', reason: 'retail_chain' },
  { id: 'csv-682', nome: 'Zappa Sport Intersport', reason: 'retail_chain' },
  { id: 'csv-148', nome: 'Corso addetto antincendio a Tradate 19 marzo 2026', reason: 'dated_event_not_a_business' },
  { id: 'csv-109', nome: 'Centro di Fisioterapia Nosetto Bellinzona', reason: 'physiotherapy_clinic' },
  { id: 'csv-184', nome: "Dr.Frontini Federico - Riabilitazione e Fisioterapia - Onde D'urto - Plantari - FisioWellness", reason: 'physiotherapy_clinic' },
  { id: 'csv-215', nome: 'Fisioterapia Salus - Bellinzona', reason: 'physiotherapy_clinic' },
  { id: 'csv-216', nome: 'Fisioterapia Salus - Giubiasco', reason: 'physiotherapy_clinic' },
  { id: 'csv-217', nome: 'FisioteraPier - Fisioterapia & Benessere', reason: 'physiotherapy_clinic' },
  { id: 'csv-283', nome: 'il Centro | Fisioterapia a Bellinzona', reason: 'physiotherapy_clinic' },
  { id: 'csv-284', nome: 'il Centro | Fisioterapia a Giubiasco', reason: 'physiotherapy_clinic' },
  { id: 'csv-285', nome: 'il Centro | Fisioterapia a Locarno', reason: 'physiotherapy_clinic' },
  { id: 'csv-286', nome: 'il Centro | Fisioterapia a Lugano', reason: 'physiotherapy_clinic' },
  { id: 'csv-287', nome: 'il Centro | Fisioterapia a Mendrisio', reason: 'physiotherapy_clinic' },
  { id: 'csv-505', nome: "Re Activ Lugano - FISIOTERAPIA - CRIOTERAPIA - LINFODRENAGGIO", reason: 'physiotherapy_clinic' },
  { id: 'csv-612', nome: 'TheraHub - Riabilitazione, fisioterapia, osteopatia e fitness Mendrisio', reason: 'physiotherapy_clinic' },
  { id: 'csv-421', nome: 'Oriella Page | Centro estetico a Locarno', reason: 'beauty_salon' },
  { id: 'csv-667', nome: 'YOGA STORE', reason: 'ambiguous_retail_or_studio' }
];

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const confirmApply = args.has('--confirm-apply');

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

function ensureStagingTarget(supabaseUrl) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  if (envName !== 'staging' || targetEnv === 'production' || url.includes('prod')) {
    throw new Error('Blocked: use only .env.staging.local / SUPABASE_ENV=staging for this script.');
  }
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

async function main() {
  await loadEnvFile(path.resolve(envFile));
  const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  ensureStagingTarget(supabaseUrl);

  const idList = CONFIRMED_NON_GYM_IDS.map((item) => item.id);
  const idFilter = `(${idList.map((id) => `"${id}"`).join(',')})`;

  const beforeRes = await fetch(
    `${supabaseUrl}/rest/v1/gyms?select=id,nome,name,deleted_at&id=in.${idFilter}&order=id.asc`,
    { headers: headers(key) }
  );
  if (!beforeRes.ok) throw new Error(`Read failed (${beforeRes.status}): ${await beforeRes.text()}`);
  const beforeRows = await beforeRes.json();

  console.log(`[archive-nongym] target_ids=${idList.length} found_in_db=${beforeRows.length}`);
  const missing = idList.filter((id) => !beforeRows.some((row) => row.id === id));
  if (missing.length) {
    console.warn(`[archive-nongym] WARNING missing ids not found in DB: ${missing.join(', ')}`);
  }
  const alreadyArchived = beforeRows.filter((row) => row.deleted_at);
  if (alreadyArchived.length) {
    console.log(`[archive-nongym] already archived (skipping, no-op): ${alreadyArchived.map((r) => r.id).join(', ')}`);
  }
  const toArchive = beforeRows.filter((row) => !row.deleted_at);
  console.log(`[archive-nongym] will_archive_now=${toArchive.length}`);
  for (const row of toArchive) {
    const reason = CONFIRMED_NON_GYM_IDS.find((item) => item.id === row.id)?.reason || 'catalog_contamination';
    console.log(`  - ${row.id} | ${row.nome || row.name} | reason=${reason}`);
  }

  if (!confirmApply) {
    console.log('[archive-nongym] DRY RUN — no writes performed. Re-run with --confirm-apply to archive the rows above.');
    return;
  }

  if (!toArchive.length) {
    console.log('[archive-nongym] Nothing to archive (all target ids already archived or missing).');
    return;
  }

  const nowIso = new Date().toISOString();
  let archivedCount = 0;
  for (const row of toArchive) {
    const reason = CONFIRMED_NON_GYM_IDS.find((item) => item.id === row.id)?.reason || 'catalog_contamination';
    const res = await fetch(`${supabaseUrl}/rest/v1/gyms?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: headers(key, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        deleted_at: nowIso,
        needs_review: true,
        review_reason: `catalog_contamination_p4: ${reason}`
      })
    });
    if (!res.ok) {
      console.error(`[archive-nongym] FAILED to archive ${row.id}: ${res.status} ${await res.text()}`);
      continue;
    }
    archivedCount += 1;
  }

  console.log(`[archive-nongym] archived_now=${archivedCount}/${toArchive.length}`);

  const afterRes = await fetch(`${supabaseUrl}/rest/v1/gyms?select=id&deleted_at=not.is.null`, {
    headers: headers(key)
  });
  const afterRows = afterRes.ok ? await afterRes.json() : [];
  console.log(`[archive-nongym] total_archived_records_now=${afterRows.length}`);
}

await main();
