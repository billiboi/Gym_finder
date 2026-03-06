import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const JSON_PATH = path.join(process.cwd(), 'data', 'gyms.json');
const CSV_PATH = path.join(process.cwd(), 'data', 'palestre.csv');

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function getDisciplines(gym) {
  if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
    return gym.disciplines.map((d) => clean(d)).filter(Boolean);
  }

  const raw = clean(gym.discipline);
  if (!raw) return [];

  return raw
    .split('|')
    .map((d) => clean(d))
    .filter(Boolean);
}

async function run() {
  const raw = await readFile(JSON_PATH, 'utf-8');
  const gyms = JSON.parse(raw);

  const header = [
    'nome palestra',
    'discipline',
    'indirizzo',
    'telefono',
    'orari di apertura',
    'pagina web',
    'lat',
    'long'
  ];

  const rows = gyms.map((gym) => {
    const disciplines = getDisciplines(gym).join(' | ');
    return [
      gym.name || '',
      disciplines,
      `${clean(gym.address)}${gym.city ? `, ${clean(gym.city)}` : ''}`,
      gym.phone || '',
      gym.hours_info || '',
      gym.website || '',
      gym.latitude ?? '',
      gym.longitude ?? ''
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  await writeFile(CSV_PATH, csv, 'utf-8');

  console.log(`CSV creato: ${CSV_PATH}`);
  console.log(`Record esportati: ${rows.length}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
