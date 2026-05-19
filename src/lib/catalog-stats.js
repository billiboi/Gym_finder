import { publicDisciplineFilterOptions } from '$lib/disciplines';
import { canonicalizeDiscipline } from '$lib/discipline-taxonomy';

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

  return {
    totalRecords: allGyms.length,
    activeGyms: activeGyms.length,
    canonicalDisciplines: activeCanonicalSlugs.size,
    curatedDisciplines: publicDisciplineOptions.length,
    publicDisciplineOptions
  };
}
