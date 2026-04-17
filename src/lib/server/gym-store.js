import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const staticDir = path.join(process.cwd(), 'static');
const uploadsDir = path.join(staticDir, 'uploads');
const dataFilePath = path.join(dataDir, 'gyms.json');
const csvFilePath = path.join(dataDir, 'palestre.csv');
const staticCsvFilePath = path.join(staticDir, 'palestre.csv');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_WRITE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';

const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);
const hasSupabaseWrite = Boolean(SUPABASE_URL && SUPABASE_WRITE_KEY);
const RUNTIME_CACHE_KEY = '__gymfinder_runtime_gyms__';
const SUPABASE_SCHEMA_CACHE_KEY = '__gymfinder_supabase_schema_ok__';
const SUPABASE_EXPECTED_COLUMNS = [
  'id',
  'name',
  'discipline',
  'disciplines',
  'address',
  'city',
  'phone',
  'hours_info',
  'website',
  'description',
  'latitude',
  'longitude',
  'image_url',
  'weekly_hours'
];

function getRuntimeGyms() {
  const cache = globalThis[RUNTIME_CACHE_KEY];
  if (!Array.isArray(cache)) return null;
  return cache.map((gym, index) => normalizeGymRecord(gym, `runtime-${index + 1}`));
}

function setRuntimeGyms(gyms) {
  globalThis[RUNTIME_CACHE_KEY] = gyms.map((gym, index) =>
    normalizeGymRecord(gym, `runtime-${index + 1}`)
  );
}

const CSV_HEADERS = [
  'nome palestra',
  'discipline',
  'indirizzo',
  'telefono',
  'orari di apertura',
  'pagina web',
  'presentazione',
  'verificata',
  'lat',
  'long'
];

// Local mode reads from CSV/JSON files inside the repository.
// Production mode can bypass those files entirely and persist through Supabase.
async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(staticDir, { recursive: true });
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

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const COUNTRY_LABELS = new Set([
  'italia',
  'italy',
  'svizzera',
  'svizra',
  'schweiz',
  'suisse',
  'switzerland',
  'germania',
  'germany',
  'deutschland',
  'francia',
  'france',
  'frankreich',
  'austria',
  'osterreich'
]);

const EXCLUDED_LOCATION_TOKENS = new Set(['rostock']);

function isCountryLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  const chunks = raw
    .split(/[\\/|]/)
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  return chunks.length > 0 && chunks.every((chunk) => COUNTRY_LABELS.has(chunk));
}

function cleanCityLabel(value) {
  let city = String(value || '').trim().replace(/\s+/g, ' ');
  if (!city) return '';

  city = city.replace(/^\d{4,5}\s+/, '').trim();
  city = city.replace(/\s+[A-Z]{2}$/, '').trim();

  if (isCountryLabel(city)) return '';

  return city;
}

function isExcludedGymRecord(gym) {
  const haystack = [gym?.name, gym?.address, gym?.city]
    .map((value) => normalizeToken(value))
    .filter(Boolean)
    .join(' | ');

  for (const token of EXCLUDED_LOCATION_TOKENS) {
    if (haystack.includes(token)) return true;
  }

  return false;
}

function parseAddress(fullAddress) {
  const raw = String(fullAddress || '').trim();
  if (!raw) return { address: '', city: '' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const lastPart = parts.at(-1) || '';
    const hasCountrySuffix = isCountryLabel(lastPart);
    const citySource = hasCountrySuffix ? parts.at(-2) || '' : lastPart;
    const city = cleanCityLabel(citySource);
    const addressParts = parts.slice(0, hasCountrySuffix ? -2 : -1);

    return {
      address: addressParts.join(', '),
      city
    };
  }

  return { address: raw, city: '' };
}

function normalizeAddressAndCity(addressValue, cityValue) {
  const address = String(addressValue || '').trim();
  const city = String(cityValue || '').trim();
  const combined = [address, city].filter(Boolean).join(', ');

  if (combined) {
    const parsed = parseAddress(combined);
    if (parsed.address || parsed.city) return parsed;
  }

  return {
    address,
    city: cleanCityLabel(city)
  };
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

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const raw = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'si', 'sì', 'yes'].includes(raw);
}

