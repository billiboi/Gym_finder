import { isIndexableGym, slugifyGym } from '$lib/gym-detail';
import { normalizeGym } from '$lib/gym-normalizer';
import { isPublicActiveGym, readPublicRouteGyms } from '$lib/server/gym-store';
import { withCanonicalGymSlugs } from '$lib/gym-canonical-slug';
import { buildSeoLocationEntries, normalizeSeoLocationName, slugifySeoName } from '$lib/seo-directory';
import { publicCityForGym } from '$lib/location-quality';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const CATALOG_INDEX_COLUMNS = [
  'id',
  'nome',
  'name',
  'indirizzo',
  'address',
  'citta',
  'city',
  'provincia',
  'telefono',
  'phone',
  'sito',
  'website',
  'orari',
  'hours_info',
  'discipline',
  'disciplines',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'deleted_at',
  'weekly_hours'
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

// Same read-with-local-fallback shape as the zone index and the sitemap, so
// this hub keeps listing the catalog when Supabase is unreachable instead of
// going blank. Must run over the full active catalog (not a page of it) so
// withCanonicalGymSlugs() produces the same slugs the detail route resolves.
async function readCatalogGyms() {
  if (hasSupabaseRead) {
    try {
      const params = [
        `select=${CATALOG_INDEX_COLUMNS.join(',')}`,
        'deleted_at=is.null',
        'limit=5000'
      ];
      const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
        method: 'GET',
        headers: supabaseHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data)
          ? data.map((row, index) => normalizeGym(row, row?.id || `catalog-index-${index + 1}`)).filter(isPublicActiveGym)
          : [];
        if (rows.length) return rows;
      }
    } catch {
      // fallback below
    }
  }

  return readPublicRouteGyms();
}

export const config = {
  isr: {
    expiration: 3600
  }
};

export async function load() {
  const gyms = withCanonicalGymSlugs(await readCatalogGyms()).filter(
    (gym) => isPublicActiveGym(gym) && isIndexableGym(gym)
  );

  // Zone pages exist only for the locations the zone index publishes -- it
  // drops, among others, city values that are really postal codes ("21052").
  // Link a zone page only when it is in that set, or the hub would point at
  // 404s, which is the exact problem this page exists to fix.
  const zoneSlugs = new Set(
    buildSeoLocationEntries(gyms, { includeLowCount: false }).map((location) => location.slug)
  );

  const byCity = new Map();

  for (const gym of gyms) {
    // Same city normalization the zone index uses, so a city grouped here and
    // the zone page it links to are always the same place.
    const cityName = normalizeSeoLocationName(publicCityForGym(gym));
    if (!cityName) continue;

    const slug = slugifySeoName(cityName);
    if (!byCity.has(slug)) {
      byCity.set(slug, { name: cityName, slug, zoneSlug: zoneSlugs.has(slug) ? slug : '', gyms: [] });
    }
    byCity.get(slug).gyms.push({
      name: String(gym.name || gym.nome || '').trim(),
      slug: slugifyGym(gym)
    });
  }

  const cities = [...byCity.values()]
    .map((city) => ({
      ...city,
      gyms: city.gyms.sort((a, b) => a.name.localeCompare(b.name, 'it'))
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  return {
    cities,
    totalGyms: cities.reduce((sum, city) => sum + city.gyms.length, 0),
    totalCities: cities.length
  };
}
