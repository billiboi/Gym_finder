import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Gym = Record<string, any>;
type PreviewRow = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const previewFile = args.get('--preview-file') || '';
const confirmApply = args.has('--confirm-apply');
const dryRun = args.has('--dry-run');
const allowProduction = args.has('--allow-production');
const allowSourceMismatch = args.has('--allow-source-mismatch');
const replaceTargetContaminated = args.has('--replace-target-contaminated');
const allowedRisk = (args.get('--risk') || 'medium').split(',').map((item) => clean(item));
const maxUpdates = Number(args.get('--max-updates') || '0');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupOut = args.get('--backup-out') || `data/price-reassignment-backup-${stamp}.json`;
const logOut = args.get('--log-out') || `data/price-reassignment-apply-log-${stamp}.json`;

const PRICE_FIELDS = ['price_info', 'price_source_url', 'price_updated_at', 'verified_commercial_info', 'commercial_info_last_checked_at'];

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

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function ensureApplyAllowed(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const looksProduction =
    envName === 'production' ||
    envName === 'prod' ||
    targetEnv === 'production' ||
    targetEnv === 'prod' ||
    supabaseUrl.toLowerCase().includes('prod');

  if (!dryRun && !confirmApply) throw new Error('Apply bloccato: aggiungi --confirm-apply dopo aver controllato il preview.');
  if (looksProduction && !allowProduction) throw new Error('Apply production bloccato: richiede --allow-production esplicito.');
  if (!looksProduction && envName !== 'staging') throw new Error('Apply bloccato: usa SUPABASE_ENV=staging per default.');
}

function compactGym(gym: Gym | undefined) {
  if (!gym) return null;
  return {
    id: clean(gym.id),
    nome: clean(gym.nome || gym.name),
    citta: clean(gym.citta || gym.city),
    indirizzo: clean(gym.indirizzo || gym.address),
    sito: clean(gym.sito || gym.website),
    official_source_url: clean(gym.official_source_url),
    source_url: clean(gym.source_url),
    price_info: clean(gym.price_info),
    price_source_url: clean(gym.price_source_url),
    price_updated_at: clean(gym.price_updated_at),
    verified_commercial_info: gym.verified_commercial_info,
    commercial_info_last_checked_at: clean(gym.commercial_info_last_checked_at),
    needs_review: Boolean(gym.needs_review),
    review_reason: clean(gym.review_reason)
  };
}