function normalizeGymRecord(gym, fallbackId) {
  const { address, city } = normalizeAddressAndCity(gym?.address, gym?.city);
  const disciplines = Array.isArray(gym?.disciplines)
    ? gym.disciplines.map((d) => String(d).trim()).filter(Boolean)
    : disciplinesFromField(gym?.discipline);
  const weeklyHours =
    gym?.weekly_hours && typeof gym.weekly_hours === 'object' && !Array.isArray(gym.weekly_hours)
      ? gym.weekly_hours
      : {};
  const verified = typeof gym?.verified === 'boolean' ? gym.verified : toBoolean(weeklyHours._verified);

  return {
    id: String(gym?.id || fallbackId),
    name: String(gym?.name || '').trim(),
    disciplines,
    discipline: String(gym?.discipline || primaryDiscipline(disciplines)).trim() || 'Fitness',
    address,
    city,
    phone: String(gym?.phone || '').trim(),
    hours_info: String(gym?.hours_info || '').trim() || 'Orari da verificare',
    website: String(gym?.website || '').trim(),
    description: String(gym?.description || gym?.presentazione || '').trim(),
    verified,
    latitude: gym?.latitude === null || gym?.latitude === undefined ? null : toNumberOrNull(gym.latitude),
    longitude: gym?.longitude === null || gym?.longitude === undefined ? null : toNumberOrNull(gym.longitude),
    image_url: String(gym?.image_url || '').trim(),
    weekly_hours: {
      ...weeklyHours,
      _verified: verified
    }
  };
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
    description: ['presentazione', 'description', 'descrizione', 'breve presentazione'],
    verified: ['verificata', 'verified'],
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
    description: getIndex(aliases.description),
    verified: getIndex(aliases.verified),
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

    gyms.push(
      normalizeGymRecord(
        {
          id: `csv-${i}`,
          name,
          disciplines: disciplineList,
          discipline: primaryDiscipline(disciplineList),
          address,
          city,
          phone: String(read(idx.phone) || '').trim(),
          hours_info: String(read(idx.hours) || '').trim() || 'Orari da verificare',
          website: String(read(idx.website) || '').trim(),
          description: String(read(idx.description) || '').trim(),
          verified: toBoolean(read(idx.verified)),
          latitude: toNumberOrNull(read(idx.lat)),
          longitude: toNumberOrNull(read(idx.long)),
          image_url: '',
          weekly_hours: {}
        },
        `csv-${i}`
      )
    );
  }

  return gyms;
}

