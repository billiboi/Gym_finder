import { error } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';
import { slugifyGym } from '$lib/gym-detail';

export async function load({ params }) {
  const gyms = await readGyms();
  const gym = gyms.find((item) => slugifyGym(item) === params.slug);

  if (!gym) {
    throw error(404, 'Palestra non trovata');
  }

  return { gym };
}
