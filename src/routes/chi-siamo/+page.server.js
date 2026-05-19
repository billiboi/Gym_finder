import { isArchivedGym } from '$lib/admin/gyms';
import { buildCatalogStats } from '$lib/catalog-stats';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const allGyms = await readGyms();
  const gyms = allGyms.filter((gym) => !isArchivedGym(gym));
  const stats = buildCatalogStats({ allGyms, activeGyms: gyms });

  return {
    catalogTotalGyms: stats.activeGyms,
    catalogTotalRecords: stats.totalRecords,
    catalogTotalDisciplines: stats.canonicalDisciplines,
    catalogCuratedDisciplines: stats.curatedDisciplines
  };
}
