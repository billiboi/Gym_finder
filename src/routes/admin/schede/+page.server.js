import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
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

async function getGymsWithFallback(fetchFn) {
  const gyms = await readGyms();
  if (Array.isArray(gyms) && gyms.length > 0) return gyms;

  try {
    const res = await fetchFn('/api/gyms');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function load({ url, fetch }) {
  const gyms = await getGymsWithFallback(fetch);

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
    deleted: url.searchParams.get('deleted') === '1',
    created: url.searchParams.get('created') === '1'
  };
}

export const actions = {
  create: async ({ request, fetch }) => {
    const form = await request.formData();

    const name = clean(form.get('name'));
    const disciplineText = clean(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));

    if (!name || !address) {
      return fail(400, { createError: 'Nome e indirizzo sono obbligatori.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const disciplines = toDisciplines(disciplineText);

    const next = [
      ...gyms,
      {
        id: `gym-${randomUUID()}`,
        name,
        discipline: disciplines[0],
        disciplines,
        address,
        city,
        phone: clean(form.get('phone')),
        hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
        website: clean(form.get('website')),
        latitude: toNullableNumber(form.get('latitude')),
        longitude: toNullableNumber(form.get('longitude')),
        image_url: '',
        weekly_hours: {}
      }
    ];

    try {
      await writeGyms(next);
    } catch (err) {
      return fail(500, { createError: err?.message || 'Errore durante il salvataggio.' });
    }

    throw redirect(303, '/admin/schede?created=1');
  },
  delete: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await getGymsWithFallback(fetch);
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
