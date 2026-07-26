// Promotion step of the description-enrichment pipeline: copies facts from
// public.gym_facts into the canonical public.gyms columns the app actually
// reads, then marks the promoted facts applied and refreshes
// descrizione_readiness_score.
//
// Only high-confidence facts are promoted automatically - medium and low stay
// in gym_facts for human review, per the design recorded in
// 20260717_001_description_enrichment_schema.sql. Note that the identity gate
// upstream already caps every field of an unconfirmed gym at low, so a gym
// whose identity was not verified can never reach this script's threshold.
//
// Never overwrites an existing value. The Supabase catalog is manually
// reviewed and is the source of truth; promotion only fills fields that are
// empty across every column the app would read for them (telefono/phone,
// sito/website, orari/hours_info, price_info). There is deliberately no
// --overwrite flag.
//
// Plan-only by default. Writing requires --confirm-apply, and writing to
// production additionally requires --allow-production.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { clean, firstValue } from '../src/lib/gym-normalizer.js';
import { computeDescriptionReadinessScore, descriptionGatingFieldsPresent } from '../src/lib/description-readiness.js';
import {
  CONFIDENCE_RANK,
  FIELD_TARGETS,
  betterFact,
  buildPromotionPatch,
  factText,
  promotionBlockReason
} from '../src/lib/gym-facts-promotion.js';

type Gym = Record<string, any>;
type Fact = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const factsTable = args.get('--facts-table') || 'gym_facts';
const minConfidence = clean(args.get('--min-confidence') || 'high');
const confirmApply = args.has('--confirm-apply');
const allowProduction = args.has('--allow-production');
const maxUpdates = Number(args.get('--max-updates') || '200');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupOut = args.get('--backup-out') || `data/gym-facts-promote-backup-${stamp}.json`;
const logOut = args.get('--log-out') || `data/gym-facts-promote-log-${stamp}.json`;


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

function looksProductionUrl(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  return (
    envName === 'production' ||
    envName === 'prod' ||
    targetEnv === 'production' ||
    targetEnv === 'prod' ||
    supabaseUrl.toLowerCase().includes('prod')
  );
}

function ensureApplyAllowed(supabaseUrl: string) {
  if (!confirmApply) return;
  if (looksProductionUrl(supabaseUrl) && !allowProduction) {
    throw new Error('Apply production bloccato: richiede --allow-production esplicito.');
  }
}


function meetsConfidence(fact: Fact) {
  const rank = CONFIDENCE_RANK[clean(fact.confidence)] || 0;
  const floor = CONFIDENCE_RANK[minConfidence] || CONFIDENCE_RANK.high;
  return rank >= floor;
}


async function fetchPendingFacts(supabaseUrl: string, key: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(factsTable)}?applied=eq.false&select=*&order=gym_id.asc&limit=5000`,
    { method: 'GET', headers: headers(key) }
  );
  if (!response.ok) throw new Error(`Lettura ${factsTable} non riuscita (${response.status}): ${await response.text()}`);
  return (await response.json()) as Fact[];
}

async function fetchGymsByIds(supabaseUrl: string, key: string, ids: string[]) {
  if (!ids.length) return [] as Gym[];
  const encodedIds = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=in.(${encodedIds})&select=*`,
    { method: 'GET', headers: headers(key) }
  );
  if (!response.ok) throw new Error(`Lettura gyms non riuscita (${response.status}): ${await response.text()}`);
  return (await response.json()) as Gym[];
}

async function patchGym(supabaseUrl: string, key: string, id: string, patch: Record<string, any>) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(patch)
    }
  );
  if (!response.ok) throw new Error(`Update gyms ${id} non riuscito (${response.status}): ${await response.text()}`);
}

