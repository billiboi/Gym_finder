import { isArchivedGym } from '$lib/admin/gyms';
import { PUBLIC_DISCIPLINE_FILTER_OPTIONS } from '$lib/disciplines';
import { publicListingGym } from '$lib/gym-client';
import { readPublicGymListing } from '$lib/server/gym-store';
import { PUBLIC_CATALOG_NUMBERS } from '$lib/trust';

const INITIAL_GYM_LIMIT = 24;

export async function load() {
  const listing = await readPublicGymListing({ limit: INITIAL_GYM_LIMIT, offset: 0 });
  const gyms = listing.items.filter((gym) => !isArchivedGym(gym));

  return {
    initialGyms: gyms.map(publicListingGym),
    catalogTotalGyms: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalRecords: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogCuratedDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogZonesAvailable: PUBLIC_CATALOG_NUMBERS.zonesLabel,
    catalogCuratedPages: PUBLIC_CATALOG_NUMBERS.curatedPagesLabel,
    initialDisciplines: PUBLIC_DISCIPLINE_FILTER_OPTIONS,
    initialHasMoreGyms: listing.hasMore
  };
}
