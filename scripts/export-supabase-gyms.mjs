import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const tableArg = process.argv.find((arg) => arg.startsWith('--table='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';
const outFile =
  outArg?.split('=').slice(1).join('=') ||
  `data/supabase-gyms-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

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
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = tableArg?.split('=').slice(1).join('=') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc`;

const response = await fetch(url, {
  headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' })
});

if (!response.ok) {
  let details = '';
  try {
    const body = await response.json();
    details = body?.message || body?.hint || JSON.stringify(body);
  } catch {
    details = await response.text().catch(() => '');
  }
  throw new Error(`Export failed (${response.status}). ${details}`);
}

const records = await response.json();
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(records, null, 2)}\n`);

const count = response.headers.get('content-range')?.split('/')?.[1] || records.length;
console.log(`[export-supabase-gyms] count=${count} file=${outFile}`);
