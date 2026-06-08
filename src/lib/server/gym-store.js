import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GYM_SUPABASE_COLUMN_CANDIDATES, gymToSupabaseRecord, normalizeGym } from '$lib/gym-normalizer';
import { repairMojibake } from '$lib/text-repair';
import { isArchivedGym } from '$lib/admin/gyms';

const dataDir = path.join(process.cwd(), 'data');
const staticDir = path.join(process.cwd(), 'static');
const uploadsDir = path.join(staticDir, 'uploads');
const dataFilePath = path.join(dataDir, 'gyms.json');
const csvFilePath = path.join(dataDir, 'palestre.csv');
const staticCsvFilePath = path.join(staticDir, 'palestre.csv');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';
const SUPABASE_WRITE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';

const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);
const hasSupabaseWrite = Boolean(SUPABASE_URL && SUPABASE_WRITE_KEY);
const isDevelopment = process.env.NODE_ENV === 'development';
const RUNTIME_CACHE_KEY = '__gymfinder_runtime_gyms__';
const SUPABASE_SCHEMA_CACHE_KEY = '__gymfinder_supabase_columns__';
const PUBLIC_STATIC_CSV_CACHE_KEY = '__gymfinder_public_static_csv_gyms__';
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.palestreinzona.it').replace(/\/$/, '');
const PUBLIC_GYM_LISTING_COLUMNS = [
  'id',
  'slug',
  'name',
  'nome',
  'city',
  'citta',
  'address',
  'indirizzo',
  'discipline',
  'disciplines',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'is_verified',
  'is_premium',
  'priority_score',
  'deleted_at',
  'updated_at',
  'hours_info',
  'orari',
  'phone',
  'telefono',
  'website',
  'sito',
  'image_url'
];
const ADMIN_CLAIM_APPROVAL_GYM_COLUMNS = [
  'id',
  'slug',
  'name',
  'nome',
  'city',
  'citta',
  'address',
  'indirizzo',
  'discipline',
  'disciplines',
  'is_verified',
  'data_verified_at',
  'weekly_hours',
  'deleted_at'
];
const ADMIN_GYM_LIST_COLUMNS = [
  'id',
  'slug',
  'nome',
  'name',
  'citta',
  'city',
  'indirizzo',
  'address',
  'telefono',
  'phone',
  'sito',
  'website',
  'discipline',
  'disciplines',
  'orari',
  'hours_info',
  'is_verified',
  'is_premium',
  'priority_score',
  'deleted_at',
  'updated_at',
  'data_quality_score',
  'enrichment_status',
  'needs_review',
  'review_reason'
];
const ADMIN_GYM_DETAIL_COLUMNS = [
  ...ADMIN_GYM_LIST_COLUMNS,
  'lat',
  'lng',
  'latitude',
  'longitude',
  'descrizione',
  'description',
  'image_url',
  'weekly_hours',
  'discipline_aliases',
  'discipline_canonical_slugs',
  'data_verified_at',
  'descrizione_owner',
  'descrizione_editoriale',
  'descrizione_generata',
  'descrizione_pubblica',
  'descrizione_source',
  'descrizione_quality_score',
  'descrizione_needs_review',
  'data_quality_flags',
  'last_data_audit_at',
  'safe_public_description',
  'official_source_url',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'price_info',
  'price_source_url',
  'price_updated_at',
  'verified_commercial_info',
  'commercial_info_last_checked_at',
  'source_url',
  'enrichment_notes',
  'enrichment_updated_at',
  'social_links'
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

function clearRuntimeGyms() {
  delete globalThis[RUNTIME_CACHE_KEY];
}

async function readPublicStaticCsvGyms() {
  const cached = globalThis[PUBLIC_STATIC_CSV_CACHE_KEY];
  if (Array.isArray(cached)) return cached;

  try {
    const response = await fetch(`${PUBLIC_SITE_URL}/palestre.csv`, { method: 'GET' });
    if (!response.ok) return [];

    const csvRaw = await response.text();
    const gyms = gymsFromCsv(csvRaw);
    globalThis[PUBLIC_STATIC_CSV_CACHE_KEY] = withCanonicalGymSlugs(
      gyms.filter((gym) => isPublicActiveGym(gym) && !isExcludedGymRecord(gym))
    );
    return globalThis[PUBLIC_STATIC_CSV_CACHE_KEY];
  } catch {
    return [];
  }
}

function normalizeForClaimMatch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function extractGymSlugFromUrl(gymUrl) {
  const raw = String(gymUrl || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw, 'https://www.palestreinzona.it');
    const parts = url.pathname.split('/').filter(Boolean);
    const palestreIndex = parts.indexOf('palestre');
    return palestreIndex >= 0 ? parts[palestreIndex + 1] || '' : '';
  } catch {
    const path = raw.split('?')[0].split('#')[0];
    const parts = path.split('/').filter(Boolean);
    const palestreIndex = parts.indexOf('palestre');
    return palestreIndex >= 0 ? parts[palestreIndex + 1] || '' : '';
  }
}

