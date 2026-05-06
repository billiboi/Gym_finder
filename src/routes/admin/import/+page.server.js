import { fail } from '@sveltejs/kit';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { adminErrorMessage, gymsToAdminCsv } from '$lib/admin/gyms';
import { canPersistWrites, readGyms, writeGyms } from '$lib/server/gym-store';

const REQUIRED_FIELDS = ['nome', 'discipline', 'citta'];
const IMPORT_BACKUP_DIR = path.join(process.cwd(), 'data', 'admin-import-backups');

function clean(value) {
  return String(value ?? '').trim();
}

function parseCsv(text) {
  const output = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ',' || char === ';') && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) output.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) output.push(row);
  return output;
}

function parseMapping(value) {
  try {
    const parsed = JSON.parse(clean(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeKey(parts) {
  return parts
    .map((part) => clean(part).toLowerCase())
    .join('|')
    .replace(/\s+/g, ' ')
    .trim();
}

function gymDuplicateKeys(gym) {
  const keys = [];
  if (clean(gym?.id)) keys.push(`id:${clean(gym.id)}`);
  const composite = normalizeKey([gym?.name, gym?.city, gym?.address]);
  if (composite) keys.push(`identity:${composite}`);
  return keys;
}

function rowCell(row, headers, mapping, field) {
  const header = clean(mapping[field]);
  const index = headers.indexOf(header);
  return index >= 0 ? clean(row[index]) : '';
}

function toDisciplines(value) {
  return clean(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value) {
  const raw = clean(value).replace(',', '.');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  const raw = clean(value).toLowerCase();
  return ['1', 'true', 'si', 'sì', 'yes', 'y'].includes(raw);
}

function isValidUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function rowToImportGymFixed(row, headers, mapping) {
  const disciplines = toDisciplines(rowCell(row, headers, mapping, 'discipline') || rowCell(row, headers, mapping, 'disciplines'));
  const weeklyHours = {};
  const premiumValue = rowCell(row, headers, mapping, 'is_premium');
  const priorityValue = rowCell(row, headers, mapping, 'priority_score');
  const verifiedValue = rowCell(row, headers, mapping, 'is_verified');
  if (premiumValue) weeklyHours._is_premium = toBoolean(premiumValue);
  if (priorityValue) weeklyHours._priority_score = Number(priorityValue) || 0;

  const gym = {
    id: rowCell(row, headers, mapping, 'id') || `import-${randomUUID()}`,
    slug: rowCell(row, headers, mapping, 'slug'),
    name: rowCell(row, headers, mapping, 'nome'),
    disciplines,
    discipline: disciplines[0] || 'Fitness',
    address: rowCell(row, headers, mapping, 'indirizzo'),
    city: rowCell(row, headers, mapping, 'citta'),
    provincia: rowCell(row, headers, mapping, 'provincia'),
    regione: rowCell(row, headers, mapping, 'regione'),
    phone: rowCell(row, headers, mapping, 'telefono'),
    email: rowCell(row, headers, mapping, 'email'),
    hours_info: rowCell(row, headers, mapping, 'orari') || 'Orari da verificare',
    website: rowCell(row, headers, mapping, 'sito'),
    description: rowCell(row, headers, mapping, 'descrizione'),
    latitude: toNullableNumber(rowCell(row, headers, mapping, 'lat')),
    longitude: toNullableNumber(rowCell(row, headers, mapping, 'lng')),
    weekly_hours: weeklyHours
  };

  if (verifiedValue) gym.verified = toBoolean(verifiedValue);

  return gym;
}

function validateMappedRows(headers, rows, mapping) {
  const missingMapping = REQUIRED_FIELDS.filter((field) => !clean(mapping[field]));
  const errors = [];
  const imported = [];
  const seen = new Map();

  rows.forEach((row, index) => {
    const line = index + 2;
    const gym = rowToImportGymFixed(row, headers, mapping);
    const missing = REQUIRED_FIELDS.filter((field) => !rowCell(row, headers, mapping, field));

    if (missing.length) {
      errors.push({ line, message: `Campi obbligatori mancanti: ${missing.join(', ')}` });
    }

    if (!gym.disciplines.length) {
      errors.push({ line, message: 'Discipline obbligatorie.' });
    }

    if (!isValidUrl(gym.website)) {
      errors.push({ line, message: 'Sito web non valido.' });
    }

    const rowKeys = gymDuplicateKeys(gym);
    for (const key of rowKeys) {
      if (seen.has(key)) {
        errors.push({ line, message: `Duplicato nel CSV rispetto alla riga ${seen.get(key)}.` });
      } else {
        seen.set(key, line);
      }
    }

    imported.push({ line, gym, keys: rowKeys });
  });

  return { missingMapping, errors, imported };
}

function currentIndex(gyms) {
  const index = new Map();
  gyms.forEach((gym, position) => {
    for (const key of gymDuplicateKeys(gym)) index.set(key, position);
  });
  return index;
}

function mergeGym(existing, incoming, mode) {
  if (mode === 'create-only') return existing;

  const editableFields = [
    'name',
    'slug',
    'discipline',
    'disciplines',
    'address',
    'city',
    'provincia',
    'regione',
    'phone',
    'email',
    'hours_info',
    'website',
    'description',
    'latitude',
    'longitude',
    'verified'
  ];

  const merged = { ...existing };
  for (const field of editableFields) {
    const incomingValue = incoming[field];
    const hasIncoming = Array.isArray(incomingValue)
      ? incomingValue.length > 0
      : incomingValue !== null && incomingValue !== undefined && clean(incomingValue) !== '';
    const hasExisting = Array.isArray(existing[field])
      ? existing[field].length > 0
      : existing[field] !== null && existing[field] !== undefined && clean(existing[field]) !== '';

    if (!hasIncoming) continue;
    if (mode === 'overwrite-mapped' || !hasExisting) merged[field] = incomingValue;
  }

  merged.weekly_hours = {
    ...(existing.weekly_hours && typeof existing.weekly_hours === 'object' ? existing.weekly_hours : {}),
    ...(incoming.weekly_hours && typeof incoming.weekly_hours === 'object' ? incoming.weekly_hours : {})
  };

  return merged;
}

function buildImportPlan(existingGyms, imported, mode) {
  const index = currentIndex(existingGyms);
  const next = [...existingGyms];
  const creates = [];
  const updates = [];
  const skipped = [];

  for (const item of imported) {
    const matchIndex = item.keys.map((key) => index.get(key)).find((value) => Number.isInteger(value));

    if (Number.isInteger(matchIndex)) {
      if (mode === 'create-only') {
        skipped.push({ line: item.line, name: item.gym.name, reason: 'duplicato esistente' });
        continue;
      }
      next[matchIndex] = mergeGym(next[matchIndex], item.gym, mode);
      updates.push({ line: item.line, name: item.gym.name });
      continue;
    }

    next.push(item.gym);
    creates.push({ line: item.line, name: item.gym.name });
    item.keys.forEach((key) => index.set(key, next.length - 1));
  }

  return {
    next,
    report: {
      beforeCount: existingGyms.length,
      afterCount: next.length,
      createCount: creates.length,
      updateCount: updates.length,
      skipCount: skipped.length,
      creates: creates.slice(0, 20),
      updates: updates.slice(0, 20),
      skipped: skipped.slice(0, 20)
    }
  };
}

function fingerprint(gyms) {
  return createHash('sha256')
    .update(JSON.stringify(gyms.map((gym) => [gym.id, gym.name, gym.city, gym.address, gym.updated_at || ''])))
    .digest('hex');
}

function confirmationToken({ csvText, mapping, mode, gyms }) {
  return createHash('sha256')
    .update(JSON.stringify({ csvText, mapping, mode, fingerprint: fingerprint(gyms) }))
    .digest('hex');
}

function normalizeMode(value) {
  return ['create-only', 'fill-empty', 'overwrite-mapped'].includes(value) ? value : 'fill-empty';
}

async function backupGyms(gyms) {
  await mkdir(IMPORT_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(IMPORT_BACKUP_DIR, `before-import-${stamp}.json`);
  const csvPath = path.join(IMPORT_BACKUP_DIR, `before-import-${stamp}.csv`);
  await writeFile(jsonPath, JSON.stringify(gyms, null, 2), 'utf-8');
  await writeFile(csvPath, gymsToAdminCsv(gyms), 'utf-8');
  return { jsonPath, csvPath };
}

function parseRequest(form) {
  const csvText = clean(form.get('csv_text'));
  const mapping = parseMapping(form.get('mapping_json'));
  const mode = normalizeMode(clean(form.get('mode')));

  if (!csvText) return { error: 'CSV mancante. Ricarica il file e riprova.' };

  const parsed = parseCsv(csvText);
  const headers = parsed[0] || [];
  const rows = parsed.slice(1);
  if (!headers.length || !rows.length) return { error: 'CSV vuoto o senza righe importabili.' };

  const validation = validateMappedRows(headers, rows, mapping);
  if (validation.missingMapping.length) {
    return { error: `Mapping incompleto: collega ${validation.missingMapping.join(', ')}.` };
  }

  if (validation.errors.length) {
    return {
      error: 'Import bloccato: correggi gli errori nel CSV prima di confermare.',
      validationErrors: validation.errors.slice(0, 20)
    };
  }

  return { csvText, mapping, mode, imported: validation.imported };
}

export const actions = {
  dryRun: async ({ request }) => {
    if (!canPersistWrites()) {
      return fail(503, { error: 'Import non disponibile: le modifiche non sono persistenti in questo ambiente.' });
    }

    const form = await request.formData();
    const parsed = parseRequest(form);
    if (parsed.error) return fail(400, parsed);

    const gyms = await readGyms();
    const { report } = buildImportPlan(gyms, parsed.imported, parsed.mode);

    return {
      dryRun: true,
      report,
      mode: parsed.mode,
      confirmationToken: confirmationToken({
        csvText: parsed.csvText,
        mapping: parsed.mapping,
        mode: parsed.mode,
        gyms
      }),
      csvText: parsed.csvText,
      mappingJson: JSON.stringify(parsed.mapping)
    };
  },

  confirmImport: async ({ request }) => {
    if (!canPersistWrites()) {
      return fail(503, { error: 'Import non disponibile: le modifiche non sono persistenti in questo ambiente.' });
    }

    const form = await request.formData();
    const parsed = parseRequest(form);
    if (parsed.error) return fail(400, parsed);

    const providedToken = clean(form.get('confirmation_token'));
    const gyms = await readGyms();
    const expectedToken = confirmationToken({
      csvText: parsed.csvText,
      mapping: parsed.mapping,
      mode: parsed.mode,
      gyms
    });

    if (!providedToken || providedToken !== expectedToken) {
      return fail(409, {
        error:
          'Conferma scaduta o dati cambiati dopo il dry-run. Riesegui il controllo prima di importare.'
      });
    }

    const { next, report } = buildImportPlan(gyms, parsed.imported, parsed.mode);

    try {
      const backup = await backupGyms(gyms);
      await writeGyms(next);
      return {
        imported: true,
        report,
        backup
      };
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Import non riuscito.') });
    }
  }
};
