import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { publicClientGym } from '$lib/gym-client';
import { normalizeSeoLocationName, slugifySeoName } from '$lib/seo-directory';
import { readGyms } from '$lib/server/gym-store';
import { getSeoLocation, gymsForSeoLocation, topDisciplinesForGyms } from '$lib/seo-locations';

const INITIAL_ZONE_GYMS = 36;

export async function load({ params }) {
  const gyms = await readGyms();
  let location = getSeoLocation(params.slug);

  if (!location) {
    const allCities = [...new Set(gyms.map((gym) => normalizeSeoLocationName(gym?.city || '')).filter(Boolean))];
    const matchedName = allCities.find((name) => slugifySeoName(name) === params.slug);

    if (!matchedName) {
      throw error(404, 'Zona non trovata');
    }

    location = {
      slug: params.slug,
      name: matchedName,
      title: `Palestre a ${matchedName}`,
      description: `Esplora le schede pubbliche collegate a ${matchedName} e controlla quali strutture del catalogo ricadono davvero in quest'area.`,
      keywords: [matchedName]
    };
  }

  const matchedGyms = gymsForSeoLocation(gyms, location).filter((gym) => isIndexableGym(gym));

  return {
    location,
    gyms: matchedGyms.slice(0, INITIAL_ZONE_GYMS).map(publicClientGym),
    totalGyms: matchedGyms.length,
    hasMoreGyms: matchedGyms.length > INITIAL_ZONE_GYMS,
    topDisciplines: topDisciplinesForGyms(matchedGyms)
  };
}