async function markFactsApplied(supabaseUrl: string, key: string, ids: string[], appliedAt: string) {
  if (!ids.length) return;
  const encodedIds = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(factsTable)}?id=in.(${encodedIds})`,
    {
      method: 'PATCH',
      headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ applied: true, applied_at: appliedAt })
    }
  );
  if (!response.ok) throw new Error(`Update ${factsTable} non riuscito (${response.status}): ${await response.text()}`);
}

// Only send columns that actually exist on the row, matching the defensive
// pattern in apply-price-reassignment.ts - several field names used in JS are
// not real Supabase columns.
function patchExistingColumns(gym: Gym, patch: Record<string, any>) {
  return Object.fromEntries(Object.entries(patch).filter(([key]) => key in gym));
}

await loadEnvFile(path.resolve(envFile));
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
ensureApplyAllowed(supabaseUrl);

const targetIsProduction = looksProductionUrl(supabaseUrl);
const pendingFacts = await fetchPendingFacts(supabaseUrl, serviceKey);
const gymIds = [...new Set(pendingFacts.map((fact) => clean(fact.gym_id)).filter(Boolean))];
const gyms = await fetchGymsByIds(supabaseUrl, serviceKey, gymIds);
const gymById = new Map(gyms.map((gym) => [clean(gym.id), gym]));

console.log(
  `[promote-gym-facts] env=${envFile} production=${targetIsProduction} fatti_non_applicati=${pendingFacts.length} gym=${gymIds.length} min_confidence=${minConfidence}`
);

// Pick the single best eligible fact per (gym, field).
const bestByGymField = new Map<string, Fact>();
const skipped: Record<string, any>[] = [];

for (const fact of pendingFacts) {
  const gymId = clean(fact.gym_id);
  const field = clean(fact.field);
  const text = factText(fact);
  const gym = gymById.get(gymId);

  // Confidence is this script's own gate - the admin queue deliberately has no
  // floor, since a human is looking at the value and its source.
  if (!meetsConfidence(fact)) {
    skipped.push({ fact_id: fact.id, gym_id: gymId, field, reason: 'confidence_sotto_soglia', confidence: fact.confidence });
    continue;
  }

  const blockReason = promotionBlockReason(gym, fact);
  if (blockReason) {
    skipped.push({
      fact_id: fact.id,
      gym_id: gymId,
      field,
      reason: blockReason,
      ...(blockReason === 'campo_gia_valorizzato'
        ? { esistente: clean(firstValue(gym, FIELD_TARGETS[field].readColumns)) }
        : {}),
      ...(blockReason === 'orari_non_utilizzabili' ? { value: text } : {})
    });
    continue;
  }

  const key = `${gymId}|${field}`;
  const current = bestByGymField.get(key);
  if (!current || betterFact(current, fact) > 0) {
    if (current) {
      skipped.push({ fact_id: current.id, gym_id: gymId, field, reason: 'fatto_migliore_disponibile' });
    }
    bestByGymField.set(key, fact);
  } else {
    skipped.push({ fact_id: fact.id, gym_id: gymId, field, reason: 'fatto_migliore_disponibile' });
  }
}

// Group the winners per gym into a single patch each.
const updates: Record<string, any>[] = [];

for (const gymId of gymIds) {
  const gym = gymById.get(gymId);
  if (!gym) continue;

  const chosen = [...bestByGymField.entries()]
    .filter(([key]) => key.startsWith(`${gymId}|`))
    .map(([, fact]) => fact);
  if (!chosen.length) continue;

  const patch: Record<string, any> = {};
  const projected: Gym = { ...gym };
  const changes: Record<string, any>[] = [];

  for (const fact of chosen) {
    const field = clean(fact.field);
    const target = FIELD_TARGETS[field];
    const text = factText(fact);

    Object.assign(patch, buildPromotionPatch(fact));
    projected[target.column] = text;
    changes.push({
      fact_id: fact.id,
      field,
      column: target.column,
      value: text,
      source_url: fact.source_url,
      source_type: fact.source_type,
      confidence: fact.confidence
    });
  }

  // Recomputed here because this is exactly the moment the column's comment
  // describes: facts have just been promoted into canonical fields.
  const scoreBefore = computeDescriptionReadinessScore(gym);
  const scoreAfter = computeDescriptionReadinessScore(projected);
  patch.descrizione_readiness_score = scoreAfter;
  patch.source_discovery_status = 'verified';

  updates.push({
    gym_id: gymId,
    nome: clean(gym.nome || gym.name),
    citta: clean(gym.citta || gym.city),
    changes,
    fact_ids: changes.map((change) => change.fact_id),
    readiness_before: scoreBefore,
    readiness_after: scoreAfter,
    gating_before: descriptionGatingFieldsPresent(gym),
    gating_after: descriptionGatingFieldsPresent(projected),
    patch: patchExistingColumns(gym, patch),
    before: Object.fromEntries(Object.keys(patch).map((column) => [column, gym[column] ?? null]))
  });
}

if (updates.length > maxUpdates) {
  throw new Error(`Update bloccato: ${updates.length} gym superano --max-updates=${maxUpdates}.`);
}

const promotedFactIds = updates.flatMap((update) => update.fact_ids);
const skipReasons: Record<string, number> = {};
for (const item of skipped) skipReasons[item.reason] = (skipReasons[item.reason] || 0) + 1;

const plan = {
  generated_at: new Date().toISOString(),
  mode: confirmApply ? 'apply' : 'plan_only',
  target: { env_file: envFile, table, facts_table: factsTable, production: targetIsProduction },
  min_confidence: minConfidence,
  counts: {
    pending_facts: pendingFacts.length,
    gyms_with_pending_facts: gymIds.length,
    facts_promoted: promotedFactIds.length,
    gyms_updated: updates.length,
    facts_skipped: skipped.length,
    crossing_threshold: updates.filter((update) => update.gating_after.length >= 3 && update.gating_before.length < 3).length
  },
  skip_reasons: skipReasons,
  updates,
  skipped
};

console.log(`[promote-gym-facts] ${JSON.stringify(plan.counts)}`);
console.log(`[promote-gym-facts] motivi_scarto=${JSON.stringify(skipReasons)}`);

await mkdir(path.dirname(logOut), { recursive: true });

if (!confirmApply) {
  await writeFile(logOut, JSON.stringify(plan, null, 2));
  console.log(`[promote-gym-facts] plan-only, nessuna scrittura. plan=${logOut}`);
  console.log('[promote-gym-facts] per scrivere: aggiungi --confirm-apply (e --allow-production se il target e produzione).');
  process.exit(0);
}

await mkdir(path.dirname(backupOut), { recursive: true });
await writeFile(
  backupOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      target: plan.target,
      gyms_before: updates.map((update) => ({ gym_id: update.gym_id, ...update.before })),
      facts_before: pendingFacts.filter((fact) => promotedFactIds.includes(fact.id))
    },
    null,
    2
  )
);
console.log(`[promote-gym-facts] backup=${backupOut}`);

const results: Record<string, any>[] = [];
for (const update of updates) {
  try {
    await patchGym(supabaseUrl, serviceKey, update.gym_id, update.patch);
    results.push({ gym_id: update.gym_id, ok: true, columns: Object.keys(update.patch) });
  } catch (error) {
    results.push({ gym_id: update.gym_id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

// Only mark facts applied for gyms whose patch actually landed, so a failed
// update leaves its facts pending for the next run instead of losing them.
const okGymIds = new Set(results.filter((row) => row.ok).map((row) => row.gym_id));
const appliedFactIds = updates.filter((update) => okGymIds.has(update.gym_id)).flatMap((update) => update.fact_ids);
const appliedAt = new Date().toISOString();
await markFactsApplied(supabaseUrl, serviceKey, appliedFactIds, appliedAt);

await writeFile(
  logOut,
  JSON.stringify(
    { ...plan, mode: 'apply', applied_at: appliedAt, backup_file: backupOut, results, applied_fact_ids: appliedFactIds },
    null,
    2
  )
);

console.log(
  `[promote-gym-facts] gym aggiornati: ${results.filter((row) => row.ok).length}/${results.length}, ` +
    `fatti marcati applied: ${appliedFactIds.length}. log=${logOut}`
);
