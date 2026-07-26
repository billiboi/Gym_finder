// Supabase access for the gym_facts review queue (/admin/qualita/fatti).
// Backoffice-only: gym_facts is service-role, never exposed publicly.
//
// The promotion rules themselves live in $lib/gym-facts-promotion.js and are
// shared with scripts/promote-gym-facts.ts, so a fact approved by hand here is
// written under exactly the same constraints the batch script applies.

import { clean } from '$lib/gym-normalizer.js';
import { computeDescriptionReadinessScore } from '$lib/description-readiness.js';
import {
  FIELD_TARGETS,
  betterFact,
  buildPromotionPatch,
  currentFieldValue,
  factText,
  fieldIsEmpty,
  promotionBlockReason
} from '$lib/gym-facts-promotion.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const FACTS_TABLE = process.env.SUPABASE_GYM_FACTS_TABLE || 'gym_facts';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

function baseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...extra };
}

// The review columns arrive with 20260726_001. Until that migration is applied
// the queue must degrade to a clear message instead of a 500 - the same class
// of failure as the claim_requests.updated_at incident.
function isMissingReviewSchema(status, body) {
  const text = String(body || '');
  return (
    status === 404 ||
    text.includes('review_status') ||
    text.includes('PGRST204') ||
    text.includes('PGRST205') ||
    text.includes('42703')
  );
}

class MissingReviewSchemaError extends Error {
  constructor() {
    super(
      'Le colonne di revisione di gym_facts non esistono ancora. Applica la migrazione supabase/migrations/20260726_001_gym_facts_review_state.sql.'
    );
    this.code = 'MISSING_REVIEW_SCHEMA';
  }
}

