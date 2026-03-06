import { json } from '@sveltejs/kit';

function splitCsvLine(line, delimiter = ',') {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseAddress(fullAddress) {
  const raw = String(fullAddress || '').trim();
  if (!raw) return { address: '', city: '' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      address: parts.slice(0, -1).join(', '),
      city: parts[parts.length - 1] || ''
    };
  }

  return { address: raw, city: '' };
}

function disciplinesFromField(value) {
  return String(value || '')
    .split('|')
    .map((d) => d.trim())
    .filter(Boolean);
}

function toNumberOrNull(value) {
  const n = Number(String(value || '').trim());
  return Number.isFinite(n) ? n : null;
}

function parseCsvToGyms(csvText) {
  const lines = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const commaCount = splitCsvLine(headerLine, ',').length;
  const semicolonCount = splitCsvLine(headerLine, ';').length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const header = splitCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());
  const indexBy = Object.fromEntries(header.map((h, idx) => [h, idx]));

  const aliases = {
    name: ['nome palestra', 'name', 'gym name'],
    disciplines: ['discipline', 'martial arts', 'tipologia'],
    address: ['indirizzo', 'address', 'luogo'],
    phone: ['telefono', 'phone'],
    hours: ['orari di apertura', 'open_hours', 'opening hours', 'orari'],
    website: ['pagina web', 'website', 'url', 'sito'],
    lat: ['lat', 'latitude'],
    long: ['long', 'lng', 'longitude']
  };

  const getIndex = (keys) => keys.find((key) => key in indexBy) ? indexBy[keys.find((key) => key in indexBy)] : -1;

  const idx = {
    name: getIndex(aliases.name),
    disciplines: getIndex(aliases.disciplines),
    address: getIndex(aliases.address),
    phone: getIndex(aliases.phone),
    hours: getIndex(aliases.hours),
    website: getIndex(aliases.website),
    lat: getIndex(aliases.lat),
    long: getIndex(aliases.long)
  };

  if (idx.name < 0) return [];

  const gyms = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i], delimiter);
    const read = (columnIndex) => (columnIndex >= 0 ? cols[columnIndex] ?? '' : '');

    const name = String(read(idx.name)).trim();
    if (!name) continue;

    const disciplineList = disciplinesFromField(read(idx.disciplines));
    const { address, city } = parseAddress(read(idx.address));

    gyms.push({
      id: `csv-${i}`,
      name,
      disciplines: disciplineList,
      discipline: disciplineList[0] || 'Fitness',
      address,
      city,
      phone: String(read(idx.phone) || '').trim(),
      hours_info: String(read(idx.hours) || '').trim() || 'Orari da verificare',
      website: String(read(idx.website) || '').trim(),
      latitude: toNumberOrNull(read(idx.lat)),
      longitude: toNumberOrNull(read(idx.long)),
      image_url: '',
      weekly_hours: {}
    });
  }

  return gyms;
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
    out = out.filter((gym) => disciplinesFromField(gym.discipline).map((d) => d.toLowerCase()).includes(discipline.toLowerCase()));
  }

  if (q) {
    const query = q.toLowerCase();
    out = out.filter((gym) => {
      return [gym.name, gym.address, gym.city, gym.disciplines.join(' | ')].some((field) =>
        String(field || '').toLowerCase().includes(query)
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

export async function GET({ url, fetch }) {
  try {
    const q = clean(url.searchParams.get('q'));
    const discipline = clean(url.searchParams.get('discipline'));
    const userLat = parseQueryNumber(url.searchParams.get('lat'));
    const userLng = parseQueryNumber(url.searchParams.get('lng'));
    const radiusKm = parseQueryNumber(url.searchParams.get('radius_km'));

    const csvResponse = await fetch('/palestre.csv');
    if (!csvResponse.ok) return json([]);

    const csvText = await csvResponse.text();
    const gyms = parseCsvToGyms(csvText);
    return json(filterGyms(gyms, { q, discipline, userLat, userLng, radiusKm }));
  } catch {
    return json([]);
  }
}

export async function POST() {
  return json({ error: 'Modifica dati non disponibile in deploy pubblico.' }, { status: 501 });
}