function gymsToCsv(gyms) {
  const rows = gyms.map((gym) => {
    const norm = normalizeGymRecord(gym, gym?.id || '');
    const disciplines = Array.isArray(norm.disciplines) && norm.disciplines.length
      ? norm.disciplines
      : disciplinesFromField(norm.discipline);

    const address = [norm.address, norm.city].filter(Boolean).join(', ');

    return [
      norm.name,
      disciplines.join(' | '),
      address,
      norm.phone,
      norm.hours_info || 'Orari da verificare',
      norm.website,
      norm.description,
      norm.verified ? 'si' : '',
      norm.latitude ?? '',
      norm.longitude ?? ''
    ];
  });

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

async function ensureSupabaseSchemaCompatible() {
  if (!hasSupabaseWrite) return;
  if (globalThis[SUPABASE_SCHEMA_CACHE_KEY] === true) return;

  for (const column of SUPABASE_EXPECTED_COLUMNS) {
    const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?select=${encodeURIComponent(column)}&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders(SUPABASE_WRITE_KEY)
    });

    if (response.ok) {
      continue;
    }

    let details = '';
    try {
      const payload = await response.json();
      details = String(payload?.message || payload?.hint || '').trim();
    } catch {
      details = '';
    }

    if (response.status === 400) {
      throw new Error(
        `Supabase schema mismatch: manca la colonna "${column}" nella tabella "${SUPABASE_GYMS_TABLE}". ${details}`.trim()
      );
    }

    if (response.status === 404) {
      throw new Error(
        `Supabase schema check failed (404). Verifica SUPABASE_URL e SUPABASE_GYMS_TABLE: il progetto si aspetta /rest/v1/${SUPABASE_GYMS_TABLE}.`
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Supabase schema check failed (${response.status}). Verifica SUPABASE_SERVICE_ROLE_KEY o i permessi della key configurata.`
      );
    }

    throw new Error(`Supabase schema check failed (${response.status}). ${details}`.trim());
  }

  globalThis[SUPABASE_SCHEMA_CACHE_KEY] = true;
}

async function readGymsFromSupabase() {
  if (!hasSupabaseRead) return null;

  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?select=*`;
  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders(SUPABASE_READ_KEY)
  });

  if (!response.ok) {
    throw new Error(`Supabase read failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((row, index) => normalizeGymRecord(row, `db-${index + 1}`));
}

async function replaceGymsInSupabase(gyms) {
  if (!hasSupabaseWrite) return;
  await ensureSupabaseSchemaCompatible();

  const base = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}`;

  const delResponse = await fetch(`${base}?id=not.is.null`, {
    method: 'DELETE',
    headers: supabaseHeaders(SUPABASE_WRITE_KEY, { Prefer: 'return=minimal' })
  });

  if (!delResponse.ok) {
    throw new Error(`Supabase delete failed (${delResponse.status})`);
  }

  const records = gyms.map((gym) => {
    const normalized = normalizeGymRecord(gym, gym?.id || '');
    const { verified, ...record } = normalized;
    record.weekly_hours = {
      ...(record.weekly_hours && typeof record.weekly_hours === 'object' ? record.weekly_hours : {}),
      _verified: verified
    };
    return record;
  });
  if (!records.length) return;

  const chunkSize = 300;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const insResponse = await fetch(base, {
      method: 'POST',
      headers: supabaseHeaders(SUPABASE_WRITE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }),
      body: JSON.stringify(chunk)
    });

    if (!insResponse.ok) {
      throw new Error(`Supabase insert failed (${insResponse.status})`);
    }
  }
}

export async function readGyms() {
  const runtimeGyms = getRuntimeGyms();
  if (runtimeGyms && runtimeGyms.length > 0) {
    return runtimeGyms;
  }

  if (hasSupabaseRead) {
    try {
      const dbGyms = await readGymsFromSupabase();
      if (Array.isArray(dbGyms) && dbGyms.length > 0) {
        return dbGyms.filter((gym) => !isExcludedGymRecord(gym));
      }
    } catch {
      // fallback below
    }
  }

  if (!isReadOnlyRuntime) {
    await ensureStorage();
  }

  for (const candidatePath of [csvFilePath, staticCsvFilePath]) {
    try {
      const csvRaw = await readFile(candidatePath, 'utf-8');
      const csvGyms = gymsFromCsv(csvRaw);
      if (csvGyms.length > 0) {
        return csvGyms.filter((gym) => !isExcludedGymRecord(gym));
      }
    } catch {
      // try next source
    }
  }

  try {
    const raw = await readFile(dataFilePath, 'utf-8');
    const gyms = JSON.parse(raw);
    return Array.isArray(gyms)
      ? gyms
          .map((gym, index) => normalizeGymRecord(gym, `json-${index + 1}`))
          .filter((gym) => !isExcludedGymRecord(gym))
      : [];
  } catch {
    return [];
  }
}

export async function writeGyms(gyms) {
  const normalized = (Array.isArray(gyms) ? gyms : []).map((gym, index) =>
    normalizeGymRecord(gym, `gym-${index + 1}`)
  );

  if (hasSupabaseWrite) {
    await replaceGymsInSupabase(normalized);
  }

  if (isReadOnlyRuntime && !hasSupabaseWrite) {
    setRuntimeGyms(normalized);
    return;
  }

  if (!isReadOnlyRuntime) {
    await ensureStorage();
    const csv = gymsToCsv(normalized);
    await writeFile(dataFilePath, JSON.stringify(normalized, null, 2), 'utf-8');
    await writeFile(csvFilePath, csv, 'utf-8');
    await writeFile(staticCsvFilePath, csv, 'utf-8');
  }
}

export function canPersistWrites() {
  return hasSupabaseWrite || !isReadOnlyRuntime;
}

export function getUploadsDir() {
  return uploadsDir;
}






