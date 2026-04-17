import { dedupeDisciplines } from '$lib/disciplines';
import { isIndexableGym } from '$lib/gym-detail';
import { SEO_DISCIPLINES } from '$lib/seo-disciplines';
import { readGyms } from '$lib/server/gym-store';

function slugifyDisciplineName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function load() {
  const gyms = (await readGyms()).filter((gym) => isIndexableGym(gym));
  const counts = new Map();

  for (const gym of gyms) {
    const disciplines = Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : String(gym?.discipline || '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean);

    dedupeDisciplines(disciplines).forEach((discipline) => {
      counts.set(discipline, (counts.get(discipline) || 0) + 1);
    });
  }

  const seoDisciplineMap = new Map(SEO_DISCIPLINES.map((discipline) => [discipline.name, discipline]));

  const featuredDisciplines = SEO_DISCIPLINES
    .map((discipline) => ({
      name: discipline.name,
      slug: discipline.slug,
      title: discipline.title,
      description: discipline.description,
      count: counts.get(discipline.name) || 0,
      featured: true
    }))
    .filter((discipline) => discipline.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));

  const extraDisciplines = [...counts.entries()]
    .filter(([name]) => !seoDisciplineMap.has(name))
    .map(([name, count]) => ({
      name,
      slug: slugifyDisciplineName(name),
      title: name,
      description: `Esplora le schede pubbliche presenti nel catalogo per ${name}.`,
      count,
      featured: false
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));

  return {
    featuredDisciplines,
    extraDisciplines,
    totalDisciplines: featuredDisciplines.length + extraDisciplines.length
  };
}
