import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalizeDiscipline } from '../src/lib/discipline-taxonomy.js';

// Acquisition pipeline, fase 1 — see docs/ACQUISITION_PIPELINE.md for the full
// design. This script only ever writes to public.gym_candidates (staging).
// It never writes to public.gyms. public.gyms is read here read-only, for
// dedup comparison against the live catalog.

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const area = args.get('--area');
if (!area) {
  throw new Error('Usage: --area="Comune, Provincia, Country" (Nominatim place name), e.g. --area="Cassano Magnago, Italia"');
}

const stagingEnvFile = args.get('--staging-env-file') || '.env.staging.local';
const productionEnvFile = args.get('--production-env-file') || '.env.vercel.production.check';
const cacheDir = args.get('--cache-dir') || 'data/osm-cache';
const confirmApply = args.has('--confirm-apply');
const skipCache = args.has('--fresh');
const dedupThreshold = Number(args.get('--dedup-threshold') || 0.85);

const USER_AGENT = 'PalestreInZonaAcquisitionPipeline/1.0 (contact: info@palestreinzona.it)';

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnv(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key) env[key] = value;
  }
  return env;
}

function ensureStagingTarget(env) {
  const url = String(env.SUPABASE_URL || '').toLowerCase();
  const envName = String(env.SUPABASE_ENV || '').toLowerCase();
  if (envName !== 'staging' || url.includes('prod')) {
    throw new Error('Blocked: --staging-env-file must resolve to the staging project (SUPABASE_ENV=staging).');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function foldName(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenSimilarity(a, b) {
  const tokensA = new Set(foldName(a).split(' ').filter(Boolean));
  const tokensB = new Set(foldName(b).split(' ').filter(Boolean));
  if (!tokensA.size || !tokensB.size) return 0;
  let intersection = 0;
  for (const token of tokensA) if (tokensB.has(token)) intersection += 1;
  return intersection / Math.max(tokensA.size, tokensB.size);
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- 1. Resolve area name to a bounding box via Nominatim (single, cached request) ---

async function resolveBoundingBox(placeName) {
  const cacheKey = `nominatim-${createHash('sha1').update(placeName).digest('hex')}`;
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  if (!skipCache) {
    try {
      const cached = JSON.parse(await readFile(cachePath, 'utf8'));
      console.log(`[scrape-osm] nominatim cache hit for "${placeName}"`);
      return cached;
    } catch {
      // fall through to network
    }
  }

  console.log(`[scrape-osm] geocoding "${placeName}" via Nominatim...`);
  await sleep(1200);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1&polygon_geojson=0`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim request failed (${res.status})`);
  const results = await res.json();
  if (!results.length) throw new Error(`No Nominatim match for "${placeName}"`);
  const [south, north, west, east] = results[0].boundingbox.map(Number);
  const bbox = { south, west, north, east, displayName: results[0].display_name };

  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(bbox, null, 2), 'utf8');
  return bbox;
}

// --- 2. Query Overpass for fitness/sport-related nodes and ways in the bbox ---

const OVERPASS_TAGS = [
  'leisure=fitness_centre',
  'leisure=sports_centre',
  'leisure=swimming_pool',
  'sport=fitness',
  'sport=yoga',
  'sport=pilates',
  'sport=boxing',
  'sport=martial_arts',
  'sport=climbing',
  'sport=swimming',
  'sport=judo',
  'sport=karate',
  'sport=taekwondo',
  'sport=aikido',
  'sport=kickboxing',
  'sport=mma',
  'sport=brazilian_jiu-jitsu',
  'sport=basketball',
  'sport=soccer',
  'sport=padel',
  'sport=tennis',
  'sport=ice_skating',
  'sport=roller_skating',
  'sport=golf',
  'sport=field_hockey',
  'sport=ice_hockey',
  'sport=fencing',
  'sport=gymnastics',
  'club=sport',
  'amenity=dojo'
];

function buildOverpassQuery(bbox) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const clauses = OVERPASS_TAGS.map((tag) => {
    const [key, value] = tag.split('=');
    return [`node["${key}"="${value}"](${bboxStr});`, `way["${key}"="${value}"](${bboxStr});`];
  }).flat();
  return `[out:json][timeout:60];(\n${clauses.join('\n')}\n);out center tags;`;
}

async function queryOverpass(bbox) {
  const query = buildOverpassQuery(bbox);
  const cacheKey = `overpass-${createHash('sha1').update(query).digest('hex')}`;
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  if (!skipCache) {
    try {
      const cached = JSON.parse(await readFile(cachePath, 'utf8'));
      console.log('[scrape-osm] overpass cache hit');
      return cached.elements;
    } catch {
      // fall through to network
    }
  }

  const endpoint = args.get('--overpass-url') || 'https://overpass-api.de/api/interpreter';
  console.log(`[scrape-osm] querying Overpass API (${endpoint})...`);
  await sleep(2000);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
    body: query
  });
  if (!res.ok) throw new Error(`Overpass request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(data, null, 2), 'utf8');
  return data.elements;
}

// --- 3. Normalize OSM elements into candidate-shaped records ---

const DISCIPLINE_TAG_MAP = {
  fitness: 'Fitness',
  yoga: 'Yoga',
  pilates: 'Pilates',
  boxing: 'Boxe',
  martial_arts: 'Arti Marziali',
  climbing: 'Climbing',
  swimming: 'Nuoto',
  judo: 'Judo',
  karate: 'Karate',
  taekwondo: 'Taekwondo',
  aikido: 'Aikido',
  kickboxing: 'Kickboxing',
  mma: 'MMA',
  'brazilian_jiu-jitsu': 'Brazilian Jiu Jitsu',
  basketball: 'Basket',
  soccer: 'Calcio',
  padel: 'Padel',
  tennis: 'Tennis',
  ice_skating: 'Pattinaggio',
  roller_skating: 'Pattinaggio',
  golf: 'Golf',
  field_hockey: 'Hockey',
  ice_hockey: 'Hockey',
  fencing: 'Scherma',
  gymnastics: 'Ginnastica Artistica'
};

// Fitness centres and sports halls with no specific sport= tag are common
// (multi-purpose venues) and are kept as untyped candidates rather than
// guessed at, since defaulting to "Fitness" mislabels tennis clubs, pools
// and other non-fitness sports_centre/club=sport matches (see
// docs/ACQUISITION_PIPELINE.md pilot findings, 2026-07-10).
function guessDisciplines(tags) {
  const guesses = new Set();
  if (tags.sport) {
    for (const raw of String(tags.sport).split(';')) {
      const key = raw.trim();
      const mapped = DISCIPLINE_TAG_MAP[key];
      if (mapped) guesses.add(mapped);
      else if (key) guesses.add(key);
    }
  }
  if (tags.amenity === 'dojo') guesses.add('Arti Marziali');
  if (!guesses.size && tags.leisure === 'fitness_centre') guesses.add('Fitness');

  const canonical = [];
  for (const guess of guesses) {
    const result = canonicalizeDiscipline(guess);
    canonical.push(result?.name || guess);
  }
  return [...new Set(canonical)];
}

function buildAddress(tags) {
  const parts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean);
  const street = parts.length === 2 ? `${parts[0]} ${parts[1]}` : parts[0] || '';
  return clean(street);
}

// Very small best-effort OSM opening_hours -> our "Lun 9-18 | Mar ..." format.
// Anything not matching the simple "Mo-Fr HH:MM-HH:MM; Sa HH:MM-HH:MM" shape is
// left as raw OSM text with a validation flag, for manual interpretation.
const DAY_MAP = { Mo: 'Lun', Tu: 'Mar', We: 'Mer', Th: 'Gio', Fr: 'Ven', Sa: 'Sab', Su: 'Dom' };
const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function expandDayRange(range) {
  const [start, end] = range.split('-');
  const startIdx = DAY_ORDER.indexOf(start);
  const endIdx = DAY_ORDER.indexOf(end);
  if (startIdx < 0 || endIdx < 0) return null;
  const days = [];
  for (let i = startIdx; i <= endIdx; i += 1) days.push(DAY_ORDER[i]);
  return days;
}

function parseOpeningHours(raw) {
  if (!raw) return { hoursInfo: null, flag: false };
  const segments = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const byDay = {};
  let ok = true;

  for (const segment of segments) {
    const match = segment.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!match) {
      ok = false;
      break;
    }
    const [, dayExpr, startTime, endTime] = match;
    const dayGroups = dayExpr.split(',');
    for (const group of dayGroups) {
      const days = group.includes('-') ? expandDayRange(group) : [group];
      if (!days) {
        ok = false;
        break;
      }
      for (const day of days) {
        byDay[day] = `${startTime}-${endTime}`;
      }
    }
  }

  if (!ok) return { hoursInfo: null, flag: true };

  const parts = DAY_ORDER.map((day) => `${DAY_MAP[day]} ${byDay[day] || 'Chiuso'}`);
  return { hoursInfo: parts.join(' | '), flag: false };
}

function normalizeElement(el, fallbackCity) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  const { hoursInfo, flag: hoursFlag } = parseOpeningHours(tags.opening_hours);

  return {
    source_id: `${el.type}/${el.id}`,
    nome: clean(tags.name),
    indirizzo: buildAddress(tags),
    citta: clean(tags['addr:city']) || fallbackCity,
    telefono: clean(tags.phone || tags['contact:phone']),
    email: clean(tags.email || tags['contact:email']),
    sito: clean(tags.website || tags['contact:website']),
    orari: hoursInfo,
    orari_raw: clean(tags.opening_hours),
    orari_needs_review: hoursFlag,
    disciplines: guessDisciplines(tags),
    latitude: lat,
    longitude: lon,
    tags
  };
}

// --- 4. Validation ---

const BLACKLIST_HARD = /\b(supermercat[oi]|cisalfa|decathlon|tigot[aà]?|migros|old wild west|ritmo shoes|intersport|negozio|\bstore\b|\bshop\b)\b/i;
const BLACKLIST_SOFT = /\b(centro estetico|estetic[ao]|parrucchier[ei]|farmaci[ae]|fisioterap|lido\b|piscina comunale|comune di|agenzia (?:lavoro|interinale)|comunale|scuola|liceo|istituto comprensivo|istituto tecnico|federazione italiana|comitato provinciale|comitato regionale|percorso vita|parco calisthenics|vita park)\b/i;
const DATED_EVENT_PATTERN = /\b\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}\b/i;
const GOVERNMENT_OPERATOR_PATTERN = /\b(comune|comunale|provincia|regione|stato|ministero|pubblic[oa])\b/i;

function validate(candidate) {
  const flags = [];

  if (!candidate.nome) {
    flags.push({ type: 'missing_name', severity: 'critical', reason: 'Nessun tag name su OSM, impossibile creare una scheda.' });
    return flags;
  }

  if (candidate.tags.access === 'private' || candidate.tags.access === 'no') {
    flags.push({ type: 'access_restricted', field: 'access', value: candidate.tags.access, severity: 'high', reason: 'Tag OSM access indica accesso privato/non pubblico.' });
  }

  if (candidate.tags.tourism === 'hotel' || candidate.tags.tourism === 'resort') {
    flags.push({ type: 'hotel_venue', field: 'tourism', value: candidate.tags.tourism, severity: 'medium', reason: 'Nodo taggato anche come struttura ricettiva: verificare se la palestra e aperta al pubblico.' });
  }

  const operatorType = candidate.tags['operator:type'];
  const operator = candidate.tags.operator;
  if (operatorType === 'government' || operatorType === 'public' || (operator && GOVERNMENT_OPERATOR_PATTERN.test(operator))) {
    flags.push({ type: 'public_operator', field: 'operator', value: operator || operatorType, severity: 'critical', reason: 'Gestore pubblico/comunale su OSM: probabile struttura non commerciale.' });
  }

  if (!candidate.disciplines.length) {
    flags.push({ type: 'no_recognized_discipline', severity: 'medium', reason: 'Nessun tag sport/leisure specifico riconosciuto: disciplina da assegnare manualmente.' });
  }

  if (BLACKLIST_HARD.test(candidate.nome)) {
    flags.push({ type: 'blacklist_hard', field: 'nome', value: candidate.nome, severity: 'critical', reason: 'Nome corrisponde a un pattern noto di non-palestra (catena retail, ecc.).' });
  }

  if (BLACKLIST_SOFT.test(candidate.nome)) {
    flags.push({ type: 'blacklist_soft', field: 'nome', value: candidate.nome, severity: 'medium', reason: 'Nome potenzialmente non-palestra, richiede revisione manuale.' });
  }

  if (DATED_EVENT_PATTERN.test(candidate.nome)) {
    flags.push({ type: 'dated_event', field: 'nome', value: candidate.nome, severity: 'high', reason: 'Il nome contiene una data esplicita: probabile evento/corso, non attivita permanente.' });
  }

  if (candidate.orari_needs_review) {
    flags.push({ type: 'hours_needs_review', field: 'orari_raw', value: candidate.orari_raw, severity: 'low', reason: 'Formato opening_hours OSM non riconosciuto automaticamente.' });
  }

  if (!candidate.latitude || !candidate.longitude) {
    flags.push({ type: 'missing_coordinates', severity: 'high', reason: 'Nessuna coordinata utilizzabile (way senza center).' });
  }

  return flags;
}

// --- 5. Dedup against public.gyms (production, read-only) and existing candidates ---

async function readActiveProductionGyms(productionEnv) {
  const url = productionEnv.SUPABASE_URL.replace(/\/$/, '');
  const key = productionEnv.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/gyms?select=id,nome,name,citta,city,latitude,longitude&deleted_at=is.null&order=id.asc&limit=2000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`Production read failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function readExistingCandidates(stagingEnv) {
  const url = stagingEnv.SUPABASE_URL.replace(/\/$/, '');
  const key = stagingEnv.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/gym_candidates?select=id,nome,citta,latitude,longitude&order=id.asc&limit=5000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`gym_candidates read failed (${res.status}): ${await res.text()}`);
  return res.json();
}

