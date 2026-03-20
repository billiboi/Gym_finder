import { fail, redirect } from '@sveltejs/kit';
import { canPersistWrites, readGyms, writeGyms } from '$lib/server/gym-store';

function clean(value) {
  return String(value ?? '').trim();
}

function toDisciplines(value, fallback = 'Fitness') {
  const list = clean(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.length) return [...new Set(list)];

  return clean(fallback)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean).length
    ? [...new Set(clean(fallback).split('|').map((item) => item.trim()).filter(Boolean))]
    : ['Fitness'];
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

function disciplineTextForGym(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length > 0) {
    return gym.disciplines.join(' | ');
  }

  return clean(gym?.discipline) || 'Fitness';
}

function suspiciousScore(gym) {
  const name = clean(gym?.name).toLowerCase();
  const disciplineText = disciplineTextForGym(gym);
  const onlyFitness = disciplineText === 'Fitness';

  if (!onlyFitness) return 0;

  const keywords = [
    'dojo', 'judo', 'karate', 'mma', 'box', 'boxing', 'kick', 'muay', 'jiu', 'ju-jitsu',
    'jujitsu', 'kung', 'wing chun', 'aikido', 'taekwondo', 'kempo', 'kenpo', 'arti marziali', 'shaolin'
  ];

  return keywords.some((keyword) => name.includes(keyword)) ? 2 : 1;
}

export async function load({ url, fetch }) {
  const gyms = await getGymsWithFallback(fetch);
  const persistentWrites = canPersistWrites();

  const mapped = gyms
    .map((gym) => ({
      id: gym.id,
      name: gym.name || 'Senza nome',
      disciplineText: disciplineTextForGym(gym),
      address: [gym.address, gym.city].filter(Boolean).join(', '),
      website: gym.website || '',
      suspiciousScore: suspiciousScore(gym)
    }))
    .sort((a, b) => {
      if (b.suspiciousScore !== a.suspiciousScore) return b.suspiciousScore - a.suspiciousScore;
      return a.name.localeCompare(b.name, 'it');
    });

  return {
    gyms: mapped,
    persistentWrites,
    saved: url.searchParams.get('saved') === '1',
    deleted: url.searchParams.get('deleted') === '1'
  };
}

export const actions = {
  save: async ({ request, fetch }) => {
    if (!canPersistWrites()) {
      return fail(503, {
        error: 'Nel deploy pubblico le modifiche non sono persistenti. Usa l\'ambiente locale oppure collega un database.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const disciplineText = clean(form.get('disciplines'));
    const currentDisciplines = clean(form.get('current_disciplines'));

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (index < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    const disciplines = toDisciplines(disciplineText, currentDisciplines || disciplineTextForGym(gyms[index]));
    gyms[index] = {
      ...gyms[index],
      discipline: disciplines[0],
      disciplines
    };

    try {
      await writeGyms(gyms);
    } catch (err) {
      return fail(500, { error: err?.message || 'Errore durante il salvataggio.' });
    }

    throw redirect(303, '/admin/riclassifica?saved=1');
  },
  delete: async ({ request, fetch }) => {
    if (!canPersistWrites()) {
      return fail(503, {
        error: 'Nel deploy pubblico le modifiche non sono persistenti. Usa l\'ambiente locale oppure collega un database.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));

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

    throw redirect(303, '/admin/riclassifica?deleted=1');
  }
};
