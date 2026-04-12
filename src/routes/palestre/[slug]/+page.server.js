import { error } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';
import { isIndexableGym, primaryDisciplineForGym, slugifyGym } from '$lib/gym-detail';
import { seoLocationForGym } from '$lib/seo-locations';
import { seoDisciplineForGym } from '$lib/seo-disciplines';

export async function load({ params }) {
  const gyms = await readGyms();
  const gym = gyms.find((item) => slugifyGym(item) === params.slug);

  if (!gym) {
    throw error(404, 'Palestra non trovata');
  }

  const primaryDiscipline = primaryDisciplineForGym(gym);
  const relatedGyms = gyms
    .filter((item) => item.id !== gym.id)
    .filter((item) => isIndexableGym(item))
    .filter((item) => {
      const sameDiscipline = primaryDisciplineForGym(item) === primaryDiscipline;
      const sameCity =
        String(item.city || '').trim().toLowerCase() === String(gym.city || '').trim().toLowerCase();
      return sameDiscipline || sameCity;
    })
    .slice(0, 3);

  return {
    gym,
    gymSlug: params.slug,
    relatedGyms,
    relatedLocation: seoLocationForGym(gym),
    relatedDiscipline: seoDisciplineForGym(gym)
  };
}
