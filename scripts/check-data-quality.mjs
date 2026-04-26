import { readFile } from 'node:fs/promises';

const DATA_JSON = 'data/gyms.json';
const CSV_FILES = ['data/palestre.csv', 'static/palestre.csv'];
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasCoords(gym) {
  return Number.isFinite(Number(gym?.latitude)) && Number.isFinite(Number(gym?.longitude));
}

const failures = [];

for (const file of [DATA_JSON, ...CSV_FILES]) {
  const content = await readFile(file, 'utf8');
  if (CONTROL_CHARS.test(content)) {
    failures.push(`${file} contiene caratteri di controllo non validi`);
  }
}

let gyms = [];
try {
  gyms = JSON.parse(await readFile(DATA_JSON, 'utf8'));
} catch (error) {
  failures.push(`${DATA_JSON} non e JSON valido: ${error.message}`);
}

if (!Array.isArray(gyms)) {
  failures.push(`${DATA_JSON} deve contenere un array`);
  gyms = [];
}

const duplicateGroups = new Map();
let noPhone = 0;
let noWebsite = 0;
let noCoords = 0;
let weakNoContact = 0;
let hoursToVerify = 0;

for (const gym of gyms) {
  const phone = String(gym?.phone || '').trim();
  const website = String(gym?.website || '').trim();
  const hours = String(gym?.hours_info || '').trim();

  if (!phone) noPhone += 1;
  if (!website) noWebsite += 1;
  if (!hasCoords(gym)) noCoords += 1;
  if (!phone && !website) weakNoContact += 1;
  if (!hours || /orari da verificare/i.test(hours)) hoursToVerify += 1;

  const key = [normalizeKey(gym?.name), normalizeKey(gym?.city)].join('|');
  if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
  duplicateGroups.get(key).push(gym);
}

const duplicateCount = [...duplicateGroups.values()].filter((items) => items.length > 1).length;

if (failures.length) {
  console.error('[data-check] FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[data-check] OK');
console.log(
  `[data-check] total=${gyms.length} no_phone=${noPhone} no_website=${noWebsite} no_coords=${noCoords} no_contact=${weakNoContact} hours_to_verify=${hoursToVerify} duplicate_name_city_groups=${duplicateCount}`
);
