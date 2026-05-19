import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  descriptionIssues,
  duplicateRiskForGym,
  generateGymDescription,
  needsGeneratedDescription,
  pickPublicDescription,
  scoreDescription,
  similarityScore
} from '../src/lib/gym-description.js';

type Gym = Record<string, any>;

const args = new Set(process.argv.slice(2));
const valueArg = (name: string, fallback = '') => {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const mode = valueArg('--mode', args.has('--apply') ? 'apply' : args.has('--audit') ? 'audit' : 'dry-run');
const envFile = valueArg('--env-file', '.env.staging.local');
const allowProduction = args.has('--allow-production');
const confirmApply = args.has('--confirm-apply');
const now = new Date().toISOString();
const stamp = now.replace(/[:.]/g, '-');
const previewCsv = `data/description-generation-preview-${stamp}.csv`;
const previewJson = `data/description-generation-preview-${stamp}.json`;
const auditJson = `data/description-audit-${stamp}.json`;

function parseEnvValue(value: string) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
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

function ensureStagingTarget(supabaseUrl: string, table: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  const tableName = String(table || '').toLowerCase();
  const looksProduction =
    envName === 'production' ||
    envName === 'prod' ||
    tableName.includes('prod') ||
    url.includes('prod');

  if ((looksProduction || envName !== 'staging') && !allowProduction) {
    throw new Error('Target bloccato: usa SUPABASE_ENV=staging per preview/staging. Production richiede flag manuale dedicato.');
  }
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function activeGym(gym: Gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name);
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function slugOf(gym: Gym) {
  return clean(gym.slug || gym._canonical_slug || gym.id);
}

function primaryDiscipline(gym: Gym) {
  if (Array.isArray(gym.disciplines) && gym.disciplines.length) return clean(gym.disciplines[0]);
  return clean(gym.discipline || gym.discipline_text || 'Fitness');
}

function currentDescription(gym: Gym) {
  return clean(gym.descrizione || gym.description || gym.presentazione);
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, any>[]) {
  const headers = [
    'id',
    'slug',
    'nome',
    'citta',
    'disciplina_principale',
    'descrizione_attuale',
    'descrizione_generata',
    'motivo_generazione',
    'quality_score_before',
    'quality_score_after',
    'needs_review',
    'duplicate_risk'
  ];
  return [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))
  ].join('\n');
}

