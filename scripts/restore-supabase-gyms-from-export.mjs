import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const sourceArg = process.argv.find((arg) => arg.startsWith('--source='));
const tableArg = process.argv.find((arg) => arg.startsWith('--table='));
const apply = process.argv.includes('--apply');
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';
const sourceFile = sourceArg?.split('=').slice(1).join('=');

if (!sourceFile) {
  throw new Error('Missing --source=data/supabase-gyms-export-....json');
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

function uniqueIds(records) {
  const ids = new Set();
  const duplicates = new Set();
  for (const record of records) {
    const id = clean(record?.id);
    if (!id) continue;
    if (ids.has(id)) duplicates.add(id);
    ids.add(id);
  }
  return { ids, duplicates: [...duplicates] };
}

async function readTargetCount(baseUrl, table, serviceKey) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=id&limit=1`, {
    headers: headers(serviceKey, { Prefer: 'count=exact' })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Target count failed (${response.status}). ${details}`);
  }

  const count = response.headers.get('content-range')?.split('/')?.[1];
  if (count && count !== '*') return Number(count);

  const rows = await response.json();
  return Array.isArray(rows) ? rows.length : 0;
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = tableArg?.split('=').slice(1).join('=') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const sourcePath = path.resolve(sourceFile);
const records = JSON.parse(await readFile(sourcePath, 'utf8'));

if (!Array.isArray(records)) {
  throw new Error(`Source is not an array: ${sourceFile}`);
}

const { ids, duplicates } = uniqueIds(records);
if (ids.size !== records.length) {
  throw new Error(`Source has missing ids or duplicate ids. unique=${ids.size} records=${records.length} duplicates=${duplicates.join(', ')}`);
}

const beforeCount = await readTargetCount(supabaseUrl, table, serviceKey);
const safetyFile = `data/supabase-gyms-empty-target-before-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

console.log(
  `[restore-supabase-gyms-from-export] mode=${apply ? 'apply' : 'dry-run'} table=${table} target_before=${beforeCount} source=${records.length} source_file=${sourceFile}`
);

if (beforeCount !== 0) {
  throw new Error(`Refusing restore because target table is not empty. target_before=${beforeCount}`);
}

if (!apply) {
  console.log('[restore-supabase-gyms-from-export] dry run only; pass --apply to insert records.');
  process.exit(0);
}

await mkdir(path.dirname(safetyFile), { recursive: true });
await writeFile(safetyFile, '[]\n', 'utf8');

const baseUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`;
const chunkSize = 200;

for (let i = 0; i < records.length; i += chunkSize) {
  const chunk = records.slice(i, i + chunkSize);
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: headers(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(chunk)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Insert failed at offset ${i} (${response.status}). ${details}`);
  }
}

const afterCount = await readTargetCount(supabaseUrl, table, serviceKey);
console.log(`[restore-supabase-gyms-from-export] safety_backup=${safetyFile} before=${beforeCount} after=${afterCount} source=${records.length}`);

if (afterCount !== records.length) {
  throw new Error(`Restore count mismatch. after=${afterCount} source=${records.length}`);
}
