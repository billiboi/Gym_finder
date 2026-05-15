import { repairMojibake } from '$lib/text-repair';
import { normalizeDisciplineField } from '$lib/disciplines';
import { canonicalizeDiscipline } from '$lib/discipline-taxonomy';

export const GYM_CANONICAL_FIELDS = [
  'id',
  'slug',
  'nome',
  'indirizzo',
  'citta',
  'provincia',
  'regione',
  'telefono',
  'email',
  'sito',
  'descrizione',
  'discipline',
  'discipline_aliases',
  'discipline_canonical_slugs',
  'orari',
  'lat',
  'lng',
  'is_premium',
  'is_verified',
  'priority_score',
  'deleted_at',
  'created_at',
  'updated_at',
  'data_quality_score'
];

export const GYM_LEGACY_FIELDS = [
  'name',
  'address',
  'city',
  'phone',
  'website',
  'description',
  'discipline',
  'disciplines',
  'discipline_aliases',
  'discipline_canonical_slugs',
  'hours_info',
  'latitude',
  'longitude',
  'verified',
  'weekly_hours',
  'image_url',
  'official_source_url',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'price_info',
  'price_source_url',
  'price_updated_at',
  'enrichment_status',
  'enrichment_notes',
  'enrichment_updated_at',
  'social_links',
  'data_verified_at'
];

export const GYM_SUPABASE_COLUMN_CANDIDATES = [
  ...GYM_CANONICAL_FIELDS,
  ...GYM_LEGACY_FIELDS
];

function clean(value) {
  return repairMojibake(value).trim();
}

function firstValue(record, keys, fallback = '') {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== null && value !== undefined && clean(value) !== '') return value;
  }
  return fallback;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const raw = clean(value).toLowerCase();
  return ['1', 'true', 'si', 'sì', 'yes', 'y'].includes(raw);
}

function toDisciplines(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).disciplines;
}

function sourceWeeklyHours(gym) {
  return gym?.weekly_hours && typeof gym.weekly_hours === 'object' && !Array.isArray(gym.weekly_hours)
    ? gym.weekly_hours
    : {};
}

function sourcePremium(gym) {
  const weeklyHours = sourceWeeklyHours(gym);
  return toBoolean(firstValue(gym, ['is_premium'], weeklyHours._is_premium || false));
}

function sourceVerified(gym) {
  const weeklyHours = sourceWeeklyHours(gym);
  return toBoolean(firstValue(gym, ['is_verified', 'verified'], weeklyHours._verified || false));
}

function sourcePriorityScore(gym) {
  const weeklyHours = sourceWeeklyHours(gym);
  const value = Number(firstValue(gym, ['priority_score'], weeklyHours._priority_score || 0));
  return Number.isFinite(value) ? value : 0;
}

function qualityFlag(value) {
  return clean(value) ? 20 : 0;
}

export function computeGymQualityScore(gym) {
  const disciplines = toDisciplines(firstValue(gym, ['discipline', 'disciplineText']), []);
  const hasDisciplines = Array.isArray(gym?.disciplines) && gym.disciplines.length > 0;
  const hasGenericDiscipline =
    !hasDisciplines && (!disciplines.length || ['fitness', 'sport', 'palestra'].includes(clean(disciplines[0]).toLowerCase()));

  let score = 0;
  score += qualityFlag(firstValue(gym, ['telefono', 'phone']));
  score += qualityFlag(firstValue(gym, ['sito', 'website']));
  score += /orari da verificare|da verificare/i.test(clean(firstValue(gym, ['orari', 'hours_info']))) ? 0 : 20;
  score += clean(firstValue(gym, ['descrizione', 'description'])).length >= 80 ? 20 : 0;
  score += hasGenericDiscipline ? 0 : 20;
  return Math.max(0, Math.min(100, score));
}

