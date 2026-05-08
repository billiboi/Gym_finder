import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gymHref } from '$lib/gym-detail';
import { canWriteSupabase, getUploadsDir, gymStoreStatus, readGyms, writeGymRecords } from '$lib/server/gym-store';
import {
  adminErrorMessage,
  adminGymView,
  archiveGym,
  duplicateGym,
  restoreGym
} from '$lib/admin/gyms';

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
  return list.length ? list : [];
}

function isValidUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizePhone(value) {
  return clean(value).replace(/[^\d+\s().-]/g, '').replace(/\s+/g, ' ');
}

function validateGymPayload({ name, city, disciplines, website }) {
  if (!name) return 'Nome palestra obbligatorio.';
  if (!city) return 'Città/località obbligatoria.';
  if (!disciplines.length) return 'Inserisci almeno una disciplina.';
  if (!isValidUrl(website)) return 'Il sito web deve essere un URL valido con http:// o https://.';
  return '';
}

function sanitizeFileName(value) {
  return (
    String(value || 'image')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
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
  const persistentWrites = canWriteSupabase();

  return {
    gyms: gyms
      .map((gym) => ({
        ...adminGymView(gym),
        publicHref: gymHref(gym)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    persistentWrites,
    storeStatus: gymStoreStatus(),
    archived: url.searchParams.get('archived') === '1',
    restored: url.searchParams.get('restored') === '1',
    duplicated: url.searchParams.get('duplicated') === '1',
    created: url.searchParams.get('created') === '1',
    updated: url.searchParams.get('updated') === '1'
  };
}

export const actions = {
  create: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        createError:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const name = clean(form.get('name'));
    const disciplines = toDisciplines(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));
    const website = clean(form.get('website'));
    const validationError = validateGymPayload({ name, city, disciplines, website });

    if (validationError) return fail(400, { createError: validationError });

    const gyms = await getGymsWithFallback(fetch);
    let imageUrl = '';

    try {
      imageUrl = await storeImage(form.get('image'), name);
    } catch (err) {
      return fail(400, { createError: err?.message || 'Errore durante il caricamento immagine.' });
    }

    const nextGym = {
      id: `gym-${randomUUID()}`,
      name,
      discipline: disciplines[0],
      disciplines,
      address,
      city,
      phone: normalizePhone(form.get('phone')),
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      website,
      description: clean(form.get('description')),
      verified: clean(form.get('verified')) === '1',
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {}
    };

    try {
      await writeGymRecords(nextGym);
    } catch (err) {
      return fail(500, { createError: adminErrorMessage(err, 'Creazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?created=1');
  },

  update: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const name = clean(form.get('name'));
    const disciplines = toDisciplines(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));
    const website = clean(form.get('website'));
    const validationError = validateGymPayload({ name, city, disciplines, website });

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (validationError) return fail(400, { error: validationError });

    const gyms = await getGymsWithFallback(fetch);
    const idx = gyms.findIndex((gym) => gym.id === id);

    if (idx < 0) return fail(404, { error: 'Palestra non trovata.' });

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
      phone: normalizePhone(form.get('phone')),
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      website,
      description: clean(form.get('description')),
      verified: clean(form.get('verified')) === '1',
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl
    };

    try {
      await writeGymRecords(gyms[idx]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.') });
    }

    if (clean(form.get('next_action')) === 'open_public') {
      throw redirect(303, gymHref(gyms[idx]));
    }

    throw redirect(303, '/admin/schede?updated=1');
  },

  delete: async ({ request, fetch }) => {
    // Guardrail anti-disastro: questa action mantiene il nome storico "delete"
    // per compatibilità con i form esistenti, ma non cancella mai record gyms.
    // Ogni rimozione admin deve passare da archiveGym().
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Archiviazione bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (index < 0) return fail(404, { error: 'Palestra non trovata.' });

    gyms[index] = archiveGym(gyms[index]);

    try {
      await writeGymRecords(gyms[index]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Archiviazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?archived=1');
  },

  restore: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Ripristino bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (index < 0) return fail(404, { error: 'Palestra non trovata.' });

    gyms[index] = restoreGym(gyms[index]);

    try {
      await writeGymRecords(gyms[index]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Ripristino non riuscito.') });
    }

    throw redirect(303, '/admin/schede?restored=1');
  },

  duplicate: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Duplicazione bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const gyms = await getGymsWithFallback(fetch);
    const source = gyms.find((gym) => gym.id === id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (!source) return fail(404, { error: 'Palestra non trovata.' });

    try {
      await writeGymRecords(duplicateGym(source, `gym-${randomUUID()}`));
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Duplicazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?duplicated=1');
  }
};
