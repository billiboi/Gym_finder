import { error, fail, redirect } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canWriteSupabase, getUploadsDir, readGyms, updateGymRecord } from '$lib/server/gym-store';
import { normalizeDisciplineField } from '$lib/disciplines';
import { DISCIPLINE_MASTER, DISCIPLINE_ALIAS_ROWS } from '$lib/discipline-taxonomy';

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
  return normalizeDisciplineField(value, ['Fitness']).disciplines;
}

function disciplineAliases(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).aliases;
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

export async function load({ params, fetch }) {
  const gyms = await getGymsWithFallback(fetch);
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
    },
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS
  };
}

export const actions = {
  default: async ({ params, request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();

    const name = clean(form.get('name'));
    const disciplineText = clean(form.get('discipline'));
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));

    if (!name || !address) {
      return fail(400, { error: 'Nome e indirizzo sono obbligatori.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const idx = gyms.findIndex((item) => item.id === params.id);

    if (idx < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    const disciplines = toDisciplines(disciplineText);
    const aliases = disciplineAliases(disciplineText, disciplines);
    let imageUrl = clean(form.get('image_url')) || gyms[idx].image_url || '';
    if (!isValidImageUrl(imageUrl)) {
      return fail(400, {
        error: 'URL immagine non valido. Usa un URL http/https oppure carica un file.',
        editId: params.id
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
      return fail(400, {
        error: err?.message || 'Errore durante il caricamento immagine.'
      });
    }

    gyms[idx] = {
      ...gyms[idx],
      nome: name,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      indirizzo: address,
      address,
      citta: city,
      city,
      telefono: clean(form.get('phone')),
      phone: clean(form.get('phone')),
      orari: clean(form.get('hours_info')) || 'Orari da verificare',
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      sito: clean(form.get('website')),
      website: clean(form.get('website')),
      descrizione: clean(form.get('description')),
      description: clean(form.get('description')),
      lat: toNullableNumber(form.get('latitude')),
      latitude: toNullableNumber(form.get('latitude')),
      lng: toNullableNumber(form.get('longitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {
        ...(gyms[idx]?.weekly_hours && typeof gyms[idx].weekly_hours === 'object' ? gyms[idx].weekly_hours : {}),
        _image_url: imageUrl,
        _discipline_aliases: aliases
      }
    };

    try {
      await updateGymRecord(gyms[idx]);
    } catch (err) {
      return fail(500, {
        error: err?.message || 'Errore durante il salvataggio.'
      });
    }

    throw redirect(303, `/admin/gyms/${params.id}?saved=1`);
  }
};