async function readGyms(baseUrl: string, table: string, key: string) {
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=2000`,
    { headers: supabaseHeaders(key, { Prefer: 'count=exact' }) }
  );

  if (!response.ok) {
    throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function patchGym(baseUrl: string, table: string, key: string, id: string, patch: Record<string, any>) {
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(key, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(patch)
    }
  );

  if (!response.ok) {
    throw new Error(`Update ${id} non riuscito (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

function contextFor(gyms: Gym[]) {
  return {
    names: [...new Set(gyms.map(nameOf).filter(Boolean))],
    cities: [...new Set(gyms.map(cityOf).filter(Boolean))]
  };
}

function similarDescriptionRisk(description: string, gym: Gym, gyms: Gym[]) {
  let maxScore = 0;
  let matchedId = '';
  for (const other of gyms) {
    if (other.id === gym.id) continue;
    const otherDescription = currentDescription(other) || clean(other.descrizione_generata);
    if (!otherDescription) continue;
    const score = similarityScore(description, otherDescription);
    if (score > maxScore) {
      maxScore = score;
      matchedId = other.id;
    }
  }

  return {
    maxScore,
    matchedId,
    duplicate: maxScore >= 0.98,
    nearDuplicate: maxScore >= 0.85
  };
}

function auditRows(activeGyms: Gym[]) {
  const context = contextFor(activeGyms);
  const byDescription = new Map<string, Gym[]>();
  for (const gym of activeGyms) {
    const description = currentDescription(gym);
    if (!description) continue;
    const key = description.toLowerCase();
    byDescription.set(key, [...(byDescription.get(key) || []), gym]);
  }

  return activeGyms.flatMap((gym) => {
    const description = currentDescription(gym);
    const baseIssues = descriptionIssues(gym, description, context);
    const duplicateGroup = description ? byDescription.get(description.toLowerCase()) || [] : [];
    const similar = similarDescriptionRisk(description, gym, activeGyms);
    const issues = [
      ...baseIssues,
      ...(duplicateGroup.length > 1 ? ['duplicata'] : []),
      ...(similar.nearDuplicate ? ['quasi_duplicata'] : [])
    ];

    if (!issues.length && scoreDescription(gym, description, { ...context, ...similar }) >= 65) return [];

    return [{
      id: gym.id,
      slug: slugOf(gym),
      nome: nameOf(gym),
      citta: cityOf(gym),
      disciplina_principale: primaryDiscipline(gym),
      descrizione_attuale: description,
      tipo_problema: issues.join(', ') || 'quality_score_basso',
      rischio: similar.nearDuplicate ? `similarita_${similar.maxScore.toFixed(2)}_con_${similar.matchedId}` : 'da_migliorare',
      quality_score: scoreDescription(gym, description, { ...context, ...similar })
    }];
  });
}

function generationRows(activeGyms: Gym[]) {
  const context = contextFor(activeGyms);
  return activeGyms
    .filter((gym) => needsGeneratedDescription(gym, context))
    .map((gym) => {
      const before = currentDescription(gym);
      const generated = generateGymDescription(gym, activeGyms);
      const similar = similarDescriptionRisk(generated.description, gym, activeGyms);
      const qualityBefore = scoreDescription(gym, before, { ...context, ...similar });
      const qualityAfter = scoreDescription(gym, generated.description, { ...context, ...similar });
      const duplicateRisk = generated.duplicateRisk || duplicateRiskForGym(gym, activeGyms);
      const needsReview =
        similar.nearDuplicate ||
        (duplicateRisk === 'same_name' && !cityOf(gym)) ||
        (duplicateRisk === 'same_name_same_city' && !clean(gym.indirizzo || gym.address)) ||
        qualityAfter < 70;

      return {
        id: gym.id,
        slug: slugOf(gym),
        nome: nameOf(gym),
        citta: cityOf(gym),
        disciplina_principale: primaryDiscipline(gym),
        descrizione_attuale: before,
        descrizione_generata: generated.description,
        motivo_generazione: generated.reason,
        quality_score_before: qualityBefore,
        quality_score_after: qualityAfter,
        needs_review: needsReview,
        duplicate_risk: similar.nearDuplicate
          ? `similarita_${similar.maxScore.toFixed(2)}_con_${similar.matchedId}`
          : duplicateRisk
      };
    });
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const table = process.env.SUPABASE_GYMS_TABLE || 'gyms';
ensureStagingTarget(supabaseUrl, table);

const gyms = await readGyms(supabaseUrl, table, serviceKey);
const activeGyms = gyms.filter(activeGym);
await mkdir('data', { recursive: true });

if (mode === 'audit') {
  const rows = auditRows(activeGyms);
  await writeFile(auditJson, `${JSON.stringify({ mode, generated_at: now, total: gyms.length, active: activeGyms.length, problem_count: rows.length, rows }, null, 2)}\n`);
  console.log(`[descriptions:audit] total=${gyms.length} active=${activeGyms.length} problems=${rows.length} file=${auditJson}`);
  process.exit(0);
}

const rows = generationRows(activeGyms);
await writeFile(previewJson, `${JSON.stringify({ mode, generated_at: now, total: gyms.length, active: activeGyms.length, change_count: rows.length, rows }, null, 2)}\n`);
await writeFile(previewCsv, `${toCsv(rows)}\n`);

if (mode !== 'apply') {
  console.log(`[descriptions:dry-run] total=${gyms.length} active=${activeGyms.length} candidates=${rows.length} json=${previewJson} csv=${previewCsv}`);
  process.exit(0);
}

if (!confirmApply) {
  throw new Error('Apply bloccato: aggiungi --confirm-apply dopo aver revisionato il CSV/JSON di dry-run.');
}

const applied = [];
for (const row of rows) {
  const patch = {
    descrizione_generata: row.descrizione_generata,
    descrizione_pubblica: row.needs_review ? '' : row.descrizione_generata,
    descrizione_source: row.needs_review ? 'generata_da_revisionare' : 'generata_dry_run_approvata',
    descrizione_quality_score: row.quality_score_after,
    descrizione_needs_review: row.needs_review
  };
  const result = await patchGym(supabaseUrl, table, serviceKey, row.id, patch);
  applied.push({ id: row.id, result_count: Array.isArray(result) ? result.length : 0 });
}

console.log(`[descriptions:apply] applied=${applied.length} preview_json=${previewJson} preview_csv=${previewCsv}`);
