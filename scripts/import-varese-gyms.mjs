import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'gyms.json');
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const query = `
[out:json][timeout:180];
area["boundary"="administrative"]["name"="Varese"]["admin_level"="6"]->.searchArea;
(
  node(area.searchArea)["leisure"="fitness_centre"];
  way(area.searchArea)["leisure"="fitness_centre"];
  relation(area.searchArea)["leisure"="fitness_centre"];
  node(area.searchArea)["amenity"="gym"];
  way(area.searchArea)["amenity"="gym"];
  relation(area.searchArea)["amenity"="gym"];
  node(area.searchArea)["sport"="fitness"];
  way(area.searchArea)["sport"="fitness"];
  relation(area.searchArea)["sport"="fitness"];
);
out center tags;
`;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function toDiscipline(tags) {
  const sport = clean(tags.sport).toLowerCase();
  const name = clean(tags.name).toLowerCase();
  const blob = `${sport} ${name}`;

  if (blob.includes('jiu jitsu brasiliano') || blob.includes('brazilian jiu jitsu') || blob.includes('bjj')) return 'JiuJitsu Brasiliano';
  if (blob.includes('jiu jitsu') || blob.includes('jiujitsu') || blob.includes('jiu-jitsu')) return 'JiuJitsu';
  if (blob.includes('muay thai')) return 'Muay Thai';
  if (blob.includes('k1') || blob.includes('k-1')) return 'K1';
  if (blob.includes('kickboxe') || blob.includes('kick boxing') || blob.includes('kickboxing')) return 'Kickboxe';
  if (blob.includes('mma') || blob.includes('mixed martial arts') || sport.includes('martial_arts')) return 'MMA';
  if (blob.includes('judo') || sport.includes('judo')) return 'Judo';
  if (blob.includes('karate') || sport.includes('karate')) return 'Karate';
  if (blob.includes('boxe') || blob.includes('boxing') || blob.includes('pugilato') || sport.includes('boxing')) return 'Boxe';
  if (blob.includes('crossfit')) return 'CrossFit';
  if (blob.includes('pilates')) return 'Pilates';
  if (blob.includes('yoga')) return 'Yoga';
  if (blob.includes('nuoto') || blob.includes('swim') || sport.includes('swimming')) return 'Nuoto';
  if (blob.includes('calisthenics') || sport.includes('calisthenics')) return 'Calisthenics';
  if (blob.includes('functional') || sport.includes('fitness')) return 'Functional';
  if (blob.includes('bodybuilding') || blob.includes('pesi')) return 'Bodybuilding';
  return 'Fitness';
}

function toAddress(tags) {
  const street = clean(tags['addr:street']);
  const number = clean(tags['addr:housenumber']);
  const suburb = clean(tags['addr:suburb']);

  if (street && number) return `${street} ${number}`;
  if (street) return street;
  if (suburb) return suburb;
  return 'Indirizzo non disponibile';
}

function toCity(tags) {
  const city = clean(tags['addr:city']);
  const town = clean(tags['addr:town']);
  const village = clean(tags['addr:village']);
  const municipality = clean(tags['is_in:city']);
  return city || town || village || municipality || 'Provincia di Varese';
}

function toHours(tags) {
  const oh = clean(tags.opening_hours);
  return oh || 'Orari da verificare';
}

function toPhone(tags) {
  return clean(tags.phone || tags['contact:phone']);
}

function toWebsite(tags) {
  return clean(tags.website || tags['contact:website']);
}

function toEmail(tags) {
  return clean(tags.email || tags['contact:email']);
}

function elementCoords(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
    return { latitude: el.lat, longitude: el.lon };
  }
  if (el.center && Number.isFinite(el.center.lat) && Number.isFinite(el.center.lon)) {
    return { latitude: el.center.lat, longitude: el.center.lon };
  }
  return { latitude: null, longitude: null };
}

async function fetchOverpass() {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query
      });

      if (!response.ok) {
        if (response.status === 429) {
          continue;
        }
        throw new Error(`Overpass error ${response.status} on ${endpoint}`);
      }

      const data = await response.json();
      return data;
    } catch {
      continue;
    }
  }

  throw new Error('Nessun endpoint Overpass disponibile al momento (rate-limit o rete).');
}

async function run() {
  const existingRaw = await readFile(DATA_PATH, 'utf-8');
  const existing = JSON.parse(existingRaw);

  const existingKeys = new Set(
    existing.map((g) => `${normalizeKey(g.name)}|${normalizeKey(g.city)}`)
  );

  const data = await fetchOverpass();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const imported = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = clean(tags.name);
    if (!name) continue;

    const city = toCity(tags);
    const key = `${normalizeKey(name)}|${normalizeKey(city)}`;
    if (existingKeys.has(key)) continue;

    const coords = elementCoords(el);

    imported.push({
      id: randomUUID(),
      name,
      discipline: toDiscipline(tags),
      address: toAddress(tags),
      city,
      hours_info: toHours(tags),
      phone: toPhone(tags),
      email: toEmail(tags),
      website: toWebsite(tags),
      image_url: '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      weekly_hours: {},
      source: 'openstreetmap',
      created_at: new Date().toISOString()
    });

    existingKeys.add(key);
  }

  const merged = [...existing, ...imported];

  await writeFile(DATA_PATH, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(`Import completato. Nuove palestre: ${imported.length}. Totale: ${merged.length}.`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

