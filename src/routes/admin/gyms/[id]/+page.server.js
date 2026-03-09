import { error, fail, redirect } from '@sveltejs/kit';
import { readGyms, writeGyms } from '$lib/server/gym-store';

function clean(value) {
  return String(value ?? '').trim();
}

function toNullableNumber(value) {
  const raw = clean(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toDisciplines(value) {
  const list = clean(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : ['Fitness'];
}

export async function load({ params }) {
  const gyms = await readGyms();
  const gym = gyms.find((item) => item.id === params.id);

  if (!gym) {
    throw error(404, 'Palestra non trovata');
  }

  return {
    gym: {
      ...gym,
      discipline_text: Array.isArray(gym.disciplines)
        ? gym.disciplines.join(' | ')
        : clean(gym.discipline) || 'Fitness'
    }
  };
}

export const actions = {
  default: async ({ params, request }) => {
    const form = await request.formData();

    const name = clean(form.get('name'));
    const disciplineText = clean(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));

    if (!name || !address) {
      return fail(400, { error: 'Nome e indirizzo sono obbligatori.' });
    }

    const gyms = await readGyms();
    const idx = gyms.findIndex((item) => item.id === params.id);

    if (idx < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    const disciplines = toDisciplines(disciplineText);

    gyms[idx] = {
      ...gyms[idx],
      name,
      discipline: disciplines[0],
      disciplines,
      address,
      city,
      phone: clean(form.get('phone')),
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      website: clean(form.get('website')),
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude'))
    };

    try {
      await writeGyms(gyms);
    } catch (err) {
      return fail(500, {
        error: err?.message || 'Errore durante il salvataggio.'
      });
    }

    throw redirect(303, `/admin/gyms/${params.id}?saved=1`);
  }
};