async function supabaseFetch(url, init = {}, { schemaSensitive = false } = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    if (schemaSensitive && isMissingReviewSchema(response.status, body)) throw new MissingReviewSchemaError();
    throw new Error(`Supabase ${init.method || 'GET'} ${response.status}: ${body}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function encodeIds(ids) {
  return ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
}

async function readGymsByIds(ids) {
  if (!ids.length) return [];
  const url = `${baseUrl()}/rest/v1/${encodeURIComponent(GYMS_TABLE)}?id=in.(${encodeIds(ids)})&select=*`;
  return (await supabaseFetch(url, { method: 'GET', headers: headers() })) || [];
}

async function readFactById(id) {
  const url = `${baseUrl()}/rest/v1/${encodeURIComponent(FACTS_TABLE)}?id=eq.${encodeURIComponent(id)}&select=*`;
  const rows = (await supabaseFetch(url, { method: 'GET', headers: headers() }, { schemaSensitive: true })) || [];
  return rows[0] || null;
}

async function patchFact(id, patch) {
  const url = `${baseUrl()}/rest/v1/${encodeURIComponent(FACTS_TABLE)}?id=eq.${encodeURIComponent(id)}`;
  await supabaseFetch(
    url,
    {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(patch)
    },
    { schemaSensitive: true }
  );
}

async function patchGym(id, patch) {
  const url = `${baseUrl()}/rest/v1/${encodeURIComponent(GYMS_TABLE)}?id=eq.${encodeURIComponent(id)}`;
  await supabaseFetch(url, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(patch)
  });
}

function gymLabel(gym) {
  return clean(gym?.nome || gym?.name) || 'Senza nome';
}

/**
 * Builds the review queue: facts awaiting a human decision, newest extraction
 * first, each paired with what the catalog currently holds for that field.
 *
 * Facts whose target field is already filled are kept but marked, because the
 * useful default is to hide them - they are re-confirmations of data we have,
 * which is the bulk of what the agent returns.
 */
export async function readFactsReviewQueue({ includeFilled = false, limit = 300 } = {}) {
  if (!hasSupabase) {
    return { available: false, reason: 'Supabase non configurato.', rows: [], counts: emptyCounts() };
  }

  let facts = [];
  try {
    const url =
      `${baseUrl()}/rest/v1/${encodeURIComponent(FACTS_TABLE)}` +
      `?review_status=eq.pending&select=*&order=extracted_at.desc&limit=${Number(limit) || 300}`;
    facts = (await supabaseFetch(url, { method: 'GET', headers: headers() }, { schemaSensitive: true })) || [];
  } catch (error) {
    if (error?.code === 'MISSING_REVIEW_SCHEMA') {
      return { available: false, reason: error.message, needsMigration: true, rows: [], counts: emptyCounts() };
    }
    throw error;
  }

  const gymIds = [...new Set(facts.map((fact) => clean(fact.gym_id)).filter(Boolean))];
  const gyms = await readGymsByIds(gymIds);
  const gymById = new Map(gyms.map((gym) => [clean(gym.id), gym]));

  const rows = facts
    .map((fact) => {
      const gym = gymById.get(clean(fact.gym_id));
      const field = clean(fact.field);
      const target = FIELD_TARGETS[field];
      const empty = gym ? fieldIsEmpty(gym, field) : false;

      return {
        id: fact.id,
        gymId: clean(fact.gym_id),
        gymName: gymLabel(gym),
        gymCity: clean(gym?.citta || gym?.city),
        gymMissing: !gym,
        field,
        fieldLabel: target?.label || field,
        column: target?.column || '',
        value: factText(fact),
        currentValue: gym ? currentFieldValue(gym, field) : '',
        fillsEmptyField: empty,
        sourceUrl: clean(fact.source_url),
        sourceHost: hostOf(clean(fact.source_url)),
        sourceType: clean(fact.source_type),
        confidence: clean(fact.confidence),
        extractedAt: fact.extracted_at || '',
        blockReason: gym ? promotionBlockReason(gym, fact) : 'gym_non_trovato',
        gymStatus: clean(gym?.source_discovery_status)
      };
    })
    .sort((a, b) => {
      if (a.fillsEmptyField !== b.fillsEmptyField) return a.fillsEmptyField ? -1 : 1;
      return betterFact(
        { source_type: a.sourceType, confidence: a.confidence, extracted_at: a.extractedAt },
        { source_type: b.sourceType, confidence: b.confidence, extracted_at: b.extractedAt }
      );
    });

  const counts = {
    total: rows.length,
    fillsEmpty: rows.filter((row) => row.fillsEmptyField).length,
    alreadyFilled: rows.filter((row) => !row.fillsEmptyField).length,
    byField: countBy(rows.filter((row) => row.fillsEmptyField), 'field'),
    byConfidence: countBy(rows.filter((row) => row.fillsEmptyField), 'confidence')
  };

  return {
    available: true,
    rows: includeFilled ? rows : rows.filter((row) => row.fillsEmptyField),
    counts
  };
}

function emptyCounts() {
  return { total: 0, fillsEmpty: 0, alreadyFilled: 0, byField: {}, byConfidence: {} };
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] || 0) + 1;
  return out;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Approves one fact: writes it into the canonical column, refreshes the
 * readiness score, and records the decision. Returns the before/after pair for
 * the audit log.
 *
 * `allowOverwrite` is the human override the batch script deliberately lacks -
 * a reviewer looking at both values can decide the found one is better.
 */
export async function approveFact({ id, notes = '', allowOverwrite = false }) {
  const fact = await readFactById(id);
  if (!fact) throw new Error('Fatto non trovato.');
  if (clean(fact.review_status) !== 'pending') throw new Error('Questo fatto e gia stato revisionato.');

  const [gym] = await readGymsByIds([clean(fact.gym_id)]);
  if (!gym) throw new Error(`Palestra ${clean(fact.gym_id)} non trovata.`);

  const blockReason = promotionBlockReason(gym, fact, { allowOverwrite });
  if (blockReason) throw new Error(`Promozione bloccata: ${blockReason}.`);

  const now = new Date().toISOString();
  const patch = buildPromotionPatch(fact, { now });
  const projected = { ...gym, ...patch };
  patch.descrizione_readiness_score = computeDescriptionReadinessScore(projected);
  patch.source_discovery_status = 'verified';

  const before = Object.fromEntries(Object.keys(patch).map((column) => [column, gym[column] ?? null]));

  await patchGym(clean(gym.id), patch);
  await patchFact(id, {
    review_status: 'approved',
    reviewed_at: now,
    review_notes: clean(notes) || null,
    applied: true,
    applied_at: now
  });

  return { gymId: clean(gym.id), gymName: gymLabel(gym), field: clean(fact.field), patch, before };
}

/** Rejects one fact. Nothing is written to gyms; the fact stays as provenance. */
export async function rejectFact({ id, notes = '' }) {
  const fact = await readFactById(id);
  if (!fact) throw new Error('Fatto non trovato.');
  if (clean(fact.review_status) !== 'pending') throw new Error('Questo fatto e gia stato revisionato.');

  const now = new Date().toISOString();
  await patchFact(id, { review_status: 'rejected', reviewed_at: now, review_notes: clean(notes) || null });

  return { gymId: clean(fact.gym_id), field: clean(fact.field), value: factText(fact) };
}
