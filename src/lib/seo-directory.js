import { dedupeDisciplines } from '$lib/disciplines';
import { DISCIPLINE_MASTER, isPublicDisciplineSlug } from '$lib/discipline-taxonomy';
import { isIndexableGym } from '$lib/gym-detail';
import { SEO_DISCIPLINES, gymsForSeoDiscipline } from '$lib/seo-disciplines';
import { SEO_LOCATIONS, gymsForSeoLocation } from '$lib/seo-locations';

export const SEO_LANDING_MIN_INDEXABLE_COUNT = 2;

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
  if (/^\d/.test(value)) return false;
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
    const city = normalizeSeoLocationName(gym?.city || '');
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