function bestDedupMatch(candidate, pool, nameKey, cityKey) {
  let best = null;
  for (const item of pool) {
    const name = item[nameKey] || item.nome || item.name;
    const city = item[cityKey] || item.citta || item.city;
    const nameScore = tokenSimilarity(candidate.nome, name);
    let distanceScore = 0;
    if (candidate.latitude && candidate.longitude && item.latitude && item.longitude) {
      const km = haversineKm(candidate.latitude, candidate.longitude, item.latitude, item.longitude);
      distanceScore = km < 0.15 ? 1 : km < 0.5 ? 0.5 : 0;
    }
    const cityScore = foldName(candidate.citta) && foldName(candidate.citta) === foldName(city) ? 1 : 0;
    const score = nameScore * 0.5 + distanceScore * 0.35 + cityScore * 0.15;
    if (!best || score > best.score) best = { score, id: item.id, name };
  }
  return best;
}

// --- 6. Main ---

async function main() {
  const stagingEnv = await loadEnv(path.resolve(stagingEnvFile));
  const productionEnv = await loadEnv(path.resolve(productionEnvFile));
  ensureStagingTarget(stagingEnv);

  const bbox = await resolveBoundingBox(area);
  console.log(`[scrape-osm] area resolved: ${bbox.displayName}`);
  console.log(`[scrape-osm] bbox: south=${bbox.south} west=${bbox.west} north=${bbox.north} east=${bbox.east}`);

  const fallbackCity = area.split(',')[0].trim();
  const elements = await queryOverpass(bbox);
  console.log(`[scrape-osm] overpass_found=${elements.length}`);

  const candidates = elements.map((el) => normalizeElement(el, fallbackCity));

  console.log('[scrape-osm] reading production catalog for dedup (read-only)...');
  const productionGyms = await readActiveProductionGyms(productionEnv);
  console.log('[scrape-osm] reading existing gym_candidates for cross-batch dedup...');
  const existingCandidates = await readExistingCandidates(stagingEnv);

  const results = { hard_rejected: [], flagged: [], clean: [] };

  for (const candidate of candidates) {
    const flags = validate(candidate);
    const hasCritical = flags.some((f) => f.severity === 'critical');

    const gymMatch = bestDedupMatch(candidate, productionGyms, 'nome', 'citta');
    const candidateMatch = bestDedupMatch(candidate, existingCandidates, 'nome', 'citta');
    const dedupScore = Math.max(gymMatch?.score || 0, candidateMatch?.score || 0);

    if (dedupScore >= dedupThreshold) {
      flags.push({
        type: 'likely_duplicate',
        severity: 'medium',
        reason: `Punteggio dedup ${dedupScore.toFixed(2)} contro ${gymMatch?.score >= candidateMatch?.score ? 'public.gyms' : 'gym_candidates'}: "${gymMatch?.score >= candidateMatch?.score ? gymMatch?.name : candidateMatch?.name}".`
      });
    }

    const record = {
      nome: candidate.nome,
      indirizzo: candidate.indirizzo || null,
      citta: candidate.citta || null,
      telefono: candidate.telefono || null,
      email: candidate.email || null,
      sito: candidate.sito || null,
      discipline: candidate.disciplines.join('|'),
      disciplines: candidate.disciplines,
      orari: candidate.orari,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      source: 'osm',
      source_id: candidate.source_id,
      source_url: `https://www.openstreetmap.org/${candidate.source_id}`,
      validation_flags: flags,
      dedup_score: dedupScore || null,
      dedup_match_gym_id: gymMatch?.score >= dedupThreshold ? gymMatch.id : null,
      dedup_match_candidate_id: candidateMatch?.score >= dedupThreshold ? candidateMatch.id : null
    };

    if (hasCritical) {
      results.hard_rejected.push({ record, flags });
    } else if (flags.length) {
      results.flagged.push({ record, flags });
    } else {
      results.clean.push({ record, flags });
    }
  }

  console.log(`\n[scrape-osm] --- Report per "${area}" ---`);
  console.log(`[scrape-osm] trovati su Overpass: ${elements.length}`);
  console.log(`[scrape-osm] scartati (nome mancante / blacklist dura): ${results.hard_rejected.length}`);
  for (const { record, flags } of results.hard_rejected) {
    console.log(`  x ${record.nome || '(senza nome)'} — ${flags.map((f) => f.type).join(', ')}`);
  }
  console.log(`[scrape-osm] con flag per revisione manuale: ${results.flagged.length}`);
  for (const { record, flags } of results.flagged) {
    console.log(`  ! ${record.nome} (${record.citta || '?'}) — ${flags.map((f) => f.type).join(', ')}`);
  }
  console.log(`[scrape-osm] candidati puliti: ${results.clean.length}`);
  for (const { record } of results.clean) {
    console.log(`  + ${record.nome} (${record.citta || '?'}) — ${record.disciplines.join(', ')}`);
  }

  const toInsert = [...results.flagged, ...results.clean].map((r) => r.record);
  console.log(`\n[scrape-osm] totale candidati da inserire in gym_candidates (pending): ${toInsert.length}`);

  if (!confirmApply) {
    console.log('[scrape-osm] DRY RUN — nessuna scrittura eseguita. Ri-esegui con --confirm-apply per scrivere su gym_candidates (staging).');
    return;
  }

  if (!toInsert.length) {
    console.log('[scrape-osm] Nessun candidato da inserire.');
    return;
  }

  const url = stagingEnv.SUPABASE_URL.replace(/\/$/, '');
  const key = stagingEnv.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/gym_candidates?on_conflict=source,source_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(toInsert)
  });
  if (!res.ok) throw new Error(`Insert failed (${res.status}): ${await res.text()}`);
  console.log(`[scrape-osm] scritto/aggiornato ${toInsert.length} candidati su gym_candidates (status=pending).`);
}

await main();
