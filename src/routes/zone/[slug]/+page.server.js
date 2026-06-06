import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { publicListingGym } from '$lib/gym-client';
import { normalizeGym } from '$lib/gym-normalizer';
import { publicCityForGym } from '$lib/location-quality';
import { normalizeSeoLocationName, slugifySeoName } from '$lib/seo-directory';
import { getSeoLocation, gymsForSeoLocation, topDisciplinesForGyms } from '$lib/seo-locations';

const INITIAL_ZONE_GYMS = 36;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const ZONE_GYM_COLUMNS = [
  'id',
  'slug',
  'nome',
  'name',
  'indirizzo',
  'address',
  'citta',
  'city',
  'telefono',
  'phone',
  'sito',
  'website',
  'discipline',
  'disciplines',
  'orari',
  'hours_info',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'image_url',
  'is_verified',
  'verified',
  'is_premium',
  'priority_score',
  'deleted_at',
  'updated_at'
];

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_READ_KEY,
    Authorization: `Bearer ${SUPABASE_READ_KEY}`
  };
}

function slugPart(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function baseGymSlug(gym) {
  return slugPart(gym?.name || gym?.nome) || 'palestra';
}

function withCanonicalGymSlugs(gyms) {
  const groups = new Map();
  const normalized = gyms.map((gym) => ({ ...gym }));

  for (const gym of normalized) {
    const base = baseGymSlug(gym);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(gym);
  }

  const used = new Set();
  for (const [base, group] of groups) {
    group.forEach((gym, index) => {
      let slug = base;
      if (group.length > 1) {
        const city = slugPart(gym?.city || gym?.citta);
        const street = slugPart(String(gym?.address || gym?.indirizzo || '').split(',')[0]);
        slug = [base, city && !base.includes(city) ? city : '', street]
          .filter(Boolean)
          .join('-')
          .replace(/-{2,}/g, '-');
      }

      if (used.has(slug)) slug = `${slug}-${index + 1}`;
      used.add(slug);
      gym._canonical_slug = slug;
      gym._legacy_slug = gym?.id ? `${base}-${String(gym.id).trim()}` : base;
    });
  }

  return normalized;
}

function safeLike(value) {
  return String(value || '')
    .replace(/[%*,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationTerms(location) {
  return [...new Set([location?.name, ...(location?.keywords || [])].map(safeLike).filter(Boolean))].slice(0, 8);
}

async function fetchZoneRows(params, limit = INITIAL_ZONE_GYMS + 1) {
  if (!hasSupabaseRead) return [];

  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?select=${encodeURIComponent(
    ZONE_GYM_COLUMNS.join(',')
  )}&${params.join('&')}&order=priority_score.desc.nullslast,nome.asc.nullslast&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    throw new Error(`Supabase zone read failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function normalizeRows(rows) {
  return withCanonicalGymSlugs(rows.map((row, index) => normalizeGym(row, row?.id || `zone-${index + 1}`)));
}

function locationOrFilter(terms) {
  const clauses = [];

  for (const term of terms) {
    const encoded = encodeURIComponent(`*${term}*`);
    clauses.push(
      `citta.ilike.${encoded}`,
      `city.ilike.${encoded}`,
      `indirizzo.ilike.${encoded}`,
      `address.ilike.${encoded}`,
      `nome.ilike.${encoded}`,
      `name.ilike.${encoded}`
    );
  }

  return clauses.length ? `or=(${clauses.join(',')})` : '';
}

async function readZoneGyms(location) {
  const terms = locationTerms(location);
  const rows = await fetchZoneRows(['deleted_at=is.null', locationOrFilter(terms)].filter(Boolean));
  const gyms = normalizeRows(rows).filter((gym) => isIndexableGym(gym));
  const matchedGyms = gymsForSeoLocation(gyms, location).filter((gym) => isIndexableGym(gym));

  return {
    gyms: matchedGyms.slice(0, INITIAL_ZONE_GYMS),
    hasMore: matchedGyms.length > INITIAL_ZONE_GYMS || rows.length > INITIAL_ZONE_GYMS
  };
}

async function readDynamicCityGyms(slug) {
  const guess = safeLike(slug.replace(/-/g, ' '));
  const encoded = encodeURIComponent(`*${guess}*`);
  const rows = await fetchZoneRows(
    ['deleted_at=is.null', `or=(citta.ilike.${encoded},city.ilike.${encoded})`],
    INITIAL_ZONE_GYMS + 1
  );
  const gyms = normalizeRows(rows).filter((gym) => isIndexableGym(gym));
  const matchedName = normalizeSeoLocationName(
    publicCityForGym(gyms.find((gym) => slugifySeoName(publicCityForGym(gym)) === slug))
  );

  return {
    matchedName,
    gyms: gyms.filter((gym) => slugifySeoName(publicCityForGym(gym)) === slug).slice(0, INITIAL_ZONE_GYMS),
    hasMore: rows.length > INITIAL_ZONE_GYMS
  };
}

export async function load({ params }) {
  let location = getSeoLocation(params.slug);
  let dynamicLocation = false;
  let matchedGyms = [];
  let hasMoreGyms = false;

  if (!location) {
    dynamicLocation = true;
    const dynamicResult = await readDynamicCityGyms(params.slug);
    const matchedName = dynamicResult.matchedName;

    if (!matchedName) {
      throw error(404, 'Zona non trovata');
    }

    location = {
      slug: params.slug,
      name: matchedName,
      title: `Palestre a ${matchedName}`,
      description: `Esplora le schede pubbliche collegate a ${matchedName} e controlla quali strutture del catalogo ricadono davvero in quest'area.`,
      keywords: [matchedName]
    };
    matchedGyms = dynamicResult.gyms;
    hasMoreGyms = dynamicResult.hasMore;
  }

  if (!dynamicLocation) {
    const zoneResult = await readZoneGyms(location);
    matchedGyms = zoneResult.gyms;
    hasMoreGyms = zoneResult.hasMore;
  }

  return {
    location,
    gyms: matchedGyms.map(publicListingGym),
    totalGyms: matchedGyms.length,
    hasMoreGyms,
    topDisciplines: topDisciplinesForGyms(matchedGyms)
  };
}
