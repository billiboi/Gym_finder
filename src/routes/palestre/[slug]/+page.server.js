import { error, redirect } from '@sveltejs/kit';
import { isPublicActiveGym, readPublicGymListing, readPublicRouteGyms } from '$lib/server/gym-store';
import { cityLabelForGym, isIndexableGym, legacySlugifyGym, primaryDisciplineForGym, slugifyGym } from '$lib/gym-detail';
import { publicListingGym } from '$lib/gym-client';
import { normalizeGym } from '$lib/gym-normalizer';
import { seoLocationForGym } from '$lib/seo-locations';
import { seoDisciplineForGym } from '$lib/seo-disciplines';
import { sanitizePublicGymData } from '$lib/public-data-sanitizer';
import { baseGymSlug, findCanonicalPrefixMatches, findOrphanedLegacySlugMatch, withCanonicalGymSlugs } from '$lib/gym-canonical-slug';
import { LEGACY_SLUG_GONE, LEGACY_SLUG_REDIRECTS } from '$lib/legacy-gym-redirects';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const DETAIL_GYM_COLUMNS = [
  'id',
  'slug',
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
  'email',
  'sito',
  'website',
  'descrizione',
  'description',
  'descrizione_owner',
  'descrizione_editoriale',
  'descrizione_generata',
  'descrizione_pubblica',
  'descrizione_source',
  'descrizione_quality_score',
  'descrizione_needs_review',
  'safe_public_description',
  'discipline',
  'disciplines',
  'discipline_aliases',
  'discipline_canonical_slugs',
  'orari',
  'hours_info',
  'weekly_hours',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'image_url',
  'is_verified',
  'is_premium',
  'priority_score',
  'deleted_at',
  'updated_at',
  'data_quality_flags',
  'needs_review',
  'review_reason',
  'last_data_audit_at',
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

const RELATED_GYM_COLUMNS = [
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

function normalizeRows(rows, fallbackPrefix = 'db') {
  return withCanonicalGymSlugs(
    rows.map((row, index) => normalizeGym(row, row?.id || `${fallbackPrefix}-${index + 1}`))
  );
}

function safeLike(value) {
  return String(value || '')
    .replace(/[%*,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchGymRows(columns, params) {
  if (!hasSupabaseRead) return [];

  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?select=${columns.join(',')}&${params.join('&')}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders()
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

const FULL_CATALOG_CACHE_KEY = '__gymfinder_detail_full_catalog__';
const FULL_CATALOG_CACHE_TTL_MS = 60_000;

// Fetches the same full active catalog the sitemap builds and runs it
// through the same withCanonicalGymSlugs() so a slug found in the sitemap
// always resolves here, and legacy -csv-NNN URLs redirect reliably. Cached
// briefly per warm serverless instance to avoid a full-table read on every
// detail pageview.
async function readFullActiveCatalog() {
  if (!hasSupabaseRead) {
    return withCanonicalGymSlugs(await readPublicRouteGyms());
  }

  const cached = globalThis[FULL_CATALOG_CACHE_KEY];
  if (cached && Date.now() - cached.at < FULL_CATALOG_CACHE_TTL_MS) {
    return cached.gyms;
  }

  const rows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
    'deleted_at=is.null',
    'order=updated_at.desc.nullslast,nome.asc.nullslast,id.asc',
    'limit=5000'
  ]);
  const gyms = normalizeRows(rows, 'detail-catalog');
  globalThis[FULL_CATALOG_CACHE_KEY] = { gyms, at: Date.now() };
  return gyms;
}

const DELETED_CATALOG_CACHE_KEY = '__gymfinder_detail_deleted_catalog__';

// Mirrors readFullActiveCatalog() but for archived rows, used only to decide
// whether an unresolvable legacy URL should 410 (gym existed, now archived)
// instead of a plain 404 (never existed / can't tell). Cached the same way.
async function readDeletedCatalog() {
  if (!hasSupabaseRead) return [];

  const cached = globalThis[DELETED_CATALOG_CACHE_KEY];
  if (cached && Date.now() - cached.at < FULL_CATALOG_CACHE_TTL_MS) {
    return cached.gyms;
  }

  const rows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
    'deleted_at=not.is.null',
    'limit=5000'
  ]);
  const gyms = rows.map((row, index) => normalizeGym(row, row?.id || `detail-deleted-${index + 1}`));
  globalThis[DELETED_CATALOG_CACHE_KEY] = { gyms, at: Date.now() };
  return gyms;
}

function legacyIdFromSlug(slug) {
  const match = String(slug || '').match(/(?:^|-)(csv-[a-z0-9-]+|\d+)$/i);
  return match?.[1] || '';
}

// Decides whether an unresolvable legacy `/palestre/[slug]` URL should serve
// 410 (the gym existed and was later archived, or was reviewed individually
// during the 2026-07-18 audit and confirmed gone) rather than a plain 404.
// Never guesses a redirect target here -- only yes/no on "is this gone".
async function resolveGoneStatus(slug) {
  if (LEGACY_SLUG_GONE.has(slug)) return true;

  const deletedCatalog = await readDeletedCatalog();
  if (!deletedCatalog.length) return false;

  const legacyId = legacyIdFromSlug(slug);
  if (legacyId && deletedCatalog.some((gym) => String(gym.id) === legacyId)) return true;

  // Exact base-name match against the archived catalog. Checked directly
  // (rather than via findOrphanedLegacySlugMatch, which only ever fires for
  // -csv-NNN-suffixed slugs) so this also catches the "clean"/non-csv legacy
  // URLs that resolve to an archived row by name alone.
  const stripped = slug.replace(/-(?:csv-[a-z0-9-]+|\d+)$/i, '');
  // Check both the stripped and the raw slug: a trailing number that looks
  // like a legacy id suffix can legitimately be part of the business name
  // (e.g. "Vela Club 33"), so stripping it can undershoot.
  if (deletedCatalog.some((gym) => baseGymSlug(gym) === stripped || baseGymSlug(gym) === slug)) return true;

  return false;
}

function slugSearchTerms(slug) {
  return [
    ...new Set(
      String(slug || '')
        .replace(/-(?:csv-[a-z0-9-]+|\d+)$/i, '')
        .split('-')
        .map(safeLike)
        .filter((term) => term.length >= 3 || /^\d+$/.test(term))
    )
  ].slice(0, 4);
}

async function findGymCandidate(slug) {
  const catalog = await readFullActiveCatalog();

  const catalogCanonicalMatch = catalog.find((gym) => gym._canonical_slug === slug);
  if (catalogCanonicalMatch) return { gym: catalogCanonicalMatch, matchType: 'canonical' };

  const catalogLegacyMatch = catalog.find((gym) => gym._legacy_slug === slug);
  if (catalogLegacyMatch) return { gym: catalogLegacyMatch, matchType: 'legacy' };

  // Old full-format slugs (name-city-street) whose current canonical slug
  // dropped the street because the city alone was enough to disambiguate.
  // Tried on both the raw slug and the -csv-NNN-stripped slug.
  const strippedForPrefix = slug.replace(/-(?:csv-[a-z0-9-]+|\d+)$/i, '');
  for (const candidate of [slug, strippedForPrefix]) {
    const prefixMatches = findCanonicalPrefixMatches(candidate, catalog);
    if (prefixMatches.length === 1) return { gym: prefixMatches[0], matchType: 'legacy' };
    if (prefixMatches.length > 1) return { gym: null, matchType: 'ambiguous' };
  }

  const orphanedLegacyMatch = findOrphanedLegacySlugMatch(slug, catalog);
  if (orphanedLegacyMatch) return { gym: orphanedLegacyMatch, matchType: 'legacy' };

  // findOrphanedLegacySlugMatch() above returns null both when nothing shares
  // the base name and when 2+ gyms do (it never guesses). Distinguish those
  // here: multiple active gyms sharing the name is a genuine ambiguous case
  // (410, not a plain 404) -- e.g. a multi-location chain's old un-suffixed
  // URL, where the specific original location can no longer be determined.
  if (strippedForPrefix !== slug) {
    const sameBaseNameCount = catalog.filter((gym) => baseGymSlug(gym) === strippedForPrefix).length;
    if (sameBaseNameCount > 1) return { gym: null, matchType: 'ambiguous' };
  }

  if (!hasSupabaseRead) {
    const fallbackGyms = await readPublicRouteGyms();

    const fallbackCanonicalMatch = fallbackGyms.find((gym) => slugifyGym(gym) === slug || gym?.slug === slug);
    if (fallbackCanonicalMatch) return { gym: fallbackCanonicalMatch, matchType: 'canonical' };

    const fallbackLegacyMatch = fallbackGyms.find((gym) => legacySlugifyGym(gym) === slug || gym?._legacy_slug === slug);
    if (fallbackLegacyMatch) return { gym: fallbackLegacyMatch, matchType: 'legacy' };

    const terms = slugSearchTerms(slug);
    for (const term of terms) {
      const result = await readPublicGymListing({ limit: 100, q: term });
      const candidates = Array.isArray(result?.items) ? result.items : [];

      const canonicalMatch = candidates.find((gym) => slugifyGym(gym) === slug || gym?.slug === slug);
      if (canonicalMatch) return { gym: canonicalMatch, matchType: 'canonical' };

      const legacyMatch = candidates.find((gym) => legacySlugifyGym(gym) === slug || gym?._legacy_slug === slug);
      if (legacyMatch) return { gym: legacyMatch, matchType: 'legacy' };
    }

    return null;
  }

const directRows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
  `slug=eq.${encodeURIComponent(slug)}`,
  'deleted_at=is.null',
  'limit=1'
]);
  const directGyms = normalizeRows(directRows, 'detail-direct');
  const directMatch = directGyms.find((gym) => slugifyGym(gym) === slug || gym?.slug === slug);
  if (directMatch) return { gym: directMatch, matchType: 'canonical' };

  const legacyId = legacyIdFromSlug(slug);
  if (legacyId) {
const idRows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
  `id=eq.${encodeURIComponent(legacyId)}`,
  'deleted_at=is.null',
  'limit=1'
]);
    const [idGym] = normalizeRows(idRows, 'detail-id');
    if (idGym && (legacySlugifyGym(idGym) === slug || idGym?._legacy_slug === slug || slugifyGym(idGym) === slug)) {
      return {
        gym: idGym,
        matchType: slugifyGym(idGym) === slug ? 'canonical' : 'legacy'
      };
    }
  }

  const terms = slugSearchTerms(slug);
  if (!terms.length) return null;

  const preciseTerms = terms.slice(0, 3);
  for (const column of ['nome', 'name']) {
  const preciseRows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
  ...preciseTerms.map((term) => `${column}=ilike.${encodeURIComponent(`*${term}*`)}`),
  'deleted_at=is.null',
  'order=priority_score.desc.nullslast,nome.asc.nullslast',
  'limit=10'
]);
    const preciseCandidates = normalizeRows(preciseRows, 'detail-precise');

    const preciseCanonicalMatch = preciseCandidates.find((gym) => slugifyGym(gym) === slug || gym?.slug === slug);
    if (preciseCanonicalMatch) return { gym: preciseCanonicalMatch, matchType: 'canonical' };

    const preciseLegacyMatch = preciseCandidates.find((gym) => legacySlugifyGym(gym) === slug || gym?._legacy_slug === slug);
    if (preciseLegacyMatch) return { gym: preciseLegacyMatch, matchType: 'legacy' };
  }

  const nameClauses = terms.flatMap((term) => {
    const encodedTerm = encodeURIComponent(`*${term}*`);
    return [`nome.ilike.${encodedTerm}`, `name.ilike.${encodedTerm}`];
  });
  const candidateRows = await fetchGymRows(DETAIL_GYM_COLUMNS, [
  `or=(${nameClauses.join(',')})`,
  'deleted_at=is.null',
  'order=priority_score.desc.nullslast,nome.asc.nullslast',
  'limit=50'
]);
  const candidates = normalizeRows(candidateRows, 'detail-search');

  const canonicalMatch = candidates.find((gym) => slugifyGym(gym) === slug || gym?.slug === slug);
  if (canonicalMatch) return { gym: canonicalMatch, matchType: 'canonical' };

  const legacyMatch = candidates.find((gym) => legacySlugifyGym(gym) === slug || gym?._legacy_slug === slug);
  return legacyMatch ? { gym: legacyMatch, matchType: 'legacy' } : null;
}

