import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.staging.local';
const allowProduction = process.argv.includes('--allow-production');
const expectedTable = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const migrationPath =
  process.argv
    .find((arg) => arg.startsWith('--migration='))
    ?.split('=')
    .slice(1)
    .join('=') || 'supabase/migrations/20260506_006_gyms_stability_hardening.sql';

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

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function ensureStagingTarget({ supabaseUrl, table }) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  const tableName = String(table || '').toLowerCase();
  const looksProduction =
    envName === 'production' ||
    envName === 'prod' ||
    tableName.includes('prod') ||
    url.includes('prod');

  if (looksProduction && !allowProduction) {
    throw new Error(
      'Target bloccato: questo preflight rifiuta ambienti production. Usa uno staging Supabase separato.'
    );
  }

  if (envName !== 'staging' && !allowProduction) {
    throw new Error('SUPABASE_ENV deve essere "staging" per procedere senza --allow-production.');
  }
}

function assertMigrationIsAdditive(sql) {
  const dangerous = [
    /\bdrop\s+table\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\balter\s+table\b[^;]*\bdrop\s+column\b/i,
    /\balter\s+table\b[^;]*\brename\s+column\b/i
  ];

  for (const pattern of dangerous) {
    if (pattern.test(sql)) {
      throw new Error(`Migration bloccata: pattern distruttivo rilevato (${pattern}).`);
    }
  }
}

async function countRows(baseUrl, serviceKey, table) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=id`, {
    method: 'HEAD',
    headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' })
  });

  if (!response.ok) {
    throw new Error(`Conteggio ${table} non riuscito (${response.status}).`);
  }

  return response.headers.get('content-range')?.split('/')?.[1] || 'unknown';
}

async function columnExists(baseUrl, serviceKey, table, column) {
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(column)}&limit=1`,
    {
      headers: supabaseHeaders(serviceKey)
    }
  );

  if (response.ok) return true;
  if (response.status === 400) return false;
  throw new Error(`Verifica colonna ${column} non riuscita (${response.status}).`);
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || expectedTable;

ensureStagingTarget({ supabaseUrl, table });

const migrationSql = await readFile(path.resolve(migrationPath), 'utf8');
assertMigrationIsAdditive(migrationSql);

const beforeCount = await countRows(supabaseUrl, serviceKey, table);
const checks = await Promise.all(
  ['id', 'nome', 'citta', 'deleted_at', 'data_quality_score'].map(async (column) => ({
    column,
    exists: await columnExists(supabaseUrl, serviceKey, table, column)
  }))
);

console.log(`[staging-readiness] env=${process.env.SUPABASE_ENV || 'unset'} table=${table} count=${beforeCount}`);
console.log(`[staging-readiness] migration=${migrationPath} additive_check=ok`);
for (const check of checks) {
  console.log(`[staging-readiness] column ${check.column}: ${check.exists ? 'present' : 'missing'}`);
}
console.log('[staging-readiness] OK: applica la migration in staging, poi riesegui questo check e confronta count.');
