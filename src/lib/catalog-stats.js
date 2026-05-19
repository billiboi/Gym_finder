import { publicDisciplineFilterOptions } from '$lib/disciplines';
import { canonicalizeDiscipline } from '$lib/discipline-taxonomy';
import { buildSeoDisciplineEntries, buildSeoLocationEntries } from '$lib/seo-directory';

export function disciplineValuesForGyms(gyms) {
  return (gyms || []).flatMap((gym) =>
    Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : String(gym?.discipline || '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean)
  );
}

export function buildCatalogStats({ allGyms = [], activeGyms = [] } = {}) {
  const activeCanonicalSlugs = new Set();
  const activeCanonicalNames = [];

  for (const value of disciplineValuesForGyms(activeGyms)) {
    const canonical = canonicalizeDiscipline(value);
    if (!canonical || activeCanonicalSlugs.has(canonical.slug)) continue;
    activeCanonicalSlugs.add(canonical.slug);
    activeCanonicalNames.push(canonical.name);
  }

  const publicDisciplineOptions = publicDisciplineFilterOptions(activeCanonicalNames);
  const publicDisciplineEntries = buildSeoDisciplineEntries(activeGyms);
  const publicLocationEntries = buildSeoLocationEntries(activeGyms);
  const curatedDisciplinePages = publicDisciplineEntries.filter((entry) => entry.featured).length;
  const curatedZonePages = publicLocationEntries.filter((entry) => entry.featured).length;

  return {
    totalRecords: allGyms.length,
    activeGyms: activeGyms.length,
    canonicalDisciplines: activeCanonicalSlugs.size,
    publicCanonicalDisciplines: publicDisciplineEntries.length,
    curatedDisciplines: publicDisciplineOptions.length,
    curatedDisciplinePages,
    zonesAvailable: publicLocationEntries.length,
    curatedZonePages,
    curatedPages: curatedDisciplinePages + curatedZonePages,
    publicDisciplineOptions
  };
}
