import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gymHref } from '$lib/gym-detail';
import {
  canWriteSupabase,
  getUploadsDir,
  gymStoreStatus,
  readGyms,
  updateGymRecord,
  writeGymRecords
} from '$lib/server/gym-store';
import {
  adminErrorMessage,
  adminGymView,
  archiveGym,
  duplicateGym,
  restoreGym
} from '$lib/admin/gyms';
import { DISCIPLINE_MASTER, DISCIPLINE_ALIAS_ROWS } from '$lib/discipline-taxonomy';
import { normalizeDisciplineField, normalizeDisciplineSlugs } from '$lib/disciplines';

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
  const list = normalizeDisciplineField(value, []).disciplines;
  return list.length ? list : [];
}

function disciplineAliases(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).aliases;
}

function disciplineSlugs(value, fallback = []) {
  return normalizeDisciplineSlugs(value, fallback);
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

function isValidImageUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  if (raw.startsWith('data:image/')) return true;

  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function persistentImageFromFile(file, gymName) {
  if (!(file instanceof File) || file.size === 0) return '';

  const isVercelRuntime = process.env.VERCEL === '1';
  if (!isVercelRuntime) {
    return storeImage(file, gymName);
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.type)) {
    throw new Error('Formato immagine non supportato. Usa JPG, PNG, WEBP o GIF.');
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Immagine troppo grande per il salvataggio diretto. Usa un file sotto 2 MB oppure incolla un URL immagine.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
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
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS,
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
    const aliases = disciplineAliases(form.get('discipline'), disciplines);
    const canonicalSlugs = disciplineSlugs(form.get('discipline'), disciplines);
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));
    const website = clean(form.get('website'));
    const validationError = validateGymPayload({ name, city, disciplines, website });

    if (validationError) return fail(400, { createError: validationError });

    const gyms = await getGymsWithFallback(fetch);
    let imageUrl = clean(form.get('image_url'));
    if (!isValidImageUrl(imageUrl)) {
      return fail(400, { createError: 'URL immagine non valido. Usa un URL http/https oppure carica un file.' });
    }

    try {
      const uploadedImage = form.get('image');
      if (uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await persistentImageFromFile(uploadedImage, name);
      }
    } catch (err) {
      return fail(400, { createError: err?.message || 'Errore durante il caricamento immagine.' });
    }

    const verified = clean(form.get('verified')) === '1';
    const premium = clean(form.get('premium')) === '1';

    const nextGym = {
      id: `gym-${randomUUID()}`,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      discipline_canonical_slugs: canonicalSlugs,
      address,
      city,
      phone: normalizePhone(form.get('phone')),
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      website,
      description: clean(form.get('description')),
      verified,
      is_verified: verified,
      is_premium: premium,
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {
        _verified: verified,
        _is_premium: premium,
        _image_url: imageUrl,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: canonicalSlugs
      }
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
    const aliases = disciplineAliases(form.get('discipline'), disciplines);
    const canonicalSlugs = disciplineSlugs(form.get('discipline'), disciplines);
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));
    const website = clean(form.get('website'));
    const validationError = validateGymPayload({ name, city, disciplines, website });

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (validationError) return fail(400, { error: validationError, editId: id });

    const gyms = await getGymsWithFallback(fetch);
    const idx = gyms.findIndex((gym) => gym.id === id);

    if (idx < 0) return fail(404, { error: 'Palestra non trovata.', editId: id });

    let imageUrl = clean(form.get('image_url')) || gyms[idx].image_url || '';
    if (!isValidImageUrl(imageUrl)) {
      return fail(400, {
        error: 'URL immagine non valido. Usa un URL http/https oppure carica un file.',
        editId: id
      });
    }

    try {
      const uploadedImage = form.get('image');
      const replaceImage = clean(form.get('replace_image')) === '1';
      if (uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await persistentImageFromFile(uploadedImage, name);
      } else if (replaceImage && !clean(form.get('image_url'))) {
        imageUrl = '';
      }
    } catch (err) {
      return fail(400, { error: err?.message || 'Errore durante il caricamento immagine.', editId: id });
    }

    const verified = clean(form.get('verified')) === '1';
    const premium = clean(form.get('premium')) === '1';
    const weeklyHours = gyms[idx]?.weekly_hours && typeof gyms[idx].weekly_hours === 'object' ? gyms[idx].weekly_hours : {};

    gyms[idx] = {
      ...gyms[idx],
      nome: name,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      discipline_canonical_slugs: canonicalSlugs,
      indirizzo: address,
      address,
      citta: city,
      city,
      telefono: normalizePhone(form.get('phone')),
      phone: normalizePhone(form.get('phone')),
      orari: clean(form.get('hours_info')) || 'Orari da verificare',
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      sito: website,
      website,
      descrizione: clean(form.get('description')),
      description: clean(form.get('description')),
      verified,
      is_verified: verified,
      is_premium: premium,
      lat: toNullableNumber(form.get('latitude')),
      latitude: toNullableNumber(form.get('latitude')),
      lng: toNullableNumber(form.get('longitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {
        ...weeklyHours,
        _verified: verified,
        _is_premium: premium,
        _image_url: imageUrl,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: canonicalSlugs
      }
    };

    try {
      await updateGymRecord(gyms[idx]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.'), editId: id });
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
