import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env.vercel.production.check';
const confirmed = args.has('--confirm');
const replaceReviewedProduction = args.has('--replace-reviewed-production');
const dryRun = !args.has('--write');
const sourceArg = process.argv.find((arg) => arg.startsWith('--source='));
const sourceFile = sourceArg ? sourceArg.split('=').slice(1).join('=') : 'data/gyms.json';

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

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeGym(gym, index) {
  const disciplines = Array.isArray(gym.disciplines)
    ? gym.disciplines.map((discipline) => String(discipline || '').trim()).filter(Boolean)
    : String(gym.discipline || '')
        .split('|')
        .map((discipline) => discipline.trim())
        .filter(Boolean);
  const weeklyHours =
    gym.weekly_hours && typeof gym.weekly_hours === 'object' && !Array.isArray(gym.weekly_hours)
      ? gym.weekly_hours
      : {};
  const verified =
    typeof gym.verified === 'boolean'
      ? gym.verified
      : ['1', 'true', 'si', 'sì', 'yes'].includes(String(weeklyHours._verified || '').toLowerCase());

  return {
    id: String(gym.id || `gym-${index + 1}`),
    name: String(gym.name || '').trim(),
    discipline: String(gym.discipline || disciplines[0] || 'Fitness').trim() || 'Fitness',
    disciplines,
    address: String(gym.address || '').trim(),
    city: String(gym.city || '').trim(),
    phone: String(gym.phone || '').trim(),
    hours_info: String(gym.hours_info || '').trim() || 'Orari da verificare',
    website: String(gym.website || '').trim(),
    description: String(gym.description || gym.presentazione || '').trim(),
    latitude: normalizeNumber(gym.latitude),
    longitude: normalizeNumber(gym.longitude),
    image_url: String(gym.image_url || '').trim(),
    weekly_hours: {
      ...weeklyHours,
      _verified: verified
    }
  };
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

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let details = '';
    try {
      const body = await response.json();
      details = body?.message || body?.hint || JSON.stringify(body);
    } catch {
      details = await response.text().catch(() => '');
    }
    throw new Error(`${options?.method || 'GET'} ${url.replace(/\?.*$/, '')} failed (${response.status}). ${details}`);
  }
  return response;
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const baseUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`;
const gyms = JSON.parse(await readFile(sourceFile, 'utf8')).map(normalizeGym);

const before = await fetch(`${baseUrl}?select=id`, {
  method: 'HEAD',
  headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' })
});
const beforeCount = before.headers.get('content-range')?.split('/')?.[1] || 'unknown';

const existingResponse = await fetch(`${baseUrl}?select=*&order=id.asc`, {
  headers: supabaseHeaders(serviceKey)
});
if (!existingResponse.ok) {
  throw new Error(`Backup read failed (${existingResponse.status})`);
}
const existingRecords = await existingResponse.json();
const backupFile = `data/supabase-gyms-before-sync-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

console.log(
  `[sync-supabase-gyms] mode=${dryRun ? 'dry-run' : 'write'} table=${table} before=${beforeCount} source=${gyms.length} source_file=${sourceFile}`
);

if (dryRun) {
  console.log('[sync-supabase-gyms] no changes written. Add --write --confirm --replace-reviewed-production to replace Supabase.');
  process.exit(0);
}

if (!confirmed || !replaceReviewedProduction) {
  throw new Error(
    `Refusing to replace Supabase table "${table}" without --write --confirm --replace-reviewed-production. Pending records: ${gyms.length}`
  );
}

await mkdir(path.dirname(backupFile), { recursive: true });
await writeFile(backupFile, `${JSON.stringify(existingRecords, null, 2)}\n`);
console.log(`[sync-supabase-gyms] backup=${backupFile} count=${existingRecords.length}`);

await requestJson(`${baseUrl}?id=not.is.null`, {
  method: 'DELETE',
  headers: supabaseHeaders(serviceKey, { Prefer: 'return=minimal' })
});

const chunkSize = 300;
for (let index = 0; index < gyms.length; index += chunkSize) {
  const chunk = gyms.slice(index, index + chunkSize);
  await requestJson(baseUrl, {
    method: 'POST',
    headers: supabaseHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(chunk)
  });
}

const after = await fetch(`${baseUrl}?select=id`, {
  method: 'HEAD',
  headers: supabaseHeaders(serviceKey, { Prefer: 'count=exact' })
});
const afterCount = after.headers.get('content-range')?.split('/')?.[1] || 'unknown';

console.log(`[sync-supabase-gyms] before=${beforeCount} after=${afterCount} source=${gyms.length}`);
