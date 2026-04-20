import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gymHref } from '$lib/gym-detail';
import { canPersistWrites, getUploadsDir, readGyms, writeGyms } from '$lib/server/gym-store';

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

function sanitizeFileName(value) {
  return String(value || 'image')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
}

async function storeImage(file, gymName) {
  if (!(file instanceof File) || file.size === 0) return '';

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.type)) {
    throw new Error('Formato immagine non supportato. Usa JPG, PNG, WEBP o GIF.');
  }

  const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };

  const fileName = `${sanitizeFileName(gymName)}-${Date.now()}${extMap[file.type] || '.jpg'}`;
  const targetPath = path.join(getUploadsDir(), fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);
  return `/uploads/${fileName}`;
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
  const persistentWrites = canPersistWrites();

  return {
    gyms: gyms
      .map((gym) => ({
        id: gym.id,
        name: gym.name || 'Senza nome',
        discipline:
          gym.discipline || (Array.isArray(gym.disciplines) ? gym.disciplines[0] : '') || 'Fitness',
        disciplines: Array.isArray(gym.disciplines) ? gym.disciplines : [],
        address: gym.address || '',
        address_display: [gym.address, gym.city].filter(Boolean).join(', '),
        city: gym.city || '',
        phone: gym.phone || '',
        hours_info: gym.hours_info || '',
        website: gym.website || '',
        description: gym.description || '',
        verified: Boolean(gym.verified),
        latitude: gym.latitude ?? '',
        longitude: gym.longitude ?? '',
        image_url: gym.image_url || '',
        publicHref: gymHref(gym)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    persistentWrites,
    deleted: url.searchParams.get('deleted') === '1',
    created: url.searchParams.get('created') === '1',
    updated: url.searchParams.get('updated') === '1'
  };
}

export const actions = {
  create: async ({ request, fetch }) => {
    if (!canPersistWrites()) {
      return fail(503, {
        createError:
          'Nel deploy pubblico le modifiche non sono persistenti. Usa l\'ambiente locale oppure collega un database.'
      });
    }

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
    let imageUrl = '';

    try {
      imageUrl = await storeImage(form.get('image'), name);
    } catch (err) {
      return fail(400, { createError: err?.message || 'Errore durante il caricamento immagine.' });
    }

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
        description: clean(form.get('description')),
        verified: false,
        latitude: toNullableNumber(form.get('latitude')),
        longitude: toNullableNumber(form.get('longitude')),
        image_url: imageUrl,
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
  update: async ({ request, fetch }) => {
    if (!canPersistWrites()) {
      return fail(503, {
        error:
          'Nel deploy pubblico le modifiche non sono persistenti. Usa l\'ambiente locale oppure collega un database.'
      });
    }

    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();
    const name = clean(form.get('name'));
    const disciplineText = clean(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    if (!name || !address) {
      return fail(400, { error: 'Nome e indirizzo sono obbligatori.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const idx = gyms.findIndex((gym) => gym.id === id);

    if (idx < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    const disciplines = toDisciplines(disciplineText);
    let imageUrl = gyms[idx].image_url || '';

    try {
      const uploadedImage = form.get('image');
      const replaceImage = clean(form.get('replace_image')) === '1';
      if (replaceImage && uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await storeImage(uploadedImage, name);
      }
    } catch (err) {
      return fail(400, { error: err?.message || 'Errore durante il caricamento immagine.' });
    }

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
      description: clean(form.get('description')),
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl
    };

    try {
      await writeGyms(gyms);
    } catch (err) {
      return fail(500, { error: err?.message || 'Errore durante il salvataggio.' });
    }

    throw redirect(303, '/admin/schede?updated=1');
  },
  delete: async ({ request, fetch }) => {
    if (!canPersistWrites()) {
      return fail(503, {
        error:
          'L\'eliminazione dal deploy pubblico non è persistente. Usa l\'ambiente locale oppure collega un database.'
      });
    }

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

