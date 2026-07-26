// Shared rules for promoting a gym_facts record into a canonical public.gyms
// column. Pure logic, no I/O, so both scripts/promote-gym-facts.ts (batch,
// high-confidence only) and the admin review queue (one fact at a time, any
// confidence, with a human deciding) apply exactly the same constraints.

import { clean, firstValue, hasUsableHours } from './gym-normalizer.js';

// Maps a gym_facts.field onto the canonical column written, plus every column
// the app would read for that field. Precedence follows firstValue() in
// gym-normalizer.js and description-readiness.js, where the Italian name wins.
// Column names verified against the live production schema - several field
// names used elsewhere in JS are not real Supabase columns.
export const FIELD_TARGETS = {
  telefono: { column: 'telefono', readColumns: ['telefono', 'phone'], label: 'Telefono' },
  sito: { column: 'sito', readColumns: ['sito', 'website'], label: 'Sito web' },
  orari: { column: 'orari', readColumns: ['orari', 'hours_info'], label: 'Orari' },
  prezzo: { column: 'price_info', readColumns: ['price_info'], label: 'Prezzo' }
};

export const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
export const SOURCE_RANK = { official_site: 4, google_business: 3, social: 2, article: 1 };

export const SOURCE_LABELS = {
  official_site: 'Sito ufficiale',
  google_business: 'Scheda Google',
  social: 'Social ufficiale',
  article: 'Directory/aggregatore'
};

export function factText(fact) {
  const value = fact?.value;
  if (value && typeof value === 'object' && !Array.isArray(value)) return clean(value.text);
  return clean(value);
}

export function currentFieldValue(gym, field) {
  const target = FIELD_TARGETS[field];
  if (!target) return '';
  return clean(firstValue(gym, target.readColumns));
}

// A field counts as filled if ANY column the app reads for it holds a value.
// Otherwise a promotion could write `telefono` while the app is already
// displaying `phone`, leaving two competing values in the record.
export function fieldIsEmpty(gym, field) {
  return !currentFieldValue(gym, field);
}

export function factSortKey(fact) {
  return [
    -(SOURCE_RANK[clean(fact?.source_type)] || 0),
    -(CONFIDENCE_RANK[clean(fact?.confidence)] || 0),
    String(fact?.extracted_at || '')
  ];
}

// Stronger source first, then higher confidence, then more recent.
export function betterFact(a, b) {
  const sourceDelta = (SOURCE_RANK[clean(b?.source_type)] || 0) - (SOURCE_RANK[clean(a?.source_type)] || 0);
  if (sourceDelta !== 0) return sourceDelta;
  const confidenceDelta = (CONFIDENCE_RANK[clean(b?.confidence)] || 0) - (CONFIDENCE_RANK[clean(a?.confidence)] || 0);
  if (confidenceDelta !== 0) return confidenceDelta;
  return String(b?.extracted_at || '').localeCompare(String(a?.extracted_at || ''));
}

// The single gate both callers share. `allowOverwrite` exists only for the
// admin queue, where a human can knowingly replace a value; the batch script
// never passes it.
export function promotionBlockReason(gym, fact, { allowOverwrite = false } = {}) {
  const field = clean(fact?.field);
  const target = FIELD_TARGETS[field];
  if (!gym) return 'gym_non_trovato';
  if (!target) return 'campo_non_mappato';

  const text = factText(fact);
  if (!text) return 'valore_vuoto';
  if (!allowOverwrite && !fieldIsEmpty(gym, field)) return 'campo_gia_valorizzato';
  if (field === 'orari' && !hasUsableHours(text)) return 'orari_non_utilizzabili';

  return '';
}

// Builds the gyms patch for one fact. Price carries its provenance columns
// along, because the existing price pipeline treats those three as one unit.
export function buildPromotionPatch(fact, { now = new Date().toISOString() } = {}) {
  const field = clean(fact?.field);
  const target = FIELD_TARGETS[field];
  if (!target) return {};

  const patch = { [target.column]: factText(fact) };
  if (field === 'prezzo') {
    patch.price_source_url = clean(fact?.source_url);
    patch.price_updated_at = now;
  }
  return patch;
}
