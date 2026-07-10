// CRUD primitives for public.gym_candidates (acquisition pipeline review queue).
// This module never writes to public.gyms — that only happens from the
// admin/candidati approve action via gym-store.js's writeGymRecords, after
// explicit admin confirmation. See docs/ACQUISITION_PIPELINE.md.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_CANDIDATES_TABLE = process.env.SUPABASE_GYM_CANDIDATES_TABLE || 'gym_candidates';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

// The admin/candidati queue renders full cards straight from the list
// query (there's no separate single-candidate detail view), so the list
// needs every field a reviewer needs to see — not a trimmed-down set.
const DETAIL_COLUMNS = [
  'id',
  'nome',
  'citta',
  'provincia',
  'discipline',
  'disciplines',
  'source',
  'source_url',
  'scraped_at',
  'validation_flags',
  'dedup_score',
  'status',
  'reviewed_at',
  'reviewed_by',
  'published_gym_id',
  'created_at',
  'indirizzo',
  'regione',
  'telefono',
  'email',
  'sito',
  'orari',
  'latitude',
  'longitude',
  'descrizione',
  'source_id',
  'dedup_match_gym_id',
  'dedup_match_candidate_id',
  'rejection_reason',
  'updated_at'
];

const LIST_COLUMNS = DETAIL_COLUMNS;

function clean(value) {
  return String(value ?? '').trim();
}

function boundedNumber(value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra
  };
}

async function responseDetails(response) {
  try {
    const payload = await response.json();
    return [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
  } catch {
    return await response.text().catch(() => '');
  }
}

function supabaseErrorMessage(response, details, action) {
  if (response.status === 404) {
    return `${action}: tabella "${SUPABASE_CANDIDATES_TABLE}" non trovata su questo ambiente Supabase. Verifica di essere su staging e che la migration 20260710_001_gym_candidates.sql sia applicata. ${details}`.trim();
  }
  if (response.status === 401 || response.status === 403) {
    return `${action}: richiesta non autorizzata su Supabase. Verifica SUPABASE_SERVICE_ROLE_KEY e RLS. ${details}`.trim();
  }
  return `${action} (${response.status}). ${details}`.trim();
}

function normalizeStatus(value) {
  const status = clean(value).toLowerCase();
  return ['pending', 'approved', 'rejected', 'merged'].includes(status) ? status : 'pending';
}

function normalizeCandidate(row) {
  return {
    id: clean(row?.id),
    nome: clean(row?.nome),
    indirizzo: clean(row?.indirizzo),
    citta: clean(row?.citta),
    provincia: clean(row?.provincia),
    regione: clean(row?.regione),
    telefono: clean(row?.telefono),
    email: clean(row?.email),
    sito: clean(row?.sito),
    discipline: clean(row?.discipline),
    disciplines: Array.isArray(row?.disciplines) ? row.disciplines : [],
    orari: clean(row?.orari),
    latitude: row?.latitude ?? null,
    longitude: row?.longitude ?? null,
    descrizione: clean(row?.descrizione),
    source: clean(row?.source),
    source_id: clean(row?.source_id),
    source_url: clean(row?.source_url),
    scraped_at: clean(row?.scraped_at),
    validation_flags: Array.isArray(row?.validation_flags) ? row.validation_flags : [],
    dedup_score: row?.dedup_score ?? null,
    dedup_match_gym_id: clean(row?.dedup_match_gym_id),
    dedup_match_candidate_id: clean(row?.dedup_match_candidate_id),
    status: normalizeStatus(row?.status),
    reviewed_at: clean(row?.reviewed_at),
    reviewed_by: clean(row?.reviewed_by),
    rejection_reason: clean(row?.rejection_reason),
    published_gym_id: clean(row?.published_gym_id),
    created_at: clean(row?.created_at),
    updated_at: clean(row?.updated_at)
  };
}

export function canWriteGymCandidates() {
  return hasSupabase;
}

export function gymCandidatesStoreStatus() {
  return {
    hasSupabase,
    table: SUPABASE_CANDIDATES_TABLE
  };
}

export async function readAdminGymCandidatesList({ limit = 200, offset = 0, status = '' } = {}) {
  if (!hasSupabase) {
    return { items: [], limit: boundedNumber(limit, 200, { min: 1, max: 500 }), offset: 0, hasMore: false, error: 'Coda candidati non disponibile: variabili Supabase server-side mancanti.' };
  }

  const safeLimit = boundedNumber(limit, 200, { min: 1, max: 500 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const normalizedStatus = clean(status) ? normalizeStatus(status) : '';

  const params = new URLSearchParams({
    select: LIST_COLUMNS.join(','),
    order: 'created_at.desc',
    limit: String(safeLimit),
    offset: String(safeOffset)
  });
  if (normalizedStatus) params.set('status', `eq.${normalizedStatus}`);

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CANDIDATES_TABLE}?${params}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    return { items: [], limit: safeLimit, offset: safeOffset, hasMore: false, error: supabaseErrorMessage(response, details, 'Lettura coda candidati non riuscita') };
  }

  const rows = await response.json();
  const items = Array.isArray(rows) ? rows.map(normalizeCandidate) : [];
  return { items, limit: safeLimit, offset: safeOffset, hasMore: items.length === safeLimit, error: '' };
}

export async function readAdminGymCandidateById(id) {
  const cleanId = clean(id);
  if (!cleanId || !hasSupabase) return null;

  const params = new URLSearchParams({
    select: DETAIL_COLUMNS.join(','),
    id: `eq.${cleanId}`,
    limit: '1'
  });

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CANDIDATES_TABLE}?${params}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Lettura candidato non riuscita'));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeCandidate(rows[0]) : null;
}

export async function updateGymCandidateStatus(id, patch) {
  const cleanId = clean(id);
  if (!cleanId) throw new Error('ID candidato mancante.');
  if (!hasSupabase) throw new Error('Scrittura coda candidati non configurata: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CANDIDATES_TABLE}?id=eq.${encodeURIComponent(cleanId)}`, {
    method: 'PATCH',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Aggiornamento candidato non riuscito'));
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error('Candidato non trovato.');
  return normalizeCandidate(rows[0]);
}
