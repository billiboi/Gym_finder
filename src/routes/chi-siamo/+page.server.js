import { PUBLIC_CATALOG_NUMBERS } from '$lib/trust';

export const config = {
  isr: {
    expiration: 21600
  }
};

export async function load() {
  return {
    catalogTotalGyms: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalRecords: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogCuratedDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogZonesAvailable: PUBLIC_CATALOG_NUMBERS.zonesLabel,
    catalogCuratedPages: PUBLIC_CATALOG_NUMBERS.curatedPagesLabel
  };
}
