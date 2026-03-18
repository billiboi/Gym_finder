import { error, fail, redirect } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getUploadsDir, readGyms, writeGyms } from '$lib/server/gym-store';

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
    }
  };
}

export const actions = {
  default: async ({ params, request, fetch }) => {
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
    let imageUrl = gyms[idx].image_url || '';

    try {
      const uploadedImage = form.get('image');
      const replaceImage = clean(form.get('replace_image')) === '1';
      if (replaceImage && uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await storeImage(uploadedImage, name);
      }
    } catch (err) {
      return fail(400, {
        error: err?.message || 'Errore durante il caricamento immagine.'
      });
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
      return fail(500, {
        error: err?.message || 'Errore durante il salvataggio.'
      });
    }

    throw redirect(303, `/admin/gyms/${params.id}?saved=1`);
  }
};
