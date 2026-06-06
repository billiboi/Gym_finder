import { buildSeoLocationEntries } from '$lib/seo-directory';
import { normalizeGym } from '$lib/gym-normalizer';
import { readPublicGymListing } from '$lib/server/gym-store';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const ZONE_INDEX_COLUMNS = [
  'nome',
  'name',
  'indirizzo',
  'address',
  'citta',
  'city',
  'provincia',
  'regione',
  'telefono',
  'phone',
  'sito',
  'website',
  'orari',
  'hours_info',
  'discipline',
  'disciplines',
  'deleted_at'
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

async function readZoneIndexGyms() {
  if (hasSupabaseRead) {
    const params = [
      `select=${encodeURIComponent(ZONE_INDEX_COLUMNS.join(','))}`,
      'deleted_at=is.null',
      'limit=5000'
    ];
    const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
      method: 'GET',
      headers: supabaseHeaders()
    });

    if (!response.ok) {
      throw new Error(`Supabase zone index read failed (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map((row, index) => normalizeGym(row, `zone-index-${index + 1}`)) : [];
  }

  const fallback = await readPublicGymListing({ limit: 100 });
  return Array.isArray(fallback?.items) ? fallback.items : [];
}

export async function load() {
  const gyms = await readZoneIndexGyms();
  const locations = buildSeoLocationEntries(gyms);
  const featuredLocations = locations.filter((location) => location.featured);
  const extraLocations = locations.filter((location) => !location.featured);

  return {
    featuredLocations,
    extraLocations,
    totalLocations: featuredLocations.length + extraLocations.length
  };
}
