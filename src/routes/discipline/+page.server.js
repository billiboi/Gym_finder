import { buildSeoDisciplineEntries } from '$lib/seo-directory';
import { isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const gyms = (await readGyms()).filter((gym) => !isArchivedGym(gym));
  const disciplines = buildSeoDisciplineEntries(gyms);
  const featuredDisciplines = disciplines.filter((discipline) => discipline.featured);
  const extraDisciplines = disciplines.filter((discipline) => !discipline.featured);

  return {
    featuredDisciplines,
    extraDisciplines,
    totalDisciplines: featuredDisciplines.length + extraDisciplines.length
  };
}
