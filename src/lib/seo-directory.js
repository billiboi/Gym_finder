import { dedupeDisciplines } from '$lib/disciplines';
import {
  canonicalizeDiscipline,
  DISCIPLINE_MASTER,
  getDisciplineBySlug,
  isPublicDisciplineSlug
} from '$lib/discipline-taxonomy';
import { isIndexableGym } from '$lib/gym-detail';
import { isSuspiciousZoneName, publicCityForGym } from '$lib/location-quality';
import { SEO_DISCIPLINES, gymsForSeoDiscipline, getSeoDiscipline } from '$lib/seo-disciplines';
import { SEO_LOCATIONS, gymsForSeoLocation, getSeoLocation } from '$lib/seo-locations';

export const SEO_LANDING_MIN_INDEXABLE_COUNT = 2;

// Discipline+city combos confirmed, during the 2026-07-18 sitemap audit, to
// have real matching gyms in the full in-memory catalog (so they pass the
// verification below) but still 404 live on
// /discipline/[slug]/[citySlug]/+page.server.js -- that route's SQL ILIKE
// prefilter (readDisciplineGymPool -> disciplineOrFilter) drops candidates
// the in-memory taxonomy matching here would keep. Root cause is in that
// route's query construction, out of scope for a sitemap-hygiene fix;
// excluded here so the sitemap never advertises a URL the live route can't
// currently serve. Revisit if disciplineOrFilter's ILIKE terms are widened.
const SITEMAP_LIVE_ROUTE_MISMATCH_COMBOS = new Set([
  'functional-training::lugano',
  'functional-training::saronno',
  'personal-training::lavertezzo'
]);

export function slugifySeoName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isBrowsableLocationName(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  if (isSuspiciousZoneName(value)) return false;
  if (/[\\/|]/.test(value)) return false;
  if (value.length > 40) return false;
  return true;
}

const LOWERCASE_LOCATION_WORDS = new Set(['al', 'alla', 'alle', 'con', 'di', 'del', 'della', 'dei', 'e']);

function capitalizeLocationSegment(segment) {
  const lower = segment.toLocaleLowerCase('it');
  if (!lower) return '';
  return lower.charAt(0).toLocaleUpperCase('it') + lower.slice(1);
}

function normalizeLocationPart(part, index) {
  const lower = part.toLocaleLowerCase('it');
  if (index > 0 && LOWERCASE_LOCATION_WORDS.has(lower)) return lower;

  return lower
    .split('-')
    .map((hyphenPart) =>
      hyphenPart
        .split("'")
        .map(capitalizeLocationSegment)
        .join("'")
    )
    .join('-');
}

export function normalizeSeoLocationName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(normalizeLocationPart)
    .join(' ');
}

export function disciplinesForGym(gym) {
  const values =
    Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : String(gym?.discipline || '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean);

  return dedupeDisciplines(values);
}

function filterByCount(entries, includeLowCount) {
  return entries.filter((entry) => includeLowCount || entry.count >= SEO_LANDING_MIN_INDEXABLE_COUNT);
}

export function buildSeoLocationEntries(gyms, { includeLowCount = true } = {}) {
  const indexableGyms = gyms.filter((gym) => isIndexableGym(gym));
  const cityCounts = new Map();

  for (const gym of indexableGyms) {
    const city = normalizeSeoLocationName(publicCityForGym(gym));
    if (!city || !isBrowsableLocationName(city)) continue;
    const slug = slugifySeoName(city);
    const current = cityCounts.get(slug) || { name: city, count: 0 };
    current.count += 1;
    cityCounts.set(slug, current);
  }

  const seoLocationSlugs = new Set(SEO_LOCATIONS.map((location) => location.slug));
  const featured = SEO_LOCATIONS.map((location) => ({
    name: location.name,
    slug: location.slug,
    title: location.title,
    description: location.description,
    count: gymsForSeoLocation(indexableGyms, location).length,
    featured: true
  }));

  const extra = [...cityCounts.entries()]
    .filter(([slug]) => !seoLocationSlugs.has(slug))
    .map(([slug, { name, count }]) => ({
      name,
      slug,
      title: `Palestre a ${name}`,
      description: `Schede pubbliche collegate a ${name}, con contatti, orari e discipline quando disponibili.`,
      count,
      featured: false
    }));

  return filterByCount([...featured, ...extra], includeLowCount)
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));
}

