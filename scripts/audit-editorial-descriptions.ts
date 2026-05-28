import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDisciplineLabel } from '../src/lib/disciplines.js';
import { scoreDescription, similarityScore } from '../src/lib/gym-description.js';

type Gym = Record<string, any>;
type AuditRow = {
  id: string;
  slug: string;
  nome: string;
  citta: string;
  indirizzo: string;
  disciplina_principale: string;
  descrizione_attuale: string;
  descrizione_mancante: boolean;
  descrizione_troppo_corta: boolean;
  descrizione_duplicata: boolean;
  descrizione_quasi_duplicata: boolean;
  descrizione_troppo_generica: boolean;
  cita_altra_palestra: boolean;
  cita_altra_citta: boolean;
  contiene_prezzo_promozione_non_verificata: boolean;
  descrizione_contaminata: boolean;
  descrizione_troppo_commerciale: boolean;
  non_coerente_con_disciplina_citta: boolean;
  issue_types: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rischio: string;
  duplicate_match_id: string;
  duplicate_similarity: number;
  quality_score: number;
  needs_review: boolean;
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/editorial-audit-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/editorial-audit-${stamp}.csv`;

const PROMOTION_PATTERN =
  /\b(gratis|gratuit[aoie]?|promo|promozione|offerta|sconto|coupon|trial|prova gratuita|chf|eur|euro|\$|€|\d+\s*(?:chf|eur|euro|€))\b/i;

const COMMERCIAL_PATTERN =
  /\b(miglior[ei]?|leader|numero uno|imperdibile|professionisti qualificati|attrezzature moderne|prezzi convenienti|corsi per tutti i livelli|offerta|promo|promozione|sconto|conveniente|esclusiv[aoie])\b/i;

const GENERIC_PHRASES = [
  'palestra fitness',
  'centro fitness',
  'struttura sportiva',
  'ambiente accogliente',
  'ampia gamma di corsi',
  'corsi per tutti i livelli',
  'attrezzature moderne',
  'professionisti qualificati',
  'raggiungere i tuoi obiettivi',
  'forma fisica'
];

const EXTRA_CITIES = [
  'Varese',
  'Lugano',
  'Gallarate',
  'Busto Arsizio',
  'Busto Garolfo',
  'Cardano al Campo',
  'Cassano Magnago',
  'Luino',
  'Saronno',
  'Chiasso',
  'Mendrisio',
  'Bellinzona',
  'Giubiasco',
  'Locarno',
  'Losone',
  'Massagno',
  'Rozzano'
];

function parseEnvValue(value: string) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function ensureStagingTarget(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  const tableName = String(table || '').toLowerCase();
  const looksProduction = envName === 'production' || envName === 'prod' || targetEnv === 'production' || url.includes('prod') || tableName.includes('prod');

  if (envName !== 'staging' || looksProduction) {
    throw new Error('Audit bloccato: usa solo staging/preview con SUPABASE_ENV=staging. Production non consentita per editorial:audit.');
  }
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokens(value: unknown) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function activeGym(gym: Gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function slugPart(value: unknown) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function idOf(gym: Gym) {
  return clean(gym.id);
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name);
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function addressOf(gym: Gym) {
  return clean(gym.indirizzo || gym.address);
}

function slugOf(gym: Gym) {
  return clean(gym.slug || gym._canonical_slug) || slugPart(nameOf(gym)) || idOf(gym);
}

function disciplineList(gym: Gym) {
  const raw = Array.isArray(gym.disciplines) && gym.disciplines.length
    ? gym.disciplines
    : clean(gym.discipline || gym.disciplina_principale || gym.discipline_text)
        .split('|')
        .map(clean)
        .filter(Boolean);
  const normalized = raw.map((item) => normalizeDisciplineLabel(item)).filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ['Fitness'];
}

function primaryDiscipline(gym: Gym) {
  return disciplineList(gym)[0] || 'Fitness';
}

function currentDescription(gym: Gym) {
  return clean(gym.descrizione_pubblica || gym.descrizione_editoriale || gym.descrizione || gym.description || gym.presentazione || gym.editorial_summary);
}

function verifiedCommercialData(gym: Gym) {
  return Boolean(gym.price_verified || gym.verified_commercial_info || gym.commercial_info_last_checked_at || gym.weekly_hours?._price_verified);
}

function relevantKnownNames(gyms: Gym[]) {
  return [...new Set(gyms.map(nameOf).filter((name) => fold(name).length >= 8))];
}

function relevantKnownCities(gyms: Gym[]) {
  return [...new Set([...EXTRA_CITIES, ...gyms.map(cityOf)].map(clean).filter((city) => fold(city).length >= 4))];
}

function containsKnownOtherValue(text: string, ownValue: string, knownValues: string[]) {
  const normalizedText = fold(text);
  const normalizedOwn = fold(ownValue);
  return knownValues.find((value) => {
    const normalizedValue = fold(value);
    return normalizedValue && normalizedValue !== normalizedOwn && normalizedText.includes(normalizedValue);
  }) || '';
}

function isGenericDescription(description: string) {
  const normalized = fold(description);
  if (!normalized) return false;
  if (tokens(normalized).length <= 5) return true;
  return GENERIC_PHRASES.some((phrase) => normalized.includes(fold(phrase)));
}

function hasDisciplineCoherenceIssue(gym: Gym, description: string, knownCities: string[]) {
  if (!description) return false;
  const city = cityOf(gym);
  const primary = primaryDiscipline(gym);
  const folded = fold(description);
  const citesOtherCity = Boolean(containsKnownOtherValue(description, city, knownCities));
  const missingCity = Boolean(city) && !folded.includes(fold(city));
  const missingPrimary = Boolean(primary) && !folded.includes(fold(primary));
  return citesOtherCity || missingCity || missingPrimary;
}

function duplicateInfo(gym: Gym, description: string, gyms: Gym[], descriptionsByKey: Map<string, Gym[]>) {
  if (!description) {
    return { duplicate: false, nearDuplicate: false, matchId: '', score: 0 };
  }

  const exactGroup = descriptionsByKey.get(fold(description)) || [];
  const exactMatch = exactGroup.find((item) => idOf(item) !== idOf(gym));
  if (exactMatch) {
    return { duplicate: true, nearDuplicate: false, matchId: idOf(exactMatch), score: 1 };
  }

  let bestScore = 0;
  let matchId = '';
  for (const other of gyms) {
    if (idOf(other) === idOf(gym)) continue;
    const otherDescription = currentDescription(other);
    if (otherDescription.length < 80 || description.length < 80) continue;
    const score = similarityScore(description, otherDescription);
    if (score > bestScore) {
      bestScore = score;
      matchId = idOf(other);
    }
  }

  return { duplicate: false, nearDuplicate: bestScore >= 0.85, matchId, score: bestScore };
}

function severityFor(row: Pick<AuditRow, 'descrizione_contaminata' | 'cita_altra_palestra' | 'cita_altra_citta' | 'non_coerente_con_disciplina_citta' | 'descrizione_duplicata' | 'descrizione_quasi_duplicata' | 'contiene_prezzo_promozione_non_verificata'>): AuditRow['severity'] {
  if (row.descrizione_contaminata || row.cita_altra_palestra || row.cita_altra_citta) return 'critical';
  if (row.non_coerente_con_disciplina_citta || row.contiene_prezzo_promozione_non_verificata) return 'high';
  if (row.descrizione_duplicata || row.descrizione_quasi_duplicata) return 'medium';
  return 'low';
}

function buildAuditRows(activeGyms: Gym[]) {
  const knownNames = relevantKnownNames(activeGyms);
  const knownCities = relevantKnownCities(activeGyms);
  const descriptionsByKey = new Map<string, Gym[]>();

  for (const gym of activeGyms) {
    const description = currentDescription(gym);
    if (!description) continue;
    const key = fold(description);
    descriptionsByKey.set(key, [...(descriptionsByKey.get(key) || []), gym]);
  }

  const rows: AuditRow[] = [];
  for (const gym of activeGyms) {
    const description = currentDescription(gym);
    const duplicate = duplicateInfo(gym, description, activeGyms, descriptionsByKey);
    const otherGym = containsKnownOtherValue(description, nameOf(gym), knownNames);
    const otherCity = containsKnownOtherValue(description, cityOf(gym), knownCities);
    const tooShort = Boolean(description && description.length < 120);
    const missing = !description;
    const tooGeneric = Boolean(description && isGenericDescription(description));
    const unverifiedCommercial = Boolean(description && PROMOTION_PATTERN.test(description) && !verifiedCommercialData(gym));
    const tooCommercial = Boolean(description && COMMERCIAL_PATTERN.test(description) && !verifiedCommercialData(gym));
    const incoherent = hasDisciplineCoherenceIssue(gym, description, knownCities);
    const contaminated = Boolean(otherGym || otherCity || (duplicate.nearDuplicate && nameOf(gym) && duplicate.matchId));

    const flags = {
      descrizione_mancante: missing,
      descrizione_troppo_corta: tooShort,
      descrizione_duplicata: duplicate.duplicate,
      descrizione_quasi_duplicata: duplicate.nearDuplicate,
      descrizione_troppo_generica: tooGeneric,
      cita_altra_palestra: Boolean(otherGym),
      cita_altra_citta: Boolean(otherCity),
      contiene_prezzo_promozione_non_verificata: unverifiedCommercial,
      descrizione_contaminata: contaminated,
      descrizione_troppo_commerciale: tooCommercial,
      non_coerente_con_disciplina_citta: incoherent
    };

    const issueTypes = Object.entries(flags)
      .filter(([, value]) => value)
      .map(([key]) => key);

    const score = scoreDescription(gym, description, {
      names: knownNames,
      cities: knownCities,
      duplicate: duplicate.duplicate,
      nearDuplicate: duplicate.nearDuplicate
    });

    if (!issueTypes.length && score >= 65) continue;

    const row = {
      id: idOf(gym),
      slug: slugOf(gym),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina_principale: primaryDiscipline(gym),
      descrizione_attuale: description,
      ...flags,
      issue_types: issueTypes.length ? issueTypes.join(', ') : 'quality_score_basso',
      severity: 'low',
      rischio: [
        otherGym ? `cita altra palestra: ${otherGym}` : '',
        otherCity ? `cita altra citta: ${otherCity}` : '',
        duplicate.matchId ? `similarita ${duplicate.score.toFixed(2)} con ${duplicate.matchId}` : ''
      ].filter(Boolean).join(' | ') || 'da revisionare',
      duplicate_match_id: duplicate.matchId,
      duplicate_similarity: Number(duplicate.score.toFixed(3)),
      quality_score: score,
      needs_review: true
    } satisfies AuditRow;

    row.severity = severityFor(row);
    rows.push(row);
  }

  return rows.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity] || a.nome.localeCompare(b.nome, 'it');
  });
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: AuditRow[]) {
  const headers = [
    'id',
    'slug',
    'nome',
    'citta',
    'indirizzo',
    'disciplina_principale',
    'descrizione_attuale',
    'descrizione_mancante',
    'descrizione_troppo_corta',
    'descrizione_duplicata',
    'descrizione_quasi_duplicata',
    'descrizione_troppo_generica',
    'cita_altra_palestra',
    'cita_altra_citta',
    'contiene_prezzo_promozione_non_verificata',
    'descrizione_contaminata',
    'descrizione_troppo_commerciale',
    'non_coerente_con_disciplina_citta',
    'issue_types',
    'severity',
    'rischio',
    'duplicate_match_id',
    'duplicate_similarity',
    'quality_score',
    'needs_review'
  ];

  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof AuditRow])).join(';'))].join('\n');
}

function countBy(rows: AuditRow[], key: keyof AuditRow) {
  return rows.filter((row) => Boolean(row[key])).length;
}

function severitySummary(rows: AuditRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc[row.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=5000`, {
    method: 'GET',
    headers: headers(key)
  });

  if (!response.ok) {
    throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!readKey) throw new Error('Missing Supabase read key for staging audit.');
