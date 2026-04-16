import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'gyms.json');
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

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

function classifyDiscipline(record) {
  const blob = normalizeText([
    record.discipline,
    record.name,
    record.address,
    record.website,
    record.email,
    record.hours_info
  ].join(' '));

  const rules = [
    { label: 'Jujitsu Brasiliano', patterns: ['jiu jitsu brasiliano', 'brazilian jiu jitsu', 'brazilian jiu-jitsu', 'bjj'] },
    { label: 'Jujitsu', patterns: ['jiu jitsu', 'jiu-jitsu', 'jiujitsu'] },
    { label: 'Muay Thai', patterns: ['muay thai'] },
    { label: 'K1', patterns: [' k1 ', ' k 1 ', 'k-1', 'k1 rules'] },
    { label: 'Kickboxe', patterns: ['kickboxe', 'kick boxing', 'kickboxing'] },
    { label: 'MMA', patterns: [' mma ', 'mixed martial arts', 'arti marziali miste'] },
    { label: 'Judo', patterns: [' judo '] },
    { label: 'Karate', patterns: [' karate '] },
    { label: 'Boxe', patterns: [' boxe ', 'boxing', 'pugilato'] },
    { label: 'Taekwondo', patterns: ['taekwondo'] },
    { label: 'CrossFit', patterns: ['crossfit'] },
    { label: 'Pilates', patterns: ['pilates'] },
    { label: 'Yoga', patterns: [' yoga '] },
    { label: 'Calisthenics', patterns: ['calisthenics', 'street workout'] },
    { label: 'Nuoto', patterns: ['nuoto', 'swim', 'swimming', 'piscina'] },
    { label: 'Bodybuilding', patterns: ['bodybuilding', 'sollevamento pesi', 'weightlifting'] },
    { label: 'Functional', patterns: ['functional', 'fitness funzionale'] }
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => blob.includes(p))) {
      return rule.label;
    }
  }

  return 'Fitness';
}

function keyBy(record) {
  const name = normalizeText(record.name);
  const city = normalizeText(record.city);
  const lat = Number.isFinite(Number(record.latitude)) ? Number(record.latitude).toFixed(4) : 'na';
  const lng = Number.isFinite(Number(record.longitude)) ? Number(record.longitude).toFixed(4) : 'na';
  return `${name}|${city}|${lat}|${lng}`;
}

function titleCaseCity(city) {
  return clean(city)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function reverseGeocode(lat, lon) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GymFinderDataCleaner/1.0 (contact: vdauria94@gmail.com)'
    }
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  const a = json.address || {};

  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  const road = a.road || a.pedestrian || a.footway || '';
  const houseNumber = a.house_number || '';
  const address = clean([road, houseNumber].join(' '));

  return {
    city: city ? titleCaseCity(city) : '',
    address: address || ''
  };
}

async function run() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  const gyms = JSON.parse(raw);

  const cleaned = [];
  const seen = new Set();
  let fixedCity = 0;
  let fixedAddress = 0;
  let reclassified = 0;
  let deduped = 0;

  for (const gym of gyms) {
    const item = {
      ...gym,
      name: clean(gym.name),
      city: clean(gym.city),
      address: clean(gym.address),
      phone: clean(gym.phone),
      email: clean(gym.email),
      website: clean(gym.website),
      image_url: clean(gym.image_url),
      hours_info: clean(gym.hours_info) || 'Orari da verificare'
    };

    const hasCoords = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
    const genericCity = !item.city || normalizeText(item.city) === 'provincia di varese';
    const genericAddress = !item.address || normalizeText(item.address) === 'indirizzo non disponibile';

    if (hasCoords && (genericCity || genericAddress)) {
      const geo = await reverseGeocode(Number(item.latitude), Number(item.longitude));
      if (geo) {
        if (genericCity && geo.city) {
          item.city = geo.city;
          fixedCity += 1;
        }
        if (genericAddress && geo.address) {
          item.address = geo.address;
          fixedAddress += 1;
        }
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    const newDiscipline = classifyDiscipline(item);
    if (newDiscipline !== item.discipline) {
      item.discipline = newDiscipline;
      reclassified += 1;
    }

    const key = keyBy(item);
    if (seen.has(key)) {
      deduped += 1;
      continue;
    }

    seen.add(key);
    cleaned.push(item);
  }

  cleaned.sort((a, b) => {
    const cityCmp = titleCaseCity(a.city).localeCompare(titleCaseCity(b.city), 'it');
    if (cityCmp !== 0) return cityCmp;
    return a.name.localeCompare(b.name, 'it');
  });

  await writeFile(DATA_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');

  console.log(`Pulizia completata.`);
  console.log(`- Totale finale: ${cleaned.length}`);
  console.log(`- Record deduplicati rimossi: ${deduped}`);
  console.log(`- Citta' migliorate: ${fixedCity}`);
  console.log(`- Indirizzi migliorati: ${fixedAddress}`);
  console.log(`- Discipline riclassificate: ${reclassified}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
