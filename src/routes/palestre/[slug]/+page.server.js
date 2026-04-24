import { error } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';
import { cityLabelForGym, isIndexableGym, primaryDisciplineForGym, slugifyGym } from '$lib/gym-detail';
import { seoLocationForGym } from '$lib/seo-locations';
import { seoDisciplineForGym } from '$lib/seo-disciplines';

function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function load({ params }) {
  const gyms = await readGyms();
  const gym = gyms.find((item) => slugifyGym(item) === params.slug);

  if (!gym) {
    throw error(404, 'Palestra non trovata');
  }

  const primaryDiscipline = primaryDisciplineForGym(gym);
  const gymCity = String(cityLabelForGym(gym) || '').trim().toLowerCase();
  const relatedGyms = gyms
    .filter((item) => item.id !== gym.id)
    .filter((item) => isIndexableGym(item))
    .map((item) => {
      const sameDiscipline = primaryDisciplineForGym(item) === primaryDiscipline;
      const sameCity = String(cityLabelForGym(item) || '').trim().toLowerCase() === gymCity;
      const score = (sameDiscipline ? 2 : 0) + (sameCity ? 3 : 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);

  const dynamicLocation = gymCity
    ? {
        slug: slugifyName(cityLabelForGym(gym)),
        name: cityLabelForGym(gym)
      }
    : null;
  const dynamicDiscipline = primaryDiscipline
    ? {
        slug: slugifyName(primaryDiscipline),
        name: primaryDiscipline
      }
    : null;

  return {
    gym,
    gymSlug: params.slug,
    relatedGyms,
    relatedLocation: seoLocationForGym(gym) || dynamicLocation,
    relatedDiscipline: seoDisciplineForGym(gym) || dynamicDiscipline
  };
}
