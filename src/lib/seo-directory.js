import { dedupeDisciplines } from '$lib/disciplines';
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
    const city = String(gym?.city || '').trim();
    if (!city || !isBrowsableLocationName(city)) continue;
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }

  const seoLocationNames = new Set(SEO_LOCATIONS.map((location) => location.name));
  const featured = SEO_LOCATIONS.map((location) => ({
    name: location.name,
    slug: location.slug,
    title: location.title,
    description: location.description,
    count: gymsForSeoLocation(indexableGyms, location).length,
    featured: true
  }));

  const extra = [...cityCounts.entries()]
    .filter(([name]) => !seoLocationNames.has(name))
    .map(([name, count]) => ({
      name,
      slug: slugifySeoName(name),
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
  const disciplineCounts = new Map();

  for (const gym of indexableGyms) {
    for (const discipline of disciplinesForGym(gym)) {
      disciplineCounts.set(discipline, (disciplineCounts.get(discipline) || 0) + 1);
    }
  }

  const seoDisciplineNames = new Set(SEO_DISCIPLINES.map((discipline) => discipline.name));
  const featured = SEO_DISCIPLINES.map((discipline) => ({
    name: discipline.name,
    slug: discipline.slug,
    title: discipline.title,
    description: discipline.description,
    count: gymsForSeoDiscipline(indexableGyms, discipline).length,
    featured: true
  }));

  const extra = [...disciplineCounts.entries()]
    .filter(([name]) => !seoDisciplineNames.has(name))
    .map(([name, count]) => ({
      name,
      slug: slugifySeoName(name),
      title: `Palestre di ${name}`,
      description: `Schede pubbliche collegate a ${name}, con contatti, orari e discipline correlate quando disponibili.`,
      count,
      featured: false
    }));

  return filterByCount([...featured, ...extra], includeLowCount)
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));
}
