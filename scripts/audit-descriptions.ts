import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Gym = Record<string, any>;
type Severity = 'bassa' | 'media' | 'alta';

type AuditRow = {
  id: string;
  slug: string;
  nome: string;
  citta: string;
  indirizzo: string;
  disciplina_principale: string;
  descrizione_attuale: string;
  problemi_rilevati: string;
  severita: Severity;
  motivo: string;
  suggerimento_operativo: string;
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
const jsonOut = args.get('--json-out') || `data/descriptions-audit-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/descriptions-audit-${stamp}.csv`;

const SHORT_DESCRIPTION_LIMIT = 120;
const NEAR_DUPLICATE_THRESHOLD = 0.84;

const GENERIC_PATTERNS = [
  /\bstruttura sportiva\b/i,
  /\bpalestra\b/i,
  /\bcentro fitness\b/i,
  /\binformazioni disponibili\b/i,
  /\bcontatti,?\s+orari\b/i,
  /\bpotrebbero richiedere ulteriore verifica\b/i,
  /\bconfrontarla con altre palestre\b/i,
  /\bservizi disponibili\b/i
];

const COMMERCIAL_PATTERN =
  /\b(prezzo|prezzi|tariffa|tariffe|abbonamento|abbonamenti|quota|quote|promo|promozione|offerta|sconto|gratis|gratuito|chf|eur|euro|\d+\s*(?:chf|eur|euro))\b/i;

const DISCIPLINE_KEYWORDS: Record<string, string[]> = {
  fitness: ['fitness', 'palestra', 'allenamento'],
  calcio: ['calcio', 'football'],
  yoga: ['yoga'],
  pilates: ['pilates'],
  boxe: ['boxe', 'boxing'],
  'kick boxing': ['kick boxing', 'kickboxing', 'k1'],
  kickboxe: ['kickboxe', 'kickboxing', 'k1'],
  mma: ['mma', 'arti marziali miste'],
  karate: ['karate'],
  judo: ['judo'],
  scherma: ['scherma'],
  basket: ['basket', 'pallacanestro'],
  nuoto: ['nuoto', 'swimming'],
  padel: ['padel'],
  crossfit: ['crossfit'],
  'personal training': ['personal training', 'personal trainer'],
  'ems training': ['ems', 'elettrostimolazione']
};

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseEnvValue(value: string) {
  const trimmed = clean(value);
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

function ensureStagingOnly(supabaseUrl: string) {
  const envName = fold(process.env.SUPABASE_ENV);
  const targetEnv = fold(process.env.VERCEL_ENV || process.env.VERCEL_TARGET_ENV);
  const url = fold(supabaseUrl);
  const tableName = fold(table);
  const looksProduction =
    envName === 'production' ||
    envName === 'prod' ||
    targetEnv === 'production' ||
    url.includes('prod') ||
    tableName.includes('prod');

  if (envName !== 'staging' || looksProduction) {
    throw new Error('Audit bloccato: descriptions:audit legge solo staging/preview con SUPABASE_ENV=staging.');
  }
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'count=exact'
  };
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=5000`, {
    headers: headers(key)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Lettura staging non riuscita (${response.status}). ${details}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function archivedAt(gym: Gym) {
  const weeklyHours = gym?.weekly_hours && typeof gym.weekly_hours === 'object' && !Array.isArray(gym.weekly_hours) ? gym.weekly_hours : {};
  return clean(gym?.deleted_at || weeklyHours._deleted_at);
}

function activeGym(gym: Gym) {
  return !archivedAt(gym);
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
  return clean(gym.slug || gym._canonical_slug || gym.id);
}

function disciplineList(gym: Gym) {
  const raw = Array.isArray(gym.disciplines) && gym.disciplines.length
    ? gym.disciplines
    : clean(gym.discipline || gym.disciplina || gym.disciplina_principale || gym.discipline_text)
        .split('|')
        .map(clean)
        .filter(Boolean);
  return raw.length ? raw : ['Fitness'];
}

function primaryDiscipline(gym: Gym) {
  return clean(disciplineList(gym)[0]) || 'Fitness';
}

function currentDescription(gym: Gym) {
  return clean(
    gym.descrizione_pubblica ||
      gym.descrizione_owner ||
      gym.descrizione_editoriale ||
      gym.descrizione_generata ||
      gym.descrizione ||
      gym.description ||
      gym.presentazione ||
      gym.editorial_summary
  );
}

function normalizedName(value: string) {
  return fold(value).replace(/\b(a\s*s\s*d|asd|srl|ssd|societa sportiva|palestra|fitness club|club)\b/g, '').replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string) {
  return new Set(
    fold(value)
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function jaccardSimilarity(left: string, right: string) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function containsOtherValue(description: string, ownValue: string, values: string[]) {
  const text = fold(description);
  const own = fold(ownValue);
  return values.find((value) => {
    const normalized = fold(value);
    return normalized.length >= 4 && normalized !== own && text.includes(normalized);
  }) || '';
}

function containsPrimaryDiscipline(description: string, primary: string) {
  const text = fold(description);
  const discipline = fold(primary);
  const keywords = DISCIPLINE_KEYWORDS[discipline] || [discipline];
  return keywords.some((keyword) => text.includes(fold(keyword)));
}

function containsOtherDiscipline(description: string, primary: string) {
  const text = fold(description);
  const primaryFolded = fold(primary);
  return Object.entries(DISCIPLINE_KEYWORDS).find(([discipline, keywords]) => {
    if (discipline === primaryFolded) return false;
    return keywords.some((keyword) => text.includes(fold(keyword)));
  })?.[0] || '';
}

function isGeneric(description: string) {
  if (!description) return false;
  const matches = GENERIC_PATTERNS.filter((pattern) => pattern.test(description)).length;
  return matches >= 2 || tokenSet(description).size < 18;
}

function duplicateNameGroups(gyms: Gym[]) {
  const byName = new Map<string, Gym[]>();
  const byNameCity = new Map<string, Gym[]>();
  const byUniqueKey = new Map<string, Gym[]>();

  for (const gym of gyms) {
    const nameKey = normalizedName(nameOf(gym));
    const cityKey = fold(cityOf(gym));
    const addressKey = fold(addressOf(gym));
    const keys = [
      [byName, nameKey],
      [byNameCity, `${nameKey}|${cityKey}`],
      [byUniqueKey, `${nameKey}|${cityKey}|${addressKey}`]
    ] as const;
    for (const [map, key] of keys) {
      if (!key.replace(/\|/g, '')) continue;
      map.set(key, [...(map.get(key) || []), gym]);
    }
  }

  return { byName, byNameCity, byUniqueKey };
}

function duplicateDescriptionGroups(gyms: Gym[]) {
  const byDescription = new Map<string, Gym[]>();
  for (const gym of gyms) {
    const description = currentDescription(gym);
    if (!description) continue;
    const key = fold(description);
    byDescription.set(key, [...(byDescription.get(key) || []), gym]);
  }
  return byDescription;
}

function nearDuplicateMatch(gym: Gym, description: string, gyms: Gym[]) {
  let best = { id: '', name: '', score: 0 };
  if (description.length < 80) return best;

  for (const other of gyms) {
    if (clean(other.id) === clean(gym.id)) continue;
    const otherDescription = currentDescription(other);
    if (otherDescription.length < 80) continue;
    const score = jaccardSimilarity(description, otherDescription);
    if (score > best.score) best = { id: clean(other.id), name: nameOf(other), score };
  }

  return best.score >= NEAR_DUPLICATE_THRESHOLD ? best : { id: '', name: '', score: best.score };
}

function severityFor(problems: string[]) {
  if (
    problems.some((problem) =>
      [
        'descrizione che cita altra palestra',
        'descrizione che cita altra città',
        'descrizione potenzialmente contaminata',
        'descrizione incoerente con città'
      ].includes(problem)
    )
  ) {
    return 'alta';
  }
  if (
    problems.some((problem) =>
      [
        'descrizione duplicata',
        'descrizione quasi duplicata',
        'descrizione con prezzo/promozione non verificata',
        'descrizione incoerente con disciplina principale',
        'nome duplicato o catena con più sedi'
      ].includes(problem)
    )
  ) {
    return 'media';
  }
  return 'bassa';
}

function suggestionFor(problems: string[]) {
  if (!problems.length) return 'Nessuna azione immediata: mantenere monitoraggio periodico.';
  if (problems.includes('descrizione potenzialmente contaminata') || problems.includes('descrizione che cita altra palestra')) {
    return 'Review manuale prioritaria: confrontare descrizione, nome, città e fonte della singola scheda.';
  }
  if (problems.includes('descrizione duplicata') || problems.includes('descrizione quasi duplicata')) {
    return 'Review editoriale: differenziare la descrizione usando solo dati della sede specifica.';
  }
  if (problems.includes('nome duplicato o catena con più sedi')) {
    return 'Verificare sede, città e indirizzo; assicurare una descrizione distinta per ogni sede.';
  }
  if (problems.includes('descrizione mancante') || problems.includes('descrizione troppo corta')) {
    return 'Mettere in coda per descrizione editoriale sicura dopo review dati scheda.';
  }
  return 'Review manuale consigliata prima di pubblicare o mantenere la descrizione.';
}

function buildAuditRows(activeGyms: Gym[]) {
  const knownNames = [...new Set(activeGyms.map(nameOf).filter((name) => fold(name).length >= 6))];
  const knownCities = [...new Set(activeGyms.map(cityOf).filter((city) => fold(city).length >= 4))];
  const descriptionGroups = duplicateDescriptionGroups(activeGyms);
  const nameGroups = duplicateNameGroups(activeGyms);

  return activeGyms.map((gym) => {
    const id = clean(gym.id);
    const description = currentDescription(gym);
    const primary = primaryDiscipline(gym);
    const otherGym = description ? containsOtherValue(description, nameOf(gym), knownNames) : '';
    const otherCity = description ? containsOtherValue(description, cityOf(gym), knownCities) : '';
    const exactDuplicates = description ? (descriptionGroups.get(fold(description)) || []).filter((item) => clean(item.id) !== id) : [];
    const nearDuplicate = nearDuplicateMatch(gym, description, activeGyms);
    const nameKey = normalizedName(nameOf(gym));
    const nameCityKey = `${nameKey}|${fold(cityOf(gym))}`;
    const sameName = nameKey ? (nameGroups.byName.get(nameKey) || []).filter((item) => clean(item.id) !== id) : [];
    const sameNameCity = nameCityKey ? (nameGroups.byNameCity.get(nameCityKey) || []).filter((item) => clean(item.id) !== id) : [];
    const otherDiscipline = description ? containsOtherDiscipline(description, primary) : '';
    const mentionsPrimary = description ? containsPrimaryDiscipline(description, primary) : false;

    const problems = [
      !description ? 'descrizione mancante' : '',
      description && description.length < SHORT_DESCRIPTION_LIMIT ? 'descrizione troppo corta' : '',
      description && isGeneric(description) ? 'descrizione troppo generica' : '',
      exactDuplicates.length ? 'descrizione duplicata' : '',
      nearDuplicate.id ? 'descrizione quasi duplicata' : '',
      otherGym ? 'descrizione che cita altra palestra' : '',
      otherCity ? 'descrizione che cita altra città' : '',
      description && COMMERCIAL_PATTERN.test(description) && !gym.verified_commercial_info && !gym.price_verified ? 'descrizione con prezzo/promozione non verificata' : '',
      description && !mentionsPrimary ? 'descrizione incoerente con disciplina principale' : '',
      description && cityOf(gym) && !fold(description).includes(fold(cityOf(gym))) ? 'descrizione incoerente con città' : '',
      sameName.length ? 'nome duplicato o catena con più sedi' : '',
      otherGym || otherCity || (nearDuplicate.id && normalizedName(nearDuplicate.name) !== nameKey) || (otherDiscipline && !mentionsPrimary)
        ? 'descrizione potenzialmente contaminata'
        : ''
    ].filter(Boolean);

    const reasons = [
      !description ? 'nessuna descrizione disponibile' : '',
      description && description.length < SHORT_DESCRIPTION_LIMIT ? `lunghezza ${description.length} caratteri` : '',
      exactDuplicates.length ? `duplicata con ${exactDuplicates.map((item) => clean(item.id)).slice(0, 3).join(', ')}` : '',
      nearDuplicate.id ? `quasi duplicata con ${nearDuplicate.id} (${nearDuplicate.score.toFixed(2)})` : '',
      otherGym ? `cita altra palestra: ${otherGym}` : '',
      otherCity ? `cita altra città: ${otherCity}` : '',
      sameName.length ? `stesso nome su ${sameName.length + 1} schede` : '',
      sameNameCity.length ? `stesso nome e città su ${sameNameCity.length + 1} schede` : '',
      otherDiscipline && !mentionsPrimary ? `cita disciplina ${otherDiscipline} ma non ${primary}` : '',
      description && cityOf(gym) && !fold(description).includes(fold(cityOf(gym))) ? `non cita la città della scheda: ${cityOf(gym)}` : ''
    ].filter(Boolean);

    return {
      id,
      slug: slugOf(gym),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina_principale: primary,
      descrizione_attuale: description,
      problemi_rilevati: problems.length ? [...new Set(problems)].join(' | ') : 'nessuno',
      severita: severityFor(problems),
      motivo: reasons.length ? reasons.join(' | ') : 'nessun problema rilevato dalle euristiche',
      suggerimento_operativo: suggestionFor(problems)
    } satisfies AuditRow;
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
    'città',
    'indirizzo',
    'disciplina_principale',
    'descrizione_attuale',
    'problemi_rilevati',
    'severità',
    'motivo',
    'suggerimento_operativo'
  ];
  const rowKey: Record<string, keyof AuditRow> = {
    città: 'citta',
    severità: 'severita'
  };

  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[rowKey[header] || (header as keyof AuditRow)])).join(';'))].join('\n');
}

function countProblem(rows: AuditRow[], label: string) {
  return rows.filter((row) => row.problemi_rilevati.split('|').map((item) => item.trim()).includes(label)).length;
}

function problemScore(row: AuditRow) {
  const severityWeight = row.severita === 'alta' ? 100 : row.severita === 'media' ? 50 : 10;
  const problemCount = row.problemi_rilevati === 'nessuno' ? 0 : row.problemi_rilevati.split('|').length;
  return severityWeight + problemCount;
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!readKey) throw new Error('Missing Supabase read key for staging descriptions audit.');
ensureStagingOnly(supabaseUrl);

const allGyms = await readGyms(supabaseUrl, readKey);
const activeGyms = allGyms.filter(activeGym);
const archivedGyms = allGyms.filter((gym) => !activeGym(gym));
const rows = buildAuditRows(activeGyms);
const problemRows = rows.filter((row) => row.problemi_rilevati !== 'nessuno');

const categories = [
  'descrizione mancante',
  'descrizione troppo corta',
  'descrizione troppo generica',
  'descrizione duplicata',
  'descrizione quasi duplicata',
  'descrizione che cita altra palestra',
  'descrizione che cita altra città',
  'descrizione con prezzo/promozione non verificata',
  'descrizione incoerente con disciplina principale',
  'descrizione incoerente con città',
  'nome duplicato o catena con più sedi',
  'descrizione potenzialmente contaminata'
];

const payload = {
  generated_at: new Date().toISOString(),
  source: {
    env_file: envFile,
    table,
    target: 'staging',
    mode: 'read_only'
  },
  total_records: allGyms.length,
  archived_records_excluded: archivedGyms.length,
  archived_ids_excluded: archivedGyms.map((gym) => clean(gym.id)).filter(Boolean),
  active_records: activeGyms.length,
  rows_with_problems: problemRows.length,
  issue_summary: Object.fromEntries(categories.map((category) => [category, countProblem(rows, category)])),
  severity_summary: {
    alta: rows.filter((row) => row.severita === 'alta' && row.problemi_rilevati !== 'nessuno').length,
    media: rows.filter((row) => row.severita === 'media').length,
    bassa: rows.filter((row) => row.severita === 'bassa' && row.problemi_rilevati !== 'nessuno').length,
    nessun_problema: rows.filter((row) => row.problemi_rilevati === 'nessuno').length
  },
  top_20_problematiche: [...problemRows].sort((a, b) => problemScore(b) - problemScore(a) || a.nome.localeCompare(b.nome, 'it')).slice(0, 20),
  rows
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(csvOut, `${toCsv(rows)}\n`, 'utf8');

console.log(`[descriptions:audit] active=${activeGyms.length} rows_with_problems=${problemRows.length}`);
console.log(`[descriptions:audit] json=${jsonOut}`);
console.log(`[descriptions:audit] csv=${csvOut}`);
