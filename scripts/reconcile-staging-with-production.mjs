import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Reconciliation step per docs/ROADMAP.md priority 1 (fase 2/3), following the
// read-only diff in docs/audit/staging-production-diff-2026-07.md. Archives on
// STAGING only the 15 records that production had already archived
// independently on 2026-05-15 (the Activ Fitness and FitActive chains), so
// staging's active/archived status matches production. Production itself is
// never touched by this script.
const RECORDS_TO_ARCHIVE = [
  { id: 'csv-28', nome: 'Activ Fitness Bellinzona' },
  { id: 'csv-29', nome: 'Activ Fitness Giubiasco' },
  { id: 'csv-30', nome: 'Activ Fitness Losone' },
  { id: 'csv-31', nome: 'Activ Fitness Lugano' },
  { id: 'csv-32', nome: 'Activ Fitness Mendrisio' },
  { id: 'csv-33', nome: 'Activ Fitness Riazzino' },
  { id: 'csv-34', nome: 'Activ Fitness Serfontana' },
  { id: 'csv-36', nome: 'Activ Fitness Vezia' },
  { id: 'csv-221', nome: 'FitActive' },
  { id: 'csv-222', nome: 'FitActive Bellinzona' },
  { id: 'csv-223', nome: 'FitActive Busto Arsizio' },
  { id: 'csv-224', nome: 'FitActive Castellanza' },
  { id: 'csv-225', nome: 'FitActive Lugano' },
  { id: 'csv-226', nome: 'FitActive Mendrisio' },
  { id: 'csv-227', nome: 'FitActive Saronno' }
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

  const idList = RECORDS_TO_ARCHIVE.map((item) => item.id);
  const idFilter = `(${idList.map((id) => `"${id}"`).join(',')})`;

  const beforeRes = await fetch(
    `${supabaseUrl}/rest/v1/gyms?select=id,nome,name,deleted_at&id=in.${idFilter}&order=id.asc`,
    { headers: headers(key) }
  );
  if (!beforeRes.ok) throw new Error(`Read failed (${beforeRes.status}): ${await beforeRes.text()}`);
  const beforeRows = await beforeRes.json();

  console.log(`[reconcile-staging] target_ids=${idList.length} found_in_db=${beforeRows.length}`);
  const missing = idList.filter((id) => !beforeRows.some((row) => row.id === id));
  if (missing.length) {
    console.warn(`[reconcile-staging] WARNING missing ids not found in DB: ${missing.join(', ')}`);
  }
  const alreadyArchived = beforeRows.filter((row) => row.deleted_at);
  if (alreadyArchived.length) {
    console.log(`[reconcile-staging] already archived (skipping, no-op): ${alreadyArchived.map((r) => r.id).join(', ')}`);
  }
  const toArchive = beforeRows.filter((row) => !row.deleted_at);
  console.log(`[reconcile-staging] will_archive_now=${toArchive.length}`);
  for (const row of toArchive) {
    console.log(`  - ${row.id} | ${row.nome || row.name}`);
  }

  if (!confirmApply) {
    console.log('[reconcile-staging] DRY RUN — no writes performed. Re-run with --confirm-apply to archive the rows above.');
    return;
  }

  if (!toArchive.length) {
    console.log('[reconcile-staging] Nothing to archive (all target ids already archived or missing).');
    return;
  }

  const nowIso = new Date().toISOString();
  let archivedCount = 0;
  for (const row of toArchive) {
    const res = await fetch(`${supabaseUrl}/rest/v1/gyms?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: headers(key, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        deleted_at: nowIso,
        needs_review: true,
        review_reason: 'staging_production_reconciliation: matches production independent archival 2026-05-15'
      })
    });
    if (!res.ok) {
      console.error(`[reconcile-staging] FAILED to archive ${row.id}: ${res.status} ${await res.text()}`);
      continue;
    }
    archivedCount += 1;
  }

  console.log(`[reconcile-staging] archived_now=${archivedCount}/${toArchive.length}`);

  const afterRes = await fetch(`${supabaseUrl}/rest/v1/gyms?select=id&deleted_at=not.is.null`, {
    headers: headers(key)
  });
  const afterRows = afterRes.ok ? await afterRes.json() : [];
  console.log(`[reconcile-staging] total_archived_records_now=${afterRows.length}`);
}

await main();
