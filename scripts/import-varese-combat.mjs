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
area["boundary"="administrative"]["name"="Varese"]["admin_level"="6"]->.a;
(
  node(area.a)["sport"~"boxing|judo|jiu_jitsu|brazilian_jiu_jitsu|karate|kickboxing|muay_thai|martial_arts|mma|mixed_martial_arts|taekwondo",i];
  way(area.a)["sport"~"boxing|judo|jiu_jitsu|brazilian_jiu_jitsu|karate|kickboxing|muay_thai|martial_arts|mma|mixed_martial_arts|taekwondo",i];
  relation(area.a)["sport"~"boxing|judo|jiu_jitsu|brazilian_jiu_jitsu|karate|kickboxing|muay_thai|martial_arts|mma|mixed_martial_arts|taekwondo",i];

  node(area.a)["club"="sport"]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];
  way(area.a)["club"="sport"]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];
  relation(area.a)["club"="sport"]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];

  node(area.a)["leisure"~"sports_centre|fitness_centre",i]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];
  way(area.a)["leisure"~"sports_centre|fitness_centre",i]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];
  relation(area.a)["leisure"~"sports_centre|fitness_centre",i]["name"~"box|kick|muay|dojo|judo|karate|jiu|mma|k1",i];
);
out center tags;
`;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value);
}

function toDiscipline(tags) {
  const sport = normalizeText(tags.sport);
  const name = normalizeText(tags.name);
  const blob = `${sport} ${name}`;

  if (blob.includes('brazilian jiu jitsu') || blob.includes('jiu jitsu brasiliano') || blob.includes('bjj')) return 'JiuJitsu Brasiliano';
  if (blob.includes('jiu jitsu') || blob.includes('jiujitsu')) return 'JiuJitsu';
  if (blob.includes('muay thai')) return 'Muay Thai';
  if (blob.includes('k1') || blob.includes('k 1') || blob.includes('k-1')) return 'K1';
  if (blob.includes('kickboxing') || blob.includes('kick box') || blob.includes('kickboxe')) return 'Kickboxe';
  if (blob.includes('mma') || blob.includes('mixed martial arts')) return 'MMA';
  if (blob.includes('judo')) return 'Judo';
  if (blob.includes('karate')) return 'Karate';
  if (blob.includes('boxing') || blob.includes('boxe') || blob.includes('pugilato')) return 'Boxe';
  if (blob.includes('taekwondo')) return 'Taekwondo';
  return 'MMA';
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
  return clean(tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['is_in:city'] || 'Provincia di Varese');
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) continue;
        throw new Error(`Overpass error ${response.status} on ${endpoint}`);
      }

      return await response.json();
    } catch {
      continue;
    }
  }

  throw new Error('Nessun endpoint Overpass disponibile per import mirato combat.');
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
      hours_info: clean(tags.opening_hours) || 'Orari da verificare',
      phone: clean(tags.phone || tags['contact:phone']),
      email: clean(tags.email || tags['contact:email']),
      website: clean(tags.website || tags['contact:website']),
      image_url: '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      weekly_hours: {},
      source: 'openstreetmap-combat',
      created_at: new Date().toISOString()
    });

    existingKeys.add(key);
  }

  const merged = [...existing, ...imported];
  await writeFile(DATA_PATH, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(`Import combat completato. Nuove palestre: ${imported.length}. Totale: ${merged.length}.`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

