import { readFile } from 'node:fs/promises';
import path from 'node:path';

const stagingEnvFile =
  process.argv
    .find((arg) => arg.startsWith('--staging-env-file='))
    ?.split('=')
    .slice(1)
    .join('=') || '.env.staging.local';
const tokenEnvFile =
  process.argv
    .find((arg) => arg.startsWith('--token-env-file='))
    ?.split('=')
    .slice(1)
    .join('=') || '.env.vercel.local';

const REQUIRED_STAGING_KEYS = [
  'SUPABASE_ENV',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_GYMS_TABLE',
  'SUPABASE_CLAIMS_TABLE'
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

async function loadEnvFile(filePath, { optional = false } = {}) {
  let raw = '';
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (err) {
    if (optional && err?.code === 'ENOENT') return {};
    throw err;
  }

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

function required(map, key) {
  const value = map[key] || process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function assertStaging(env) {
  if (env.SUPABASE_ENV !== 'staging') {
    throw new Error('SUPABASE_ENV deve essere "staging". Blocco configurazione Vercel Preview.');
  }

  const url = new URL(env.SUPABASE_URL);
  if (!url.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL non sembra un Project URL Supabase valido.');
  }
}

async function vercelRequest({ token, projectId, teamId, key, value, type }) {
  const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`);
  url.searchParams.set('teamId', teamId);
  url.searchParams.set('upsert', 'true');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key,
      value,
      type,
      target: ['preview'],
      comment: 'Palestre in Zona staging database for Vercel Preview deployments'
    })
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = payload?.error?.message || payload?.message || JSON.stringify(payload);
    } catch {
      details = await response.text().catch(() => '');
    }
    throw new Error(`Vercel env ${key} failed (${response.status}). ${details}`);
  }

  return response.json();
}

const stagingEnv = await loadEnvFile(path.resolve(stagingEnvFile));
const tokenEnv = await loadEnvFile(path.resolve(tokenEnvFile), { optional: true });
const project = JSON.parse(await readFile(path.resolve('.vercel/project.json'), 'utf8'));

for (const key of REQUIRED_STAGING_KEYS) required(stagingEnv, key);
assertStaging(stagingEnv);

const token = required(tokenEnv, 'VERCEL_TOKEN');
const projectId = project.projectId;
const teamId = project.orgId;

if (!projectId || !teamId) {
  throw new Error('Project Vercel non collegato: manca .vercel/project.json con projectId/orgId.');
}

const variables = [
  ['SUPABASE_ENV', stagingEnv.SUPABASE_ENV, 'plain'],
  ['SUPABASE_URL', stagingEnv.SUPABASE_URL, 'encrypted'],
  ['SUPABASE_ANON_KEY', stagingEnv.SUPABASE_ANON_KEY, 'encrypted'],
  ['SUPABASE_SERVICE_ROLE_KEY', stagingEnv.SUPABASE_SERVICE_ROLE_KEY, 'sensitive'],
  ['SUPABASE_GYMS_TABLE', stagingEnv.SUPABASE_GYMS_TABLE, 'plain'],
  ['SUPABASE_CLAIMS_TABLE', stagingEnv.SUPABASE_CLAIMS_TABLE, 'plain'],
  ['SITE_CONTACT_EMAIL', stagingEnv.SITE_CONTACT_EMAIL || 'info@palestreinzona.it', 'plain'],
  ['CLAIM_NOTIFICATION_TO', stagingEnv.CLAIM_NOTIFICATION_TO || 'info@palestreinzona.it', 'plain']
];

console.log(`[vercel-preview-envs] project=${project.projectName || projectId} team=${teamId}`);
for (const [key, value, type] of variables) {
  await vercelRequest({ token, projectId, teamId, key, value, type });
  console.log(`[vercel-preview-envs] ${key}=set target=preview type=${type}`);
}
console.log('[vercel-preview-envs] OK: Vercel Preview now points to Supabase staging.');