export function normalizeGym(gym, fallbackId = '') {
  const weeklyHours = sourceWeeklyHours(gym);
  const disciplineList = toDisciplines(gym?.disciplines, toDisciplines(gym?.discipline, ['Fitness']));
  const disciplineAliases = normalizeDisciplineField(
    Array.isArray(gym?.disciplines) && gym.disciplines.length ? gym.disciplines : gym?.discipline,
    disciplineList
  ).aliases;
  const disciplineCanonicalSlugs = disciplineList
    .map((discipline) => canonicalizeDiscipline(discipline)?.slug)
    .filter(Boolean);
  const primaryDiscipline = disciplineList[0] || 'Fitness';
  const isVerified = sourceVerified(gym);
  const isPremium = sourcePremium(gym);
  const priorityScore = sourcePriorityScore(gym);
  const lat = toNumberOrNull(firstValue(gym, ['lat', 'latitude']));
  const lng = toNumberOrNull(firstValue(gym, ['lng', 'longitude']));
  const deletedAt = firstValue(gym, ['deleted_at'], weeklyHours._deleted_at || null) || null;

  const canonical = {
    id: String(firstValue(gym, ['id'], fallbackId)),
    slug: clean(firstValue(gym, ['slug'])),
    nome: clean(firstValue(gym, ['nome', 'name'])),
    indirizzo: clean(firstValue(gym, ['indirizzo', 'address'])),
    citta: clean(firstValue(gym, ['citta', 'city'])),
    provincia: clean(firstValue(gym, ['provincia'])),
    regione: clean(firstValue(gym, ['regione'])),
    telefono: clean(firstValue(gym, ['telefono', 'phone'])),
    email: clean(firstValue(gym, ['email'])),
    sito: clean(firstValue(gym, ['sito', 'website'])),
    descrizione: clean(firstValue(gym, ['descrizione', 'description', 'presentazione'])),
    discipline: disciplineList,
    discipline_aliases: Array.isArray(gym?.discipline_aliases) && gym.discipline_aliases.length
      ? gym.discipline_aliases
      : disciplineAliases,
    discipline_canonical_slugs: Array.isArray(gym?.discipline_canonical_slugs) && gym.discipline_canonical_slugs.length
      ? gym.discipline_canonical_slugs
      : disciplineCanonicalSlugs,
    orari: clean(firstValue(gym, ['orari', 'hours_info'])) || 'Orari da verificare',
    lat,
    lng,
    is_premium: isPremium,
    is_verified: isVerified,
    priority_score: priorityScore,
    deleted_at: deletedAt,
    created_at: firstValue(gym, ['created_at'], null) || null,
    updated_at: firstValue(gym, ['updated_at'], null) || null
  };

  const normalized = {
    ...gym,
    ...canonical,
    name: canonical.nome,
    discipline: primaryDiscipline,
    address: canonical.indirizzo,
    city: canonical.citta,
    phone: canonical.telefono,
    hours_info: canonical.orari,
    website: canonical.sito,
    description: canonical.descrizione,
    verified: canonical.is_verified,
    latitude: canonical.lat,
    longitude: canonical.lng,
    image_url: clean(firstValue(gym, ['image_url'], weeklyHours._image_url || '')),
    official_source_url: clean(firstValue(gym, ['official_source_url'])),
    editorial_summary: clean(firstValue(gym, ['editorial_summary'])),
    editorial_highlights: Array.isArray(gym?.editorial_highlights) ? gym.editorial_highlights : [],
    editorial_faq_items: Array.isArray(gym?.editorial_faq_items) ? gym.editorial_faq_items : [],
    price_info: clean(firstValue(gym, ['price_info'])),
    price_source_url: clean(firstValue(gym, ['price_source_url'])),
    price_updated_at: firstValue(gym, ['price_updated_at'], null) || null,
    enrichment_status: clean(firstValue(gym, ['enrichment_status'], 'pending')) || 'pending',
    enrichment_notes: clean(firstValue(gym, ['enrichment_notes'])),
    enrichment_updated_at: firstValue(gym, ['enrichment_updated_at'], null) || null,
    social_links: gym?.social_links && typeof gym.social_links === 'object' ? gym.social_links : null,
    data_verified_at: firstValue(gym, ['data_verified_at'], null) || null,
    weekly_hours: {
      ...weeklyHours,
      _verified: isVerified,
      _is_premium: isPremium,
      _priority_score: priorityScore,
      _image_url: clean(firstValue(gym, ['image_url'], weeklyHours._image_url || '')),
      _discipline_aliases: canonical.discipline_aliases,
      ...(deletedAt ? { _deleted_at: deletedAt } : {})
    }
  };

  return {
    ...normalized,
    data_quality_score: computeGymQualityScore(normalized)
  };
}

export function gymToSupabaseRecord(gym, availableColumns = GYM_LEGACY_FIELDS) {
  const normalized = normalizeGym(gym, gym?.id || '');
  const allowed = new Set(availableColumns);
  const omitAlways = new Set(['created_at', 'updated_at']);
  const record = {};

  for (const column of GYM_SUPABASE_COLUMN_CANDIDATES) {
    if (omitAlways.has(column)) continue;
    if (allowed.has(column) && normalized[column] !== undefined) {
      record[column] = normalized[column];
    }
  }

  if (allowed.has('weekly_hours')) {
    record.weekly_hours = normalized.weekly_hours;
  }

  return record;
}
