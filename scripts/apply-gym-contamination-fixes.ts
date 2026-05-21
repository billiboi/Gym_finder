import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const previewFile = args.get('--preview-file') || '';
const confirmApply = args.has('--confirm-apply');
const allowProduction = args.has('--allow-production');
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';

function parseEnvValue(value: string) {
  const trimmed = String(value || '').trim();
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

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function hasRecentBackup() {
  const files = await readdir('data').catch(() => []);
  return files.some((file) => /backup|export/i.test(file) && /\.(json|csv)$/i.test(file));
}

function ensureApplyAllowed(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const looksProduction = envName === 'production' || envName === 'prod' || supabaseUrl.toLowerCase().includes('prod');
  if (!confirmApply) throw new Error('Apply bloccato: aggiungi --confirm-apply dopo aver controllato il preview.');
  if (looksProduction && !allowProduction) throw new Error('Apply production bloccato: richiede --allow-production esplicito.');
  if (!looksProduction && envName !== 'staging') throw new Error('Apply bloccato: usa SUPABASE_ENV=staging per default.');
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

if (!previewFile) {
  throw new Error('Specifica --preview-file=data/fix-gym-contamination-preview-....json');
}

await loadEnvFile(path.resolve(envFile));
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
ensureApplyAllowed(supabaseUrl);

if (!(await hasRecentBackup())) {
  throw new Error('Apply bloccato: nessun backup/export locale rilevato in data/. Crea un export prima di procedere.');
}

const preview = JSON.parse(await readFile(previewFile, 'utf8'));
const proposals = Array.isArray(preview.proposals) ? preview.proposals : [];

for (const proposal of proposals) {
  const patch = proposal.proposed_patch || {};
  const allowedPatch = {
    needs_review: Boolean(patch.needs_review),
    data_quality_flags: Array.isArray(patch.data_quality_flags) ? patch.data_quality_flags : [],
    review_reason: String(patch.review_reason || '').slice(0, 1000),
    last_data_audit_at: patch.last_data_audit_at || new Date().toISOString(),
    safe_public_description: String(patch.safe_public_description || '').slice(0, 1200)
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(proposal.id)}`, {
    method: 'PATCH',
    headers: headers(serviceKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(allowedPatch)
  });

  if (!response.ok) {
    throw new Error(`Update ${proposal.id} non riuscito (${response.status}): ${await response.text()}`);
  }
}

console.log(`[apply-gym-contamination-fixes] updated=${proposals.length} table=${table}`);
