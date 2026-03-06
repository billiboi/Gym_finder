import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const uploadsDir = path.join(process.cwd(), 'static', 'uploads');
const dataFilePath = path.join(dataDir, 'gyms.json');
const csvFilePath = path.join(dataDir, 'palestre.csv');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const CSV_HEADERS = [
  'nome palestra',
  'discipline',
  'indirizzo',
  'telefono',
  'orari di apertura',
  'pagina web',
  'lat',
  'long'
];

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadsDir, { recursive: true });

  try {
    await readFile(dataFilePath, 'utf-8');
  } catch {
    await writeFile(dataFilePath, '[]', 'utf-8');
  }
}

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

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseAddress(fullAddress) {
  const raw = String(fullAddress || '').trim();
  if (!raw) return { address: '', city: '' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      address: parts.slice(0, -1).join(', '),
      city: parts.at(-1) || ''
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

function primaryDiscipline(list) {
  return list[0] || 'Fitness';
}

function toNumberOrNull(value) {
  const n = Number(String(value || '').trim());
  return Number.isFinite(n) ? n : null;
}

function gymsFromCsv(csvText) {
  const lines = csvText
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

  function getIndex(keys) {
    for (const key of keys) {
      if (key in indexBy) return indexBy[key];
    }
    return -1;
  }

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
      discipline: primaryDiscipline(disciplineList),
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

function gymsToCsv(gyms) {
  const rows = gyms.map((gym) => {
    const disciplines = Array.isArray(gym.disciplines)
      ? gym.disciplines.filter(Boolean)
      : String(gym.discipline || '')
          .split('|')
          .map((d) => d.trim())
          .filter(Boolean);

    const address = [gym.address, gym.city].filter(Boolean).join(', ');

    return [
      gym.name || '',
      disciplines.join(' | '),
      address,
      gym.phone || '',
      gym.hours_info || 'Orari da verificare',
      gym.website || '',
      gym.latitude ?? '',
      gym.longitude ?? ''
    ];
  });

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function readGyms() {
  if (!isReadOnlyRuntime) {
    await ensureStorage();
  }

  try {
    const csvRaw = await readFile(csvFilePath, 'utf-8');
    const csvGyms = gymsFromCsv(csvRaw);
    if (csvGyms.length > 0) {
      return csvGyms;
    }
  } catch {
    // fallback to json
  }

  try {
    const raw = await readFile(dataFilePath, 'utf-8');
    const gyms = JSON.parse(raw);
    return Array.isArray(gyms) ? gyms : [];
  } catch {
    return [];
  }
}

export async function writeGyms(gyms) {
  if (isReadOnlyRuntime) {
    throw new Error('Scrittura non supportata in ambiente di deploy (filesystem read-only).');
  }

  await ensureStorage();
  await writeFile(dataFilePath, JSON.stringify(gyms, null, 2), 'utf-8');
  await writeFile(csvFilePath, gymsToCsv(gyms), 'utf-8');
}

export function getUploadsDir() {
  return uploadsDir;
}
