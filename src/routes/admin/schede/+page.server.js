import { fail, redirect } from '@sveltejs/kit';
import { readGyms, writeGyms } from '$lib/server/gym-store';

export async function load({ url }) {
  const gyms = await readGyms();

  return {
    gyms: gyms
      .map((gym) => ({
        id: gym.id,
        name: gym.name || 'Senza nome',
        discipline: gym.discipline || (Array.isArray(gym.disciplines) ? gym.disciplines[0] : '') || 'Fitness',
        address: [gym.address, gym.city].filter(Boolean).join(', '),
        city: gym.city || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    deleted: url.searchParams.get('deleted') === '1'
  };
}

export const actions = {
  delete: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await readGyms();
    const next = gyms.filter((gym) => gym.id !== id);

    if (next.length === gyms.length) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    try {
      await writeGyms(next);
    } catch (err) {
      return fail(500, { error: err?.message || 'Errore durante eliminazione.' });
    }

    throw redirect(303, '/admin/schede?deleted=1');
  }
};