ensureStagingTarget(supabaseUrl);

const allRows = await readGyms(supabaseUrl, readKey);
const activeRows = allRows.filter(activeGym);
const auditRows = buildAuditRows(activeRows);
const issueGymIds = new Set(auditRows.map((row) => row.id));

const payload = {
  generated_at: new Date().toISOString(),
  source: { env_file: envFile, table, target: 'staging', mode: 'read_only' },
  total_records: allRows.length,
  active_records: activeRows.length,
  audited_problem_rows: auditRows.length,
  gyms_needing_review: issueGymIds.size,
  severity_summary: severitySummary(auditRows),
  issue_summary: {
    descrizione_mancante: countBy(auditRows, 'descrizione_mancante'),
    descrizione_troppo_corta: countBy(auditRows, 'descrizione_troppo_corta'),
    descrizione_duplicata: countBy(auditRows, 'descrizione_duplicata'),
    descrizione_quasi_duplicata: countBy(auditRows, 'descrizione_quasi_duplicata'),
    descrizione_troppo_generica: countBy(auditRows, 'descrizione_troppo_generica'),
    cita_altra_palestra: countBy(auditRows, 'cita_altra_palestra'),
    cita_altra_citta: countBy(auditRows, 'cita_altra_citta'),
    contiene_prezzo_promozione_non_verificata: countBy(auditRows, 'contiene_prezzo_promozione_non_verificata'),
    descrizione_contaminata: countBy(auditRows, 'descrizione_contaminata'),
    descrizione_troppo_commerciale: countBy(auditRows, 'descrizione_troppo_commerciale'),
    non_coerente_con_disciplina_citta: countBy(auditRows, 'non_coerente_con_disciplina_citta')
  },
  needs_review_ids: [...issueGymIds],
  top_30: auditRows.slice(0, 30),
  rows: auditRows
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(csvOut, `${toCsv(auditRows)}\n`, 'utf8');

console.log(
  `[editorial:audit] total=${payload.total_records} active=${payload.active_records} ` +
    `problem_rows=${payload.audited_problem_rows} needs_review=${payload.gyms_needing_review}`
);
console.log(`[editorial:audit] json=${jsonOut}`);
console.log(`[editorial:audit] csv=${csvOut}`);