export function buildSeoDisciplineCityEntries(gyms, { minCount = SEO_LANDING_MIN_INDEXABLE_COUNT } = {}) {
  const indexableGyms = gyms.filter((gym) => isIndexableGym(gym));
  const counts = new Map();

  for (const gym of indexableGyms) {
    const city = normalizeSeoLocationName(publicCityForGym(gym));
    if (!city || !isBrowsableLocationName(city)) continue;
    const citySlug = slugifySeoName(city);

    const seenSlugs = new Set();
    for (const rawName of disciplinesForGym(gym)) {
      const canonical = canonicalizeDiscipline(rawName);
      if (!canonical?.slug || !isPublicDisciplineSlug(canonical.slug) || seenSlugs.has(canonical.slug)) continue;
      seenSlugs.add(canonical.slug);

      const key = `${canonical.slug}::${citySlug}`;
      const current = counts.get(key) || {
        disciplineSlug: canonical.slug,
        disciplineName: canonical.name,
        citySlug,
        cityName: city,
        count: 0
      };
      current.count += 1;
      counts.set(key, current);
    }
  }

  // Verify each surviving candidate against the exact same matching functions
  // /discipline/[slug]/[citySlug]/+page.server.js uses at request time
  // (gymsForSeoDiscipline + gymsForSeoLocation, or exact-citySlug fallback).
  // The counting pass above uses a different, gym-tag-driven method that can
  // disagree with the live route's keyword-driven matching (confirmed during
  // the 2026-07-18 sitemap audit: it silently listed disciplines that were
  // never registered, like a stray "Tennis" tag, and a few combos whose
  // curated SEO_DISCIPLINES keyword list is narrower than the full taxonomy
  // alias set) -- this closes that gap so the sitemap can never advertise a
  // combo the live route would 404 on.
  return [...counts.values()]
    .filter((entry) => entry.count >= minCount)
    .filter((entry) => !SITEMAP_LIVE_ROUTE_MISMATCH_COMBOS.has(`${entry.disciplineSlug}::${entry.citySlug}`))
    .filter((entry) => {
      const discipline = getSeoDiscipline(entry.disciplineSlug) || (() => {
        const canonical = getDisciplineBySlug(entry.disciplineSlug);
        return canonical && canonical.slug === entry.disciplineSlug
          ? { slug: canonical.slug, name: canonical.name, keywords: [canonical.name, ...(canonical.aliases || [])] }
          : null;
      })();
      if (!discipline) return false;

      const disciplineGyms = gymsForSeoDiscipline(indexableGyms, discipline);
      const location = getSeoLocation(entry.citySlug);
      const matchedGyms = location
        ? gymsForSeoLocation(disciplineGyms, location)
        : disciplineGyms.filter((gym) => slugifySeoName(publicCityForGym(gym)) === entry.citySlug);

      return matchedGyms.length > 0;
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.disciplineName.localeCompare(right.disciplineName, 'it') ||
        left.cityName.localeCompare(right.cityName, 'it')
    );
}

export function buildSeoDisciplineEntries(gyms, { includeLowCount = true } = {}) {
  const indexableGyms = gyms.filter((gym) => isIndexableGym(gym));
  const seoBySlug = new Map(SEO_DISCIPLINES.map((discipline) => [discipline.slug, discipline]));
  const canonical = DISCIPLINE_MASTER.filter((discipline) => isPublicDisciplineSlug(discipline.slug)).map((discipline) => {
    const seo = seoBySlug.get(discipline.slug);
    return {
      name: discipline.name,
      slug: discipline.slug,
      title: seo?.title || `Palestre di ${discipline.name}`,
      description:
        seo?.description ||
        `Schede pubbliche collegate a ${discipline.name}, con contatti, orari e discipline correlate quando disponibili.`,
      count: gymsForSeoDiscipline(indexableGyms, {
        ...discipline,
        keywords: [discipline.name, ...(discipline.aliases || [])]
      }).length,
      featured: Boolean(seo)
    };
  });

  return filterByCount(canonical, includeLowCount)
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));
}
