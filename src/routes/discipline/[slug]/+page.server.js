import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { readGyms } from '$lib/server/gym-store';
import { getSeoDiscipline, gymsForSeoDiscipline } from '$lib/seo-disciplines';

export async function load({ params }) {
  const discipline = getSeoDiscipline(params.slug);

  if (!discipline) {
    throw error(404, 'Disciplina non trovata');
  }

  const gyms = await readGyms();
  const matchedGyms = gymsForSeoDiscipline(gyms, discipline).filter((gym) => isIndexableGym(gym));

  return {
    discipline,
    gyms: matchedGyms
  };
}
