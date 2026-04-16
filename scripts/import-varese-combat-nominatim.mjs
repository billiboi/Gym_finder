import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'gyms.json');
const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

const DISCIPLINE_QUERIES = [
  { q: 'palestra boxe Varese', discipline: 'Boxe' },
  { q: 'judo Varese', discipline: 'Judo' },
  { q: 'jiu jitsu Varese', discipline: 'Jujitsu' },
  { q: 'brazilian jiu jitsu Varese', discipline: 'Jujitsu Brasiliano' },
  { q: 'karate Varese', discipline: 'Karate' },
  { q: 'kickboxing Varese', discipline: 'Kickboxe' },
  { q: 'muay thai Varese', discipline: 'Muay Thai' },
  { q: 'k1 Varese palestra', discipline: 'K1' },
  { q: 'mma Varese palestra', discipline: 'MMA' }
];

const VIEWBOX = '8.45,46.05,8.99,45.53';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(v) {
  return clean(v).toLowerCase().replace(/\s+/g, ' ');
}

function extractName(item) {
  const named = clean(item.name || item.display_name?.split(',')[0]);
  return named || 'Palestra';
}

function extractCity(displayName) {
  const parts = clean(displayName).split(',').map((x) => x.trim());
  const inVarese = parts.find((p) => p.toLowerCase() === 'varese');
  if (inVarese) return 'Varese';

  const cityCandidate = parts.find((p) => /gallarate|busto arsizio|saronno|varese|tradate|luino|malnate|somma lombardo/i.test(p));
  if (cityCandidate) return cityCandidate;

  return 'Provincia di Varese';
}

async function search(query) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'it');
  url.searchParams.set('limit', '30');
  url.searchParams.set('viewbox', VIEWBOX);
  url.searchParams.set('bounded', '1');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GymFinderCombatImporter/1.0 (contact: vdauria94@gmail.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim error ${response.status}`);
  }

  return await response.json();
}

async function run() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  const existing = JSON.parse(raw);

  const keys = new Set(existing.map((g) => `${normalizeKey(g.name)}|${normalizeKey(g.city)}`));
  const imported = [];

  for (const entry of DISCIPLINE_QUERIES) {
    const items = await search(entry.q);

    for (const item of items) {
      const name = extractName(item);
      const city = extractCity(item.display_name || '');
      const key = `${normalizeKey(name)}|${normalizeKey(city)}`;
      if (keys.has(key)) continue;

      imported.push({
        id: randomUUID(),
        name,
        discipline: entry.discipline,
        address: clean(item.display_name || 'Indirizzo non disponibile'),
        city,
        hours_info: 'Orari da verificare',
        phone: '',
        email: '',
        website: '',
        image_url: '',
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        weekly_hours: {},
        source: 'nominatim-combat',
        created_at: new Date().toISOString()
      });

      keys.add(key);
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  const merged = [...existing, ...imported];
  await writeFile(DATA_PATH, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(`Import mirato combat (Nominatim) completato. Nuovi record: ${imported.length}. Totale: ${merged.length}.`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
