import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { readGyms } from '$lib/server/gym-store';
import { getSeoLocation, gymsForSeoLocation, topDisciplinesForGyms } from '$lib/seo-locations';

function slugifyLocationName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function load({ params }) {
  const gyms = await readGyms();
  let location = getSeoLocation(params.slug);

  if (!location) {
    const allCities = [...new Set(gyms.map((gym) => String(gym?.city || '').trim()).filter(Boolean))];
    const matchedName = allCities.find((name) => slugifyLocationName(name) === params.slug);

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
    gyms: matchedGyms,
    topDisciplines: topDisciplinesForGyms(matchedGyms)
  };
}
