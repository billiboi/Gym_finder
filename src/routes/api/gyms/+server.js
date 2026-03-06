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
    return gymOrPayload.disciplines
      .map((d) => clean(String(d)))
      .filter(Boolean);
  }

  const single = clean(gymOrPayload.discipline);
  if (!single) return [];

  return single
    .split('|')
    .map((d) => clean(d))
    .filter(Boolean);
}
function parseNumber(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQueryNumber(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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

function toMinutes(time) {
  if (typeof time !== 'string' || !time.includes(':')) return null;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function isGymOpenNow(gym, nowDate = new Date()) {
  const schedule = gym.weekly_hours;
  if (!schedule || typeof schedule !== 'object') return null;

  const day = nowDate.getDay();
  const slots = schedule[String(day)] || [];
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  for (const slot of slots) {
    if (!Array.isArray(slot) || slot.length !== 2) continue;
    const openMinutes = toMinutes(slot[0]);
    const closeMinutes = toMinutes(slot[1]);
    if (openMinutes === null || closeMinutes === null) continue;
    if (openMinutes <= nowMinutes && nowMinutes < closeMinutes) return true;
  }

  return false;
}

function filterGyms(gyms, { q, discipline, userLat, userLng, radiusKm }) {
  let out = gyms.map((gym) => ({
    ...gym,
    open_now: isGymOpenNow(gym)
  }));

  if (discipline) {
    out = out.filter((gym) => disciplineList(gym).map((d) => d.toLowerCase()).includes(discipline.toLowerCase()));
  }

  if (q) {
    const query = q.toLowerCase();
    out = out.filter((gym) => {
      return [gym.name, gym.address, gym.city, disciplineList(gym).join(' | ')].some((field) =>
        (field || '').toLowerCase().includes(query)
      );
    });
  }


  const hasUserPosition = Number.isFinite(userLat) && Number.isFinite(userLng);
  if (hasUserPosition) {
    out = out
      .map((gym) => {
        const lat = Number(gym.latitude);
        const lng = Number(gym.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return { ...gym, distance_km: null };
        }

        const distance = haversineKm(userLat, userLng, lat, lng);
        return { ...gym, distance_km: Math.round(distance * 10) / 10 };
      })
      .filter((gym) => {
        if (!Number.isFinite(radiusKm)) return true;
        return gym.distance_km !== null && gym.distance_km <= radiusKm;
      })
      .sort((a, b) => {
        if (a.distance_km === null && b.distance_km === null) return a.name.localeCompare(b.name, 'it');
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });

    return out;
  }

  return out.sort((a, b) => {
    if (a.open_now === b.open_now) return a.name.localeCompare(b.name, 'it');
    if (a.open_now === true) return -1;
    if (b.open_now === true) return 1;
    return a.name.localeCompare(b.name, 'it');
  });
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

export async function GET({ url }) {
  try {
    const q = clean(url.searchParams.get('q'));
    const discipline = clean(url.searchParams.get('discipline'));
    const userLat = parseQueryNumber(url.searchParams.get('lat'));
    const userLng = parseQueryNumber(url.searchParams.get('lng'));
    const radiusKm = parseQueryNumber(url.searchParams.get('radius_km'));

    const gyms = await readGyms();
    return json(filterGyms(gyms, { q, discipline, userLat, userLng, radiusKm }));
  } catch {
    return json([]);
  }
}

export async function POST({ request }) {
  const formData = await request.formData();
  const gyms = await readGyms();
  const knownDisciplines = getKnownDisciplines(gyms);

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

  const coords = resolveCoordinates(payload);

  const newGym = {
    id: randomUUID(),
    ...payload,
    latitude: coords.latitude,
    longitude: coords.longitude,
    image_url: localImageUrl || payload.image_url,
    created_at: new Date().toISOString()
  };

  gyms.push(newGym);
  await writeGyms(gyms);

  return json(newGym, { status: 201 });
}












