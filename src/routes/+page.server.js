import { isArchivedGym } from '$lib/admin/gyms';
import { buildCatalogStats } from '$lib/catalog-stats';
import { publicListingGym } from '$lib/gym-client';
import { readPublicGymCount, readPublicGymListing } from '$lib/server/gym-store';

const INITIAL_GYM_LIMIT = 24;

export async function load() {
  const listing = await readPublicGymListing({ limit: INITIAL_GYM_LIMIT, offset: 0 });
  const gyms = listing.items.filter((gym) => !isArchivedGym(gym));
  const totalGyms = await readPublicGymCount();
  const stats = buildCatalogStats({ allGyms: gyms, activeGyms: gyms });

  return {
    initialGyms: gyms.map(publicListingGym),
    catalogTotalGyms: totalGyms || stats.activeGyms,
    catalogTotalRecords: totalGyms || stats.totalRecords,
    catalogTotalDisciplines: stats.publicCanonicalDisciplines,
    catalogCuratedDisciplines: stats.curatedDisciplinePages,
    catalogZonesAvailable: stats.zonesAvailable,
    catalogCuratedPages: stats.curatedPages,
    initialDisciplines: stats.publicDisciplineOptions,
    initialHasMoreGyms: listing.hasMore
  };
}
