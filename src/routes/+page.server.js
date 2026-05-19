import { isArchivedGym } from '$lib/admin/gyms';
import { buildCatalogStats } from '$lib/catalog-stats';
import { publicClientGym } from '$lib/gym-client';
import { readGyms } from '$lib/server/gym-store';

const INITIAL_GYM_LIMIT = 24;

export async function load() {
  const allGyms = await readGyms();
  const gyms = allGyms.filter((gym) => !isArchivedGym(gym));
  const stats = buildCatalogStats({ allGyms, activeGyms: gyms });

  return {
    initialGyms: gyms.slice(0, INITIAL_GYM_LIMIT).map(publicClientGym),
    catalogTotalGyms: stats.activeGyms,
    catalogTotalRecords: stats.totalRecords,
    catalogTotalDisciplines: stats.publicCanonicalDisciplines,
    catalogCuratedDisciplines: stats.curatedDisciplinePages,
    catalogZonesAvailable: stats.zonesAvailable,
    catalogCuratedPages: stats.curatedPages,
    initialDisciplines: stats.publicDisciplineOptions
  };
}
