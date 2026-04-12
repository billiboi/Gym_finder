import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { readGyms } from '$lib/server/gym-store';
import { getSeoLocation, gymsForSeoLocation, topDisciplinesForGyms } from '$lib/seo-locations';

export async function load({ params }) {
  const location = getSeoLocation(params.slug);

  if (!location) {
    throw error(404, 'Zona non trovata');
  }

  const gyms = await readGyms();
  const matchedGyms = gymsForSeoLocation(gyms, location).filter((gym) => isIndexableGym(gym));

  return {
    location,
    gyms: matchedGyms,
    topDisciplines: topDisciplinesForGyms(matchedGyms)
  };
}