async function readRelatedGyms(gym, primaryDiscipline, gymCity) {
  if (!hasSupabaseRead || !primaryDiscipline && !gymCity) return [];

  const terms = [];
  const encodedCity = safeLike(gymCity);
  const encodedDiscipline = safeLike(primaryDiscipline);

  if (encodedCity) {
    const cityLike = encodeURIComponent(`*${encodedCity}*`);
    terms.push(`citta.ilike.${cityLike}`, `city.ilike.${cityLike}`);
  }

  if (encodedDiscipline) {
    const disciplineLike = encodeURIComponent(`*${encodedDiscipline}*`);
    terms.push(`discipline.ilike.${disciplineLike}`);
  }

  const rows = await fetchGymRows(RELATED_GYM_COLUMNS, [
    'deleted_at=is.null',
    terms.length ? `or=(${terms.join(',')})` : '',
    'order=priority_score.desc.nullslast,nome.asc.nullslast',
    'limit=24'
  ].filter(Boolean));
  const candidates = normalizeRows(rows, 'related').filter((item) => isPublicActiveGym(item) && item.id !== gym.id);

  return candidates
    .filter((item) => isPublicActiveGym(item) && isIndexableGym(item))
    .map((item) => {
      const sameDiscipline = primaryDisciplineForGym(item) === primaryDiscipline;
      const sameCity = String(cityLabelForGym(item) || '').trim().toLowerCase() === gymCity;
      const score = (sameDiscipline ? 2 : 0) + (sameCity ? 3 : 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);
}

function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function publicDetailGym(gym) {
  return sanitizePublicGymData(gym) || {};
}

function isPublicReviewGym(gym) {
  return Boolean(
    gym?.needs_review ||
      gym?.descrizione_needs_review ||
      gym?.description_needs_review ||
      gym?.data_quality_flags?.length ||
      gym?.weekly_hours?._needs_review ||
      gym?.weekly_hours?._public_data_quarantine
  );
}

export const config = {
  isr: {
    expiration: 3600
  }
};

export async function load({ params }) {
  const found = await findGymCandidate(params.slug);

  if (found?.matchType === 'ambiguous') {
    throw error(410, 'Scheda rimossa');
  }

  let gym = found?.matchType === 'canonical' ? found.gym : null;
  const legacyTargetSlug = LEGACY_SLUG_REDIRECTS[params.slug];

  if (!gym && legacyTargetSlug) {
    const legacyTargetResult = await findGymCandidate(legacyTargetSlug);
    const legacyTarget = legacyTargetResult?.gym;
    if (legacyTarget) {
      if (!isPublicActiveGym(legacyTarget)) {
        throw error(410, 'Scheda rimossa');
      }
      throw redirect(301, `/palestre/${slugifyGym(legacyTarget)}`);
    }
  }

  const legacyGym = gym ? null : found?.matchType === 'legacy' ? found.gym : null;

  if (legacyGym) {
    if (!isPublicActiveGym(legacyGym)) {
      throw error(410, 'Scheda rimossa');
    }
    throw redirect(301, `/palestre/${slugifyGym(legacyGym)}`);
  }

  if (gym && !isPublicActiveGym(gym)) {
    throw error(410, 'Scheda rimossa');
  }

  if (gym && slugifyGym(gym) !== params.slug) {
    throw redirect(301, `/palestre/${slugifyGym(gym)}`);
  }

  if (!gym || !isIndexableGym(gym)) {
    if (await resolveGoneStatus(params.slug)) {
      throw error(410, 'Scheda rimossa');
    }
    throw error(404, 'Palestra non trovata');
  }

  const publicGym = publicDetailGym(gym);
  const primaryDiscipline = primaryDisciplineForGym(publicGym);
  const gymCity = String(cityLabelForGym(gym) || '').trim().toLowerCase();
  const relatedGyms = isPublicReviewGym(publicGym) ? [] : await readRelatedGyms(gym, primaryDiscipline, gymCity);

  const dynamicLocation = gymCity
    ? {
        slug: slugifyName(cityLabelForGym(gym)),
        name: cityLabelForGym(gym)
      }
    : null;
  const dynamicDiscipline = primaryDiscipline
    ? {
        slug: slugifyName(primaryDiscipline),
        name: primaryDiscipline
      }
    : null;

  return {
    gym: publicGym,
    gymSlug: slugifyGym(gym),
    relatedGyms: relatedGyms.map(publicListingGym),
    relatedLocation: dynamicLocation || seoLocationForGym(gym),
    relatedDiscipline: seoDisciplineForGym(gym) || dynamicDiscipline
  };
}