function extractLegacyGymIdFromSlug(slug) {
  const raw = String(slug || '').trim();
  if (!raw) return '';

  const uuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (uuid) return uuid[0];

  const trailingToken = raw.match(/-([a-z0-9][a-z0-9_-]{2,})$/i)?.[1] || '';
  return /\d/.test(trailingToken) ? trailingToken : '';
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
  return repairMojibake(value)
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
  const raw = repairMojibake(value).trim();
  if (!raw) return false;

  const chunks = raw
    .split(/[\\/|]/)
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  return chunks.length > 0 && chunks.every((chunk) => COUNTRY_LABELS.has(chunk));
}

function cleanCityLabel(value) {
  let city = repairMojibake(value).trim().replace(/\s+/g, ' ');
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

export function isPublicActiveGym(gym) {
  if (!gym || typeof gym !== 'object') return false;
  if (isArchivedGym(gym)) return false;
  if (gym.deletedAt) return false;
  if (gym.archived === true || gym.is_archived === true) return false;
  const archived = String(gym.archived || '').trim().toLowerCase();
  const isArchived = String(gym.is_archived || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sì'].includes(archived)) return false;
  if (['true', '1', 'yes', 'si', 'sì'].includes(isArchived)) return false;
  return true;
}

function parseAddress(fullAddress) {
  const raw = repairMojibake(fullAddress).trim();
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
  const address = repairMojibake(addressValue).trim();
  const city = repairMojibake(cityValue).trim();
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
  return repairMojibake(value)
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
  const raw = repairMojibake(value).trim().toLowerCase();
  return ['1', 'true', 'si', 's\u00EC', 'yes'].includes(raw);
}

function normalizeGymRecord(gym, fallbackId) {
  const { address, city } = normalizeAddressAndCity(gym?.indirizzo || gym?.address, gym?.citta || gym?.city);
  const disciplineListSource =
    Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : gym?.discipline;
  const disciplines = Array.isArray(disciplineListSource)
    ? disciplineListSource.map((d) => repairMojibake(d).trim()).filter(Boolean)
    : disciplinesFromField(disciplineListSource);
  const weeklyHours =
    gym?.weekly_hours && typeof gym.weekly_hours === 'object' && !Array.isArray(gym.weekly_hours)
      ? gym.weekly_hours
      : {};
  const verified = typeof gym?.verified === 'boolean' ? gym.verified : toBoolean(weeklyHours._verified);

  return normalizeGym(
    {
      ...gym,
      id: String(gym?.id || fallbackId),
      name: repairMojibake(gym?.nome || gym?.name).trim(),
    disciplines,
    discipline: primaryDiscipline(disciplines),
    address,
    city,
      phone: repairMojibake(gym?.telefono || gym?.phone).trim(),
      hours_info: repairMojibake(gym?.orari || gym?.hours_info).trim() || 'Orari da verificare',
      website: String(gym?.sito || gym?.website || '').trim(),
      description: repairMojibake(gym?.descrizione || gym?.description || gym?.presentazione).trim(),
    verified,
      latitude: gym?.lat ?? gym?.latitude,
      longitude: gym?.lng ?? gym?.longitude,
    image_url: String(gym?.image_url || gym?.weekly_hours?._image_url || '').trim(),
    official_source_url: String(gym?.official_source_url || '').trim(),
    editorial_summary: repairMojibake(gym?.editorial_summary || '').trim(),
    editorial_highlights: Array.isArray(gym?.editorial_highlights) ? gym.editorial_highlights : [],
    editorial_faq_items: Array.isArray(gym?.editorial_faq_items) ? gym.editorial_faq_items : [],
    price_info: repairMojibake(gym?.price_info || '').trim(),
    price_source_url: String(gym?.price_source_url || '').trim(),
    price_updated_at: String(gym?.price_updated_at || '').trim(),
    verified_commercial_info: gym?.verified_commercial_info,
    commercial_info_last_checked_at: String(gym?.commercial_info_last_checked_at || '').trim(),
    source_url: String(gym?.source_url || '').trim(),
    enrichment_status: repairMojibake(gym?.enrichment_status || 'pending').trim() || 'pending',
    enrichment_notes: repairMojibake(gym?.enrichment_notes || '').trim(),
    enrichment_updated_at: String(gym?.enrichment_updated_at || '').trim(),
    weekly_hours: {
      ...weeklyHours,
      _verified: verified
    }
    },
    fallbackId
  );
}

function slugPart(value) {
  return (
    repairMojibake(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || ''
  );
}

function baseGymSlug(gym) {
  return slugPart(gym?.name || gym?.nome) || 'palestra';
}

function citySlugForGym(gym) {
  return slugPart(gym?.city || gym?.citta);
}

function streetSlugForGym(gym) {
  return slugPart(String(gym?.address || gym?.indirizzo || '').split(',')[0]);
}

function joinSlugParts(parts) {
  return parts.filter(Boolean).join('-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '') || 'palestra';
}

function canonicalSlugCandidates(gym, base, duplicateGroup) {
  if (!duplicateGroup) return [base];

  const city = citySlugForGym(gym);
  const street = streetSlugForGym(gym);
  const cityPart = city && !base.includes(city) ? city : '';

  return [
    joinSlugParts([base, cityPart]),
    joinSlugParts([base, cityPart, street]),
    joinSlugParts([base, street])
  ].filter((value, index, list) => value && list.indexOf(value) === index);
}

function withCanonicalGymSlugs(gyms) {
  const normalized = gyms.map((gym) => ({ ...gym }));
  const groups = new Map();

  for (const gym of normalized) {
    const base = baseGymSlug(gym);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(gym);
  }

  const used = new Set();

  for (const [base, group] of groups) {
    const duplicateGroup = group.length > 1;

    group.forEach((gym, index) => {
      const candidates = canonicalSlugCandidates(gym, base, duplicateGroup);
      let slug = candidates.find((candidate) => !used.has(candidate));

      if (!slug) {
        const fallbackBase = candidates[candidates.length - 1] || base;
        let suffix = index + 1;
        do {
          slug = `${fallbackBase}-${suffix}`;
          suffix += 1;
        } while (used.has(slug));
      }

      used.add(slug);
      gym._canonical_slug = slug;
      gym._legacy_slug = gym?.id ? `${base}-${String(gym.id).trim()}` : base;
    });
  }

  return normalized;
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

async function supabaseAvailableColumns() {
  const cached = globalThis[SUPABASE_SCHEMA_CACHE_KEY];
  if (Array.isArray(cached) && cached.length) return cached;

  const schemaKey = SUPABASE_WRITE_KEY || SUPABASE_READ_KEY;
  if (!schemaKey) return [];

  const available = [];
  for (const column of GYM_SUPABASE_COLUMN_CANDIDATES) {
    const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?select=${encodeURIComponent(column)}&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders(schemaKey)
    });

    if (response.ok) {
      available.push(column);
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
      continue;
    }

    if (response.status === 404) {
      throw new Error(
        `Supabase schema check failed (404). Verifica SUPABASE_URL e SUPABASE_GYMS_TABLE: il progetto si aspetta /rest/v1/${SUPABASE_GYMS_TABLE}.`
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Supabase schema check failed (${response.status}). Verifica SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY o i permessi della key configurata.`
      );
    }

    throw new Error(`Supabase schema check failed (${response.status}). ${details}`.trim());
  }

  const hasId = available.includes('id');
  const hasName = available.includes('nome') || available.includes('name');
  if (!hasId || !hasName) {
    throw new Error(
      `Supabase schema mismatch: la tabella "${SUPABASE_GYMS_TABLE}" deve esporre almeno id e nome/name. Colonne rilevate: ${available.join(', ')}`
    );
  }

  globalThis[SUPABASE_SCHEMA_CACHE_KEY] = available;
  return available;
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

function boundedNumber(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function uniqueAvailableColumns(columns, available) {
  const allowed = new Set(available);
  return [...new Set(columns)].filter((column) => allowed.has(column));
}

function activeGymQueryParams({ q = '', discipline = '', availableColumns = [] } = {}) {
  const filters = [];
  const available = new Set(availableColumns);

  if (available.has('deleted_at')) {
    filters.push('deleted_at=is.null');
  }

  const query = String(q || '').trim();
  if (query) {
    const like = `*${query.replace(/[%*,()]/g, ' ').replace(/\s+/g, ' ').trim()}*`;
    if (like !== '**') {
      const encoded = encodeURIComponent(like);
      const searchColumns = ['nome', 'name', 'citta', 'city', 'indirizzo', 'address', 'discipline']
        .filter((column) => available.has(column));
      if (searchColumns.length) {
        filters.push(`or=(${searchColumns.map((column) => `${column}.ilike.${encoded}`).join(',')})`);
      }
    }
  }

  const disciplineFilter = String(discipline || '').trim();
  if (disciplineFilter && available.has('discipline')) {
    const encoded = encodeURIComponent(`*${disciplineFilter.replace(/[%*,()]/g, ' ').replace(/\s+/g, ' ').trim()}*`);
    filters.push(`discipline=ilike.${encoded}`);
  }

  return filters;
}

async function readPublicGymListingFromSupabase({ limit = 24, offset = 0, q = '', discipline = '' } = {}) {
  if (!hasSupabaseRead) return null;

  const safeLimit = boundedNumber(limit, 24, { min: 1, max: 100 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const availableColumns = await supabaseAvailableColumns();
  const available = new Set(availableColumns);
  const select = uniqueAvailableColumns(PUBLIC_GYM_LISTING_COLUMNS, availableColumns).join(',');
  const order = [
    available.has('priority_score') ? 'priority_score.desc.nullslast' : null,
    available.has('nome') ? 'nome.asc.nullslast' : available.has('name') ? 'name.asc.nullslast' : null
  ].filter(Boolean).join(',');
  const params = [
    `select=${encodeURIComponent(select)}`,
    order ? `order=${order}` : null,
    `limit=${safeLimit + 1}`,
    `offset=${safeOffset}`,
    ...activeGymQueryParams({ q, discipline, availableColumns })
  ].filter(Boolean);
  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders(SUPABASE_READ_KEY)
  });

  if (!response.ok) {
    throw new Error(`Supabase public listing read failed (${response.status})`);
  }

  const data = await response.json();
  const rows = Array.isArray(data) ? data : [];
  const normalized = rows.map((row, index) => normalizeGymRecord(row, `listing-${safeOffset + index + 1}`));
  const publicRows = normalized.filter((gym) => isPublicActiveGym(gym) && !isExcludedGymRecord(gym));
  return {
    items: withCanonicalGymSlugs(publicRows.slice(0, safeLimit)),
    limit: safeLimit,
    offset: safeOffset,
    hasMore: publicRows.length > safeLimit || rows.length > safeLimit
  };
}

async function readAdminGymListFromSupabase({ limit = 50, offset = 0, q = '', archived = 'active' } = {}) {
  if (!hasSupabaseRead) return null;

  const availableColumns = await supabaseAvailableColumns();
  const select = uniqueAvailableColumns(ADMIN_GYM_LIST_COLUMNS, availableColumns).join(',');
  const available = new Set(availableColumns);
  const safeLimit = boundedNumber(limit, 50, { min: 1, max: 100 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const mode = ['active', 'archived', 'all'].includes(String(archived || '').trim())
    ? String(archived || '').trim()
    : 'active';
  const orderColumns = ['nome', 'name'].filter((column) => available.has(column));
  const params = [
    `select=${encodeURIComponent(select)}`,
    `limit=${safeLimit + 1}`,
    `offset=${safeOffset}`
  ];

  if (orderColumns.length) params.splice(1, 0, `order=${orderColumns.map((column) => `${column}.asc.nullslast`).join(',')}`);
  if (available.has('deleted_at') && mode === 'active') params.push('deleted_at=is.null');
  if (available.has('deleted_at') && mode === 'archived') params.push('deleted_at=not.is.null');

  const query = String(q || '').trim();
  if (query) {
    const like = `*${query.replace(/[%*,()]/g, ' ').replace(/\s+/g, ' ').trim()}*`;
    if (like !== '**') {
      const encoded = encodeURIComponent(like);
      const searchColumns = ['nome', 'name', 'citta', 'city', 'indirizzo', 'address', 'discipline'].filter((column) =>
        available.has(column)
      );
      if (searchColumns.length) {
        params.push(`or=(${searchColumns.map((column) => `${column}.ilike.${encoded}`).join(',')})`);
      }
    }
  }

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
    method: 'GET',
    headers: supabaseHeaders(SUPABASE_READ_KEY)
  });

  if (!response.ok) {
    throw new Error(`Supabase admin list read failed (${response.status})`);
  }

  const rows = await response.json();
  const pageRows = Array.isArray(rows) ? rows.slice(0, safeLimit) : [];
  return {
    items: withCanonicalGymSlugs(pageRows.map((row, index) => normalizeGymRecord(row, row?.id || `admin-list-${safeOffset + index + 1}`))),
    limit: safeLimit,
    offset: safeOffset,
    hasMore: Array.isArray(rows) && rows.length > safeLimit,
    q: query,
    archived: mode
  };
}

async function readAdminGymByIdFromSupabase(id) {
  if (!hasSupabaseRead) return null;

  const cleanId = String(id || '').trim();
  if (!cleanId) return null;

  const availableColumns = await supabaseAvailableColumns();
  const select = uniqueAvailableColumns(ADMIN_GYM_DETAIL_COLUMNS, availableColumns).join(',');
  const params = [
    `select=${encodeURIComponent(select)}`,
    `id=eq.${encodeURIComponent(cleanId)}`,
    'limit=1'
  ];
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
    method: 'GET',
    headers: supabaseHeaders(SUPABASE_READ_KEY)
  });

  if (!response.ok) {
    throw new Error(`Supabase admin detail read failed (${response.status})`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeGymRecord(rows[0], cleanId) : null;
}

async function readAdminGymForClaimApprovalFromSupabase({ id = '', slug = '', name = '' } = {}) {
  if (!hasSupabaseRead) return null;

  const cleanId = String(id || '').trim();
  const cleanSlug = String(slug || '').trim();
  const cleanName = String(name || '').trim();
  const select = ADMIN_CLAIM_APPROVAL_GYM_COLUMNS.join(',');
  const baseParams = [`select=${encodeURIComponent(select)}`, 'deleted_at=is.null', 'limit=1'];
  let params = [];

  if (cleanId) {
    params = [...baseParams, `id=eq.${encodeURIComponent(cleanId)}`];
  } else if (cleanSlug) {
    params = [...baseParams, `slug=eq.${encodeURIComponent(cleanSlug)}`];
  } else if (cleanName) {
    const encodedName = encodeURIComponent(cleanName);
    params = [...baseParams, `or=(nome.ilike.${encodedName},name.ilike.${encodedName})`];
  } else {
    return null;
  }

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
    method: 'GET',
    headers: supabaseHeaders(SUPABASE_READ_KEY)
  });

  if (!response.ok) {
    throw new Error(`Supabase claim gym read failed (${response.status})`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeGymRecord(rows[0], rows[0]?.id || 'claim-gym') : null;
}

async function readLocalGyms() {
  if (!isReadOnlyRuntime) {
    await ensureStorage();
  }

  for (const candidatePath of [csvFilePath, staticCsvFilePath]) {
    try {
      const csvRaw = await readFile(candidatePath, 'utf-8');
      const csvGyms = gymsFromCsv(csvRaw);
      if (csvGyms.length > 0) {
        return withCanonicalGymSlugs(csvGyms.filter((gym) => !isExcludedGymRecord(gym)));
      }
    } catch {
      // try next source
    }
  }

  if (isReadOnlyRuntime) {
    const publicStaticGyms = await readPublicStaticCsvGyms();
    if (publicStaticGyms.length) return publicStaticGyms;
  }

  try {
    const raw = await readFile(dataFilePath, 'utf-8');
    const gyms = JSON.parse(raw);
    return Array.isArray(gyms)
      ? withCanonicalGymSlugs(
          gyms
            .map((gym, index) => normalizeGymRecord(gym, `json-${index + 1}`))
            .filter((gym) => !isExcludedGymRecord(gym))
        )
      : [];
  } catch {
    return [];
  }
}

async function readPublicGymListingFromLocal({ limit = 24, offset = 0, q = '', discipline = '' } = {}) {
  const safeLimit = boundedNumber(limit, 24, { min: 1, max: 100 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const allGyms = await readLocalGyms();
  const query = String(q || '').trim().toLowerCase();
  const wantedDiscipline = String(discipline || '').trim().toLowerCase();
  let filtered = allGyms.filter((gym) => isPublicActiveGym(gym) && !isExcludedGymRecord(gym));

  if (wantedDiscipline) {
    filtered = filtered.filter((gym) => {
      const list = Array.isArray(gym.disciplines) && gym.disciplines.length
        ? gym.disciplines
        : String(gym.discipline || '').split('|');
      return list.map((item) => String(item || '').trim().toLowerCase()).includes(wantedDiscipline);
    });
  }

  if (query) {
    filtered = filtered.filter((gym) =>
      [gym.name, gym.address, gym.city, Array.isArray(gym.disciplines) ? gym.disciplines.join(' | ') : gym.discipline]
        .some((field) => String(field || '').toLowerCase().includes(query))
    );
  }

  const page = filtered.slice(safeOffset, safeOffset + safeLimit);
  return {
    items: page,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: filtered.length > safeOffset + safeLimit
  };
}

async function readPublicGymCountFromSupabase() {
  if (!hasSupabaseRead) return null;

  const availableColumns = await supabaseAvailableColumns();
  const params = ['select=id', ...(availableColumns.includes('deleted_at') ? ['deleted_at=is.null'] : [])];
  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`;
  const response = await fetch(url, {
    method: 'HEAD',
    headers: supabaseHeaders(SUPABASE_READ_KEY, { Prefer: 'count=planned' })
  });

  if (!response.ok) return null;
  const count = Number(response.headers.get('content-range')?.split('/')?.[1]);
  return Number.isFinite(count) ? count : null;
}

async function upsertGymsInSupabase(gyms) {
  if (!hasSupabaseWrite) return;
  const availableColumns = await supabaseAvailableColumns();

  const base = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}`;

  const records = gyms.map((gym) => gymToSupabaseRecord(normalizeGymRecord(gym, gym?.id || ''), availableColumns));
  if (!records.length) return;

  const chunkSize = 300;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const insResponse = await fetch(base, {
      method: 'POST',
      headers: supabaseHeaders(SUPABASE_WRITE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(chunk)
    });

    if (!insResponse.ok) {
      let details = '';
      try {
        const payload = await insResponse.json();
        details = [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
      } catch {
        details = await insResponse.text().catch(() => '');
      }
      throw new Error(`Supabase insert failed (${insResponse.status}). ${details}`.trim());
    }
  }

  clearRuntimeGyms();
}

function supabasePayloadDetails(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
}

async function readSupabaseResponse(response) {
  const text = await response.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function adminUpdateFilter(normalized, availableColumns) {
  if (availableColumns.includes('id') && normalized.id) {
    return { column: 'id', value: normalized.id };
  }

  if (availableColumns.includes('slug') && normalized.slug) {
    return { column: 'slug', value: normalized.slug };
  }

  throw new Error('Aggiornamento non riuscito: la tabella Supabase non espone id o slug per identificare la scheda.');
}

function adminUpdateRecord(gym, availableColumns) {
  const normalized = normalizeGymRecord(gym, gym?.id || '');
  const allowed = new Set(availableColumns);
  const hasItalianSchema = ['nome', 'indirizzo', 'citta', 'orari'].some((column) => allowed.has(column));

  if (!hasItalianSchema) {
    return gymToSupabaseRecord(normalized, availableColumns);
  }

  const record = {};
  const italianColumns = [
    'nome',
    'disciplines',
    'discipline',
    'discipline_aliases',
    'discipline_canonical_slugs',
    'indirizzo',
    'citta',
    'telefono',
    'orari',
    'sito',
    'descrizione',
    'lat',
    'lng',
    'is_premium',
    'is_verified',
    'priority_score',
    'deleted_at',
    'descrizione_owner',
    'descrizione_editoriale',
    'descrizione_generata',
    'descrizione_pubblica',
    'descrizione_source',
    'descrizione_quality_score',
    'descrizione_needs_review',
    'data_quality_flags',
    'needs_review',
    'review_reason',
    'last_data_audit_at',
    'safe_public_description',
    'official_source_url',
    'editorial_summary',
    'editorial_highlights',
    'editorial_faq_items',
    'price_info',
    'price_source_url',
    'price_updated_at',
    'verified_commercial_info',
    'commercial_info_last_checked_at',
    'source_url',
    'enrichment_status',
    'enrichment_notes',
    'enrichment_updated_at',
    'social_links',
    'data_verified_at'
  ];

  for (const column of italianColumns) {
    if (allowed.has(column) && normalized[column] !== undefined) {
      record[column] = normalized[column];
    }
  }

  if (allowed.has('image_url') && normalized.image_url !== undefined) {
    record.image_url = normalized.image_url;
  }

  if (allowed.has('weekly_hours')) {
    record.weekly_hours = normalized.weekly_hours;
  }

  return record;
}

export async function updateGymRecord(gym) {
  if (!hasSupabaseWrite) {
    throw new Error(
      'Scrittura Supabase non configurata: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente corrente.'
    );
  }

  const availableColumns = await supabaseAvailableColumns();
  const normalized = normalizeGymRecord(gym, gym?.id || '');
  const filter = adminUpdateFilter(normalized, availableColumns);
  const payload = adminUpdateRecord(normalized, availableColumns);
  const base = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}`;
  const url = `${base}?${filter.column}=eq.${encodeURIComponent(filter.value)}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: supabaseHeaders(SUPABASE_WRITE_KEY, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(payload)
  });

  const responsePayload = await readSupabaseResponse(response);

  if (isDevelopment) {
    console.info('[admin-schede:update]', {
      id: normalized.id,
      filter,
      payload,
      supabase: {
        ok: response.ok,
        status: response.status,
        response: responsePayload
      }
    });
  }

  if (!response.ok) {
    const details = supabasePayloadDetails(responsePayload);
    throw new Error(`Aggiornamento Supabase non riuscito (${response.status}). ${details}`.trim());
  }

  if (Array.isArray(responsePayload) && responsePayload.length === 0) {
    throw new Error(`Aggiornamento Supabase non riuscito: nessuna scheda trovata con ${filter.column}=${filter.value}.`);
  }

  clearRuntimeGyms();

  return Array.isArray(responsePayload) ? responsePayload.map((row, index) => normalizeGymRecord(row, normalized.id || `db-${index + 1}`)) : [];
}

export async function writeGymRecords(gyms) {
  const normalized = (Array.isArray(gyms) ? gyms : [gyms]).filter(Boolean).map((gym, index) =>
    normalizeGymRecord(gym, gym?.id || `gym-${index + 1}`)
  );

  if (!normalized.length) return;

  if (!hasSupabaseWrite) {
    throw new Error(
      'Scrittura Supabase non configurata: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente corrente.'
    );
  }

  await upsertGymsInSupabase(normalized);
}

export async function readGyms(options = {}) {
  const fresh = Boolean(options?.fresh);

  if (!fresh) {
    const runtimeGyms = getRuntimeGyms();
    if (runtimeGyms && runtimeGyms.length > 0) {
      return withCanonicalGymSlugs(runtimeGyms);
    }
  }

  if (hasSupabaseRead) {
    try {
      const dbGyms = await readGymsFromSupabase();
      if (Array.isArray(dbGyms) && dbGyms.length > 0) {
        return withCanonicalGymSlugs(dbGyms.filter((gym) => !isExcludedGymRecord(gym)));
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
        return withCanonicalGymSlugs(csvGyms.filter((gym) => !isExcludedGymRecord(gym)));
      }
    } catch {
      // try next source
    }
  }

  try {
    const raw = await readFile(dataFilePath, 'utf-8');
    const gyms = JSON.parse(raw);
    return Array.isArray(gyms)
      ? withCanonicalGymSlugs(
          gyms
            .map((gym, index) => normalizeGymRecord(gym, `json-${index + 1}`))
            .filter((gym) => !isExcludedGymRecord(gym))
        )
      : [];
  } catch {
    return [];
  }
}

export async function readAdminGymList(options = {}) {
  const safeLimit = boundedNumber(options.limit, 50, { min: 1, max: 100 });
  const safeOffset = boundedNumber(options.offset, 0, { min: 0 });
  const query = String(options.q || '').trim();
  const mode = ['active', 'archived', 'all'].includes(String(options.archived || '').trim())
    ? String(options.archived || '').trim()
    : 'active';

  if (hasSupabaseRead) {
    try {
      const result = await readAdminGymListFromSupabase({ limit: safeLimit, offset: safeOffset, q: query, archived: mode });
      if (result && Array.isArray(result.items)) return result;
    } catch {
      // fallback below
    }
  }

  const allGyms = await readLocalGyms();
  const normalizedQuery = query.toLowerCase();
  let filtered = allGyms;

  if (mode === 'active') filtered = filtered.filter((gym) => !isArchivedGym(gym));
  if (mode === 'archived') filtered = filtered.filter((gym) => isArchivedGym(gym));

  if (normalizedQuery) {
    filtered = filtered.filter((gym) =>
      [gym.name, gym.nome, gym.city, gym.citta, gym.address, gym.indirizzo, gym.discipline, Array.isArray(gym.disciplines) ? gym.disciplines.join(' | ') : '']
        .join(' | ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  const items = filtered
    .slice(safeOffset, safeOffset + safeLimit)
    .map((gym) => normalizeGymRecord(Object.fromEntries(ADMIN_GYM_LIST_COLUMNS.map((key) => [key, gym[key]])), gym.id));

  return {
    items: withCanonicalGymSlugs(items),
    limit: safeLimit,
    offset: safeOffset,
    hasMore: filtered.length > safeOffset + safeLimit,
    q: query,
    archived: mode
  };
}

export async function readAdminGymById(id) {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;

  if (hasSupabaseRead) {
    const gym = await readAdminGymByIdFromSupabase(cleanId);
    if (gym) return gym;
  }

  const gyms = await readLocalGyms();
  return gyms.find((gym) => String(gym?.id || '').trim() === cleanId) || null;
}

export async function readAdminGymForClaimApproval({ id = '', slug = '', gymUrl = '', name = '' } = {}) {
  const cleanId = String(id || '').trim();
  const cleanSlug = String(slug || '').trim();
  const slugFromUrl = extractGymSlugFromUrl(gymUrl);
  const legacyIdFromUrl = extractLegacyGymIdFromSlug(slugFromUrl);
  const cleanName = String(name || '').trim();

  if (hasSupabaseRead) {
    if (cleanId) {
      const gym = await readAdminGymForClaimApprovalFromSupabase({ id: cleanId });
      if (gym) return gym;
    }
    if (cleanSlug) {
      const gym = await readAdminGymForClaimApprovalFromSupabase({ slug: cleanSlug });
      if (gym) return gym;
    }
    if (slugFromUrl && slugFromUrl !== cleanSlug) {
      const gym = await readAdminGymForClaimApprovalFromSupabase({ slug: slugFromUrl });
      if (gym) return gym;
    }
    if (legacyIdFromUrl && legacyIdFromUrl !== cleanId) {
      const gym = await readAdminGymForClaimApprovalFromSupabase({ id: legacyIdFromUrl });
      if (gym) return gym;
    }
    if (cleanName) {
      const gym = await readAdminGymForClaimApprovalFromSupabase({ name: cleanName });
      if (gym) return gym;
    }
  }

  const gyms = await readLocalGyms();
  if (cleanId) {
    const byId = gyms.find((gym) => String(gym?.id || '').trim() === cleanId);
    if (byId) return byId;
  }
  if (cleanSlug) {
    const bySlug = gyms.find((gym) => String(gym?.slug || '').trim() === cleanSlug || String(gym?._legacy_slug || '').trim() === cleanSlug);
    if (bySlug) return bySlug;
  }
  if (slugFromUrl && slugFromUrl !== cleanSlug) {
    const byUrlSlug = gyms.find((gym) => String(gym?.slug || '').trim() === slugFromUrl || String(gym?._legacy_slug || '').trim() === slugFromUrl);
    if (byUrlSlug) return byUrlSlug;
  }
  if (legacyIdFromUrl && legacyIdFromUrl !== cleanId) {
    const byLegacyId = gyms.find((gym) => String(gym?.id || '').trim() === legacyIdFromUrl);
    if (byLegacyId) return byLegacyId;
  }
  if (cleanName) {
    const normalizedName = normalizeForClaimMatch(cleanName);
    return gyms.find((gym) => normalizeForClaimMatch(gym?.name || gym?.nome) === normalizedName) || null;
  }

  return null;
}

export async function readPublicGymListing(options = {}) {
  if (hasSupabaseRead) {
    try {
      const result = await readPublicGymListingFromSupabase(options);
      if (result && Array.isArray(result.items)) return result;
    } catch {
      // fallback below
    }
  }

  return readPublicGymListingFromLocal(options);
}

export async function readPublicGymCount() {
  const supabaseCount = await readPublicGymCountFromSupabase();
  if (Number.isFinite(supabaseCount)) return supabaseCount;

  return (await readLocalGyms()).filter(isPublicActiveGym).length;
}

export async function readPublicRouteGyms({ limit = 5000 } = {}) {
  const safeLimit = boundedNumber(limit, 5000, { min: 1, max: 5000 });
  return (await readLocalGyms()).filter(isPublicActiveGym).slice(0, safeLimit);
}

export async function writeGyms(gyms) {
  const normalized = (Array.isArray(gyms) ? gyms : []).map((gym, index) =>
    normalizeGymRecord(gym, `gym-${index + 1}`)
  );

  if (hasSupabaseWrite) {
    // Guardrail anti-disastro: non sostituire mai la tabella gyms con DELETE + INSERT.
    // Le modifiche admin devono aggiornare o inserire record, mentre le rimozioni passano da soft-delete.
    await upsertGymsInSupabase(normalized);
  }

  if (isReadOnlyRuntime && !hasSupabaseWrite) {
    throw new Error(
      'Scrittura Supabase non configurata: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente corrente.'
    );
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

export function canWriteSupabase() {
  return hasSupabaseWrite;
}

export function gymStoreStatus() {
  return {
    readOnlyRuntime: isReadOnlyRuntime,
    hasSupabaseRead,
    hasSupabaseWrite,
    table: SUPABASE_GYMS_TABLE,
    persistence: hasSupabaseWrite ? 'supabase' : isReadOnlyRuntime ? 'runtime-only' : 'local-files'
  };
}

export function getUploadsDir() {
  return uploadsDir;
}






