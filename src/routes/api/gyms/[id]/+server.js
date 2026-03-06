import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { json } from '@sveltejs/kit';
import { getUploadsDir, readGyms, writeGyms } from '$lib/server/gym-store';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const CITY_COORDS = {
  roma: { latitude: 41.9028, longitude: 12.4964 },
  milano: { latitude: 45.4642, longitude: 9.19 },
  torino: { latitude: 45.0703, longitude: 7.6869 },
  napoli: { latitude: 40.8518, longitude: 14.2681 },
  bologna: { latitude: 44.4949, longitude: 11.3426 },
  firenze: { latitude: 43.7696, longitude: 11.2558 },
  palermo: { latitude: 38.1157, longitude: 13.3615 },
  venezia: { latitude: 45.4408, longitude: 12.3155 },
  bari: { latitude: 41.1171, longitude: 16.8719 },
  catania: { latitude: 37.5079, longitude: 15.083 }
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function disciplineList(gymOrPayload) {
  if (Array.isArray(gymOrPayload.disciplines)) {
    return gymOrPayload.disciplines.map((d) => clean(String(d))).filter(Boolean);
  }
  const single = clean(gymOrPayload.discipline);
  if (!single) return [];
  return single.split('|').map((d) => clean(d)).filter(Boolean);
}

function parseNumber(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferCoordsFromCity(city) {
  const key = clean(city).toLowerCase();
  return CITY_COORDS[key] || null;
}

function resolveCoordinates({ latitude, longitude, city, previousLatitude = null, previousLongitude = null }) {
  if (latitude !== null && longitude !== null) {
    return { latitude, longitude };
  }

  const inferred = inferCoordsFromCity(city);
  if (inferred) return inferred;

  if (previousLatitude !== null && previousLongitude !== null) {
    return { latitude: previousLatitude, longitude: previousLongitude };
  }

  return { latitude: null, longitude: null };
}

function getKnownDisciplines(gyms) {
  return new Set(gyms.flatMap((gym) => disciplineList(gym).map((d) => d.toLowerCase())));
}

async function saveUploadedImage(file) {
  if (!file || file.size === 0) return '';

  if (!file.type.startsWith('image/')) {
    throw new Error('Il file deve essere un\'immagine valida.');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('L\'immagine supera il limite di 5MB.');
  }

  const originalName = file.name || 'image.jpg';
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${Date.now()}-${randomUUID()}${ext.toLowerCase()}`;
  const fullPath = path.join(getUploadsDir(), filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return `/uploads/${filename}`;
}

export async function PUT({ params, request }) {
  const gymId = params.id;
  const gyms = await readGyms();
  const index = gyms.findIndex((gym) => gym.id === gymId);

  if (index === -1) {
    return json({ error: 'Palestra non trovata.' }, { status: 404 });
  }

  const knownDisciplines = getKnownDisciplines(gyms);
  const formData = await request.formData();

  const payload = {
    name: clean(formData.get('name')),
    discipline: clean(formData.get('discipline')),
    address: clean(formData.get('address')),
    city: clean(formData.get('city')),
    hours_info: clean(formData.get('hours_info')),
    phone: clean(formData.get('phone')),
    email: clean(formData.get('email')),
    website: clean(formData.get('website')),
    image_url: clean(formData.get('image_url')),
    latitude: parseNumber(clean(formData.get('latitude'))),
    longitude: parseNumber(clean(formData.get('longitude')))
  };

  const required = ['name', 'discipline', 'address', 'city', 'hours_info'];
  const missing = required.filter((key) => !payload[key]);

  if (missing.length) {
    return json({ error: `Campi obbligatori mancanti: ${missing.join(', ')}` }, { status: 400 });
  }

  const payloadDisciplines = disciplineList(payload);
  if (knownDisciplines.size > 0 && payloadDisciplines.some((d) => !knownDisciplines.has(d.toLowerCase()))) {
    return json({ error: 'Disciplina non valida: seleziona disciplina/e esistenti.' }, { status: 400 });
  }

  let localImageUrl = '';
  try {
    const imageFile = formData.get('image');
    if (imageFile instanceof File) {
      localImageUrl = await saveUploadedImage(imageFile);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore durante upload immagine.';
    return json({ error: message }, { status: 400 });
  }

  const coords = resolveCoordinates({
    ...payload,
    previousLatitude: Number.isFinite(Number(gyms[index].latitude)) ? Number(gyms[index].latitude) : null,
    previousLongitude: Number.isFinite(Number(gyms[index].longitude)) ? Number(gyms[index].longitude) : null
  });

  const updatedGym = {
    ...gyms[index],
    ...payload,
    latitude: coords.latitude,
    longitude: coords.longitude,
    image_url: localImageUrl || payload.image_url || gyms[index].image_url || '',
    updated_at: new Date().toISOString()
  };

  gyms[index] = updatedGym;
  await writeGyms(gyms);

  return json(updatedGym);
}

export async function DELETE({ params }) {
  const gymId = params.id;
  const gyms = await readGyms();
  const nextGyms = gyms.filter((gym) => gym.id !== gymId);

  if (nextGyms.length === gyms.length) {
    return json({ error: 'Palestra non trovata.' }, { status: 404 });
  }

  await writeGyms(nextGyms);
  return json({ status: 'deleted', id: gymId });
}