async function fetchRowsByIds(supabaseUrl: string, serviceKey: string, ids: string[]) {
  if (!ids.length) return [];
  const encodedIds = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=in.(${encodedIds})&select=*`, {
    method: 'GET',
    headers: headers(serviceKey)
  });
  if (!response.ok) throw new Error(`Lettura record non riuscita (${response.status}): ${await response.text()}`);
  return (await response.json()) as Gym[];
}

async function patchGym(supabaseUrl: string, serviceKey: string, id: string, patch: Record<string, any>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(serviceKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error(`Update ${id} non riuscito (${response.status}): ${await response.text()}`);
}

function patchExistingColumns(gym: Gym, patch: Record<string, any>) {
  return Object.fromEntries(Object.entries(patch).filter(([key]) => key in gym));
}

function appendReviewReason(current: unknown, addition: string) {
  const existing = clean(current);
  if (!existing) return addition;
  if (existing.includes(addition)) return existing;
  return `${existing} | ${addition}`.slice(0, 1000);
}

if (!previewFile) throw new Error('Specifica --preview-file=data/price-reassignment-preview-....json');

await loadEnvFile(path.resolve(envFile));
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
ensureApplyAllowed(supabaseUrl);

const preview = JSON.parse(await readFile(previewFile, 'utf8'));
const rows: PreviewRow[] = Array.isArray(preview.rows) ? preview.rows : [];
const eligible = rows.filter(
  (row) => row.action === 'move_to_target' && allowedRisk.includes(clean(row.risk)) && clean(row.source_id) && clean(row.target_id)
);
const selected = maxUpdates > 0 ? eligible.slice(0, maxUpdates) : eligible;
const contaminatedSourceById = new Map(
  rows
    .filter((row) => clean(row.source_id) && ['move_to_target', 'clear_or_review', 'manual_review'].includes(clean(row.action)))
    .map((row) => [clean(row.source_id), row])
);

const ids = [...new Set(selected.flatMap((row) => [clean(row.source_id), clean(row.target_id)]))];
const currentRows = await fetchRowsByIds(supabaseUrl, serviceKey, ids);
const byId = new Map(currentRows.map((row) => [clean(row.id), row]));

await mkdir(path.dirname(backupOut), { recursive: true });
await writeFile(
  backupOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      env_file: envFile,
      table,
      preview_file: previewFile,
      ids,
      records: currentRows
    },
    null,
    2
  )
);

const results = [];

for (const row of selected) {
  const sourceId = clean(row.source_id);
  const targetId = clean(row.target_id);
  const source = byId.get(sourceId);
  const target = byId.get(targetId);
  const proposedPrice = clean(row.price_info);
  const proposedSourceUrl = clean(row.price_source_url);

  if (!source || !target) {
    results.push({ source_id: sourceId, target_id: targetId, status: 'skipped', reason: 'source_or_target_missing' });
    continue;
  }

  const sourceCurrentPrice = clean(source.price_info);
  const targetCurrentPrice = clean(target.price_info);
  const sourceMatchesPreview = !sourceCurrentPrice || sourceCurrentPrice === proposedPrice;
  const targetPreviewRow = contaminatedSourceById.get(targetId);
  const targetHasPreviewContamination = Boolean(
    targetPreviewRow && clean(targetPreviewRow.price_info) && clean(targetPreviewRow.price_info) === targetCurrentPrice
  );
  const targetCanReceive =
    !targetCurrentPrice || targetCurrentPrice === proposedPrice || (replaceTargetContaminated && targetHasPreviewContamination);

  if (!sourceMatchesPreview && !allowSourceMismatch) {
    results.push({ source_id: sourceId, target_id: targetId, status: 'skipped', reason: 'source_price_differs_from_preview' });
    continue;
  }

  if (!targetCanReceive) {
    results.push({ source_id: sourceId, target_id: targetId, status: 'skipped', reason: 'target_already_has_different_price' });
    continue;
  }

  const targetPatch = patchExistingColumns(target, {
    price_info: proposedPrice,
    price_source_url: proposedSourceUrl,
    price_updated_at: clean(target.price_updated_at || source.price_updated_at) || new Date().toISOString(),
    verified_commercial_info: true,
    commercial_info_last_checked_at: clean(target.commercial_info_last_checked_at || source.commercial_info_last_checked_at) || new Date().toISOString()
  });

  if (!dryRun) await patchGym(supabaseUrl, serviceKey, targetId, targetPatch);

  let sourcePatch: Record<string, any> | null = null;
  if (sourceCurrentPrice) {
    sourcePatch = patchExistingColumns(source, {
      price_info: '',
      price_source_url: '',
      verified_commercial_info: false,
      commercial_info_last_checked_at: null,
      needs_review: true,
      review_reason: appendReviewReason(
        source.review_reason,
        `price_reassigned_to:${targetId}; fonte prezzo spostata alla scheda coerente`
      )
    });
    if (!dryRun) await patchGym(supabaseUrl, serviceKey, sourceId, sourcePatch);
  }

  results.push({
    source_id: sourceId,
    source_nome: clean(row.source_nome),
    target_id: targetId,
    target_nome: clean(row.target_nome),
    status: 'updated',
    moved_fields: PRICE_FIELDS,
    source_had_price: Boolean(sourceCurrentPrice),
    replaced_target_contaminated_price: Boolean(targetCurrentPrice && targetHasPreviewContamination),
    target_patch: targetPatch,
    source_patch: sourcePatch
  });
}

await writeFile(
  logOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      env_file: envFile,
      table,
      preview_file: previewFile,
      backup_file: backupOut,
      dry_run: dryRun,
      eligible_count: eligible.length,
      selected_count: selected.length,
      risk_filter: allowedRisk,
      max_updates: maxUpdates,
      replace_target_contaminated: replaceTargetContaminated,
      updated_count: results.filter((row) => row.status === 'updated').length,
      skipped_count: results.filter((row) => row.status === 'skipped').length,
      results
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      backupOut,
      logOut,
      dry_run: dryRun,
      eligible_count: eligible.length,
      selected_count: selected.length,
      risk_filter: allowedRisk,
      max_updates: maxUpdates,
      replace_target_contaminated: replaceTargetContaminated,
      updated_count: results.filter((row) => row.status === 'updated').length,
      skipped_count: results.filter((row) => row.status === 'skipped').length,
      skipped: results.filter((row) => row.status === 'skipped')
    },
    null,
    2
  )
);
