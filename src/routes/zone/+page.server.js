import { buildSeoLocationEntries } from '$lib/seo-directory';
import { isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const gyms = (await readGyms()).filter((gym) => !isArchivedGym(gym));
  const locations = buildSeoLocationEntries(gyms);
  const featuredLocations = locations.filter((location) => location.featured);
  const extraLocations = locations.filter((location) => !location.featured);

  return {
    featuredLocations,
    extraLocations,
    totalLocations: featuredLocations.length + extraLocations.length
  };
}
