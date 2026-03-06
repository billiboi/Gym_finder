import { json } from '@sveltejs/kit';
import { readStaticGyms } from '$lib/server/static-gyms';

export const runtime = 'nodejs';

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

function filterGyms(gyms, { q, discipline, userLat, userLng, radiusKm }) {
  let out = [...gyms];

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

  return out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export async function GET({ url }) {
  try {
    const q = clean(url.searchParams.get('q'));
    const discipline = clean(url.searchParams.get('discipline'));
    const userLat = parseQueryNumber(url.searchParams.get('lat'));
    const userLng = parseQueryNumber(url.searchParams.get('lng'));
    const radiusKm = parseQueryNumber(url.searchParams.get('radius_km'));

    const gyms = readStaticGyms();
    return json(filterGyms(gyms, { q, discipline, userLat, userLng, radiusKm }));
  } catch {
    return json([]);
  }
}

export async function POST() {
  return json({ error: 'Modifica dati non disponibile in deploy pubblico.' }, { status: 501 });
}
