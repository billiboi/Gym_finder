import { buildSeoLocationEntries } from '$lib/seo-directory';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const locations = buildSeoLocationEntries(await readGyms());
  const featuredLocations = locations.filter((location) => location.featured);
  const extraLocations = locations.filter((location) => !location.featured);

  return {
    featuredLocations,
    extraLocations,
    totalLocations: featuredLocations.length + extraLocations.length
  };
}
