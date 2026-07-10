import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Per docs/ROADMAP.md priority 1 (fase 3): realigns staging as a copy of
// production for all existing records, via upsert (merge-duplicates on id).
// Never deletes rows on either side. Production is read-only in this script;
// only staging is ever written to.

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const productionEnvFile = args.get('--production-env-file') || '.env.vercel.production.check';
const stagingEnvFile = args.get('--staging-env-file') || '.env.staging.local';
const confirmApply = args.has('--confirm-apply');

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnv(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key) env[key] = value;
  }
  return env;
}

function ensureStagingTarget(env) {
  const url = String(env.SUPABASE_URL || '').toLowerCase();
  const envName = String(env.SUPABASE_ENV || '').toLowerCase();
  if (envName !== 'staging' || url.includes('prod')) {
    throw new Error('Blocked: --staging-env-file must resolve to the staging project (SUPABASE_ENV=staging).');
  }
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

async function main() {
  const productionEnv = await loadEnv(path.resolve(productionEnvFile));
  const stagingEnv = await loadEnv(path.resolve(stagingEnvFile));
  ensureStagingTarget(stagingEnv);

  const prodUrl = productionEnv.SUPABASE_URL.replace(/\/$/, '');
  const prodKey = productionEnv.SUPABASE_SERVICE_ROLE_KEY;
  const stagingUrl = stagingEnv.SUPABASE_URL.replace(/\/$/, '');
  const stagingKey = stagingEnv.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[copy-prod-to-staging] reading production...');
  const prodRes = await fetch(`${prodUrl}/rest/v1/gyms?select=*&order=id.asc&limit=2000`, {
    headers: headers(prodKey)
  });
  if (!prodRes.ok) throw new Error(`Production read failed (${prodRes.status}): ${await prodRes.text()}`);
  const prodRows = await prodRes.json();
  console.log(`[copy-prod-to-staging] production_rows=${prodRows.length}`);

  console.log('[copy-prod-to-staging] backing up staging before any write...');
  const stagingRes = await fetch(`${stagingUrl}/rest/v1/gyms?select=*&order=id.asc&limit=2000`, {
    headers: headers(stagingKey)
  });
  if (!stagingRes.ok) throw new Error(`Staging read failed (${stagingRes.status}): ${await stagingRes.text()}`);
  const stagingRowsBefore = await stagingRes.json();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `audit/full-gyms-backup-staging-${stamp}.json`;
  await mkdir('audit', { recursive: true });
  await writeFile(backupPath, JSON.stringify(stagingRowsBefore, null, 2), 'utf8');
  console.log(`[copy-prod-to-staging] staging backup written: ${backupPath} (${stagingRowsBefore.length} rows)`);

  const stagingIds = new Set(stagingRowsBefore.map((r) => r.id));
  const willUpdate = prodRows.filter((r) => stagingIds.has(r.id)).length;
  const willInsert = prodRows.filter((r) => !stagingIds.has(r.id)).length;
  console.log(`[copy-prod-to-staging] plan: ${willUpdate} existing records to update, ${willInsert} new records to insert`);
  console.log(`[copy-prod-to-staging] plan: staging-only records left untouched: ${[...stagingIds].filter((id) => !prodRows.some((r) => r.id === id)).length}`);

  if (!confirmApply) {
    console.log('[copy-prod-to-staging] DRY RUN — no writes performed. Re-run with --confirm-apply to upsert production into staging.');
    return;
  }

  const chunkSize = 200;
  let upserted = 0;
  for (let i = 0; i < prodRows.length; i += chunkSize) {
    const chunk = prodRows.slice(i, i + chunkSize);
    const res = await fetch(`${stagingUrl}/rest/v1/gyms`, {
      method: 'POST',
      headers: headers(stagingKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      throw new Error(`Upsert chunk ${i}-${i + chunk.length} failed (${res.status}): ${await res.text()}`);
    }
    upserted += chunk.length;
    console.log(`[copy-prod-to-staging] upserted ${upserted}/${prodRows.length}`);
  }

  const afterRes = await fetch(`${stagingUrl}/rest/v1/gyms?select=id&limit=1`, {
    headers: headers(stagingKey, { Prefer: 'count=exact' })
  });
  const afterCount = afterRes.headers.get('content-range')?.split('/')?.[1] || 'unknown';
  console.log(`[copy-prod-to-staging] done. staging total after=${afterCount} (before=${stagingRowsBefore.length})`);
}

await main();
