import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type JsonRecord = Record<string, any>;
type ReportRow = {
  id: string;
  slug: string;
  nome: string;
  applicata: boolean;
  saltata: boolean;
  errore: string;
  needs_review_saltata: boolean;
  descrizione_precedente: string;
  descrizione_nuova: string;
  motivo_skip: string;
  ambiente: string;
  timestamp: string;
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const previewFile = args.get('--file') || args.get('--preview-file') || '';
const limit = Number(args.get('--limit') || '20');
const includeReview = args.has('--include-review');
const allowProduction = args.has('--allow-production');
const confirmText = args.get('--confirm') || '';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/descriptions-apply-report-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/descriptions-apply-report-${stamp}.csv`;
const CONFIRM_STAGING = 'APPLICA DESCRIZIONI STAGING';
const CONFIRM_PRODUCTION = 'APPLICA DESCRIZIONI PRODUCTION';

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function targetEnvironment(supabaseUrl: string) {
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
  return looksProduction ? 'production' : envName || 'staging';
}

function ensureSafeTarget(environment: string) {
  if (environment === 'production' && !allowProduction) {
    throw new Error('Apply bloccato: production vietata senza --allow-production e conferma testuale dedicata.');
  }
  if (environment !== 'staging' && environment !== 'preview' && environment !== 'production') {
    throw new Error(`Apply bloccato: ambiente non riconosciuto o non staging/preview (${environment}).`);
  }
}

function supabaseHeaders(key: string, extra: JsonRecord = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function activeGym(gym: JsonRecord) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function slugOf(gym: JsonRecord) {
  return clean(gym.slug || gym._canonical_slug || gym.id);
}

function nameOf(gym: JsonRecord) {
  return clean(gym.nome || gym.name);
}

function previousDescription(gym: JsonRecord) {
  return clean(
    gym.descrizione_pubblica ||
      gym.descrizione_generata ||
      gym.descrizione_editoriale ||
      gym.descrizione ||
      gym.description ||
      gym.presentazione ||
      gym.editorial_summary
  );
}

function hasOwnerDescription(gym: JsonRecord) {
  return Boolean(clean(gym.descrizione_owner));
}

function hasVerifiedEditorialDescription(gym: JsonRecord) {
  const source = fold(gym.descrizione_source);
  return Boolean(
    clean(gym.descrizione_editoriale) &&
      (source.includes('verificat') || gym.descrizione_last_reviewed_at || Number(gym.descrizione_quality_score || 0) >= 80)
  );
}

function isTrue(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'si', 'sì', 'yes'].includes(fold(value));
}

function previewRows(payload: JsonRecord) {
  const rows = Array.isArray(payload.rows)
    ? payload.rows
    : Array.isArray(payload.previews)
      ? payload.previews
      : Array.isArray(payload.changes)
        ? payload.changes
        : [];
  return rows.map((row: JsonRecord) => ({
    raw: row,
    id: clean(row.id || row.gym_id),
    descrizione_nuova: clean(
      row.descrizione_nuova ||
        row.descrizione_generata ||
        row.descrizione_proposta ||
        row.generated_description ||
        row.description
    ),
    needs_review: isTrue(row.needs_review)
  }));
}

async function fetchRows(baseUrl: string, key: string, ids: string[]) {
  const quoted = ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&id=in.(${quoted})`, {
    headers: supabaseHeaders(key, { Prefer: 'count=exact' })
  });

  if (!response.ok) {
    throw new Error(`Lettura staging non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return new Map((Array.isArray(rows) ? rows : []).map((row: JsonRecord) => [clean(row.id), row]));
}

async function patchGym(baseUrl: string, key: string, id: string, patch: JsonRecord) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(key, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    throw new Error(`Update ${id} non riuscito (${response.status}): ${await response.text()}`);
  }
}

async function writeAuditLog(baseUrl: string, key: string, entry: JsonRecord) {
  const response = await fetch(`${baseUrl}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: supabaseHeaders(key, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify({
      actor: 'descriptions:levels:apply',
      action: 'DESCRIPTIONS_LEVELS_APPLY',
      table_name: table,
      record_id: entry.record_id,
      before_data: entry.before_data,
      after_data: entry.after_data
    })
  });

  if (!response.ok) {
    throw new Error(`Audit log non riuscito (${response.status}): ${await response.text()}`);
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: ReportRow[]) {
  const headers = [
    'applicate',
    'saltate',
    'errore',
    'needs_review_saltate',
    'id',
    'slug',
    'nome',
    'descrizione_precedente',
    'descrizione_nuova',
    'motivo_skip',
    'ambiente',
    'timestamp'
  ];
  return [
    headers.join(';'),
    ...rows.map((row) =>
      [
        row.applicata,
        row.saltata,
        row.errore,
        row.needs_review_saltata,
        row.id,
        row.slug,
        row.nome,
        row.descrizione_precedente,
        row.descrizione_nuova,
        row.motivo_skip,
        row.ambiente,
        row.timestamp
      ].map(csvEscape).join(';')
    )
  ].join('\n');
}

if (!previewFile) {
  throw new Error('Specifica --file=<preview-file>.');
}
if (!Number.isFinite(limit) || limit < 1) {
  throw new Error('Specifica --limit con un numero positivo.');
}
if (limit > 20) {
  throw new Error('Apply bloccato: limite massimo consentito 20 record per batch.');
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const environment = targetEnvironment(supabaseUrl);
ensureSafeTarget(environment);

const expectedConfirm = environment === 'production' ? CONFIRM_PRODUCTION : CONFIRM_STAGING;
const applyConfirmed = confirmText === expectedConfirm;
const payload = JSON.parse(await readFile(previewFile, 'utf8'));
const candidates = previewRows(payload).filter((row) => row.id && row.descrizione_nuova);
const selected = candidates.slice(0, limit);
const currentById = await fetchRows(supabaseUrl, serviceKey, selected.map((row) => row.id));
const timestamp = new Date().toISOString();
const reportRows: ReportRow[] = [];

for (const row of selected) {
  const current = currentById.get(row.id);
  const baseReport = {
    id: row.id,
    slug: current ? slugOf(current) : clean(row.raw.slug),
    nome: current ? nameOf(current) : clean(row.raw.nome || row.raw.name),
    applicata: false,
    saltata: false,
    errore: '',
    needs_review_saltata: false,
    descrizione_precedente: current ? previousDescription(current) : '',
    descrizione_nuova: row.descrizione_nuova,
    motivo_skip: '',
    ambiente: environment,
    timestamp
  };

  if (!current) {
    reportRows.push({ ...baseReport, saltata: true, errore: 'record_non_trovato', motivo_skip: 'record_non_trovato' });
    continue;
  }
  if (!activeGym(current)) {
    reportRows.push({ ...baseReport, saltata: true, motivo_skip: 'scheda_archiviata' });
    continue;
  }
  if (row.needs_review && !includeReview) {
    reportRows.push({ ...baseReport, saltata: true, needs_review_saltata: true, motivo_skip: 'needs_review_true' });
    continue;
  }
  if (hasOwnerDescription(current)) {
    reportRows.push({ ...baseReport, saltata: true, motivo_skip: 'descrizione_owner_presente' });
    continue;
  }
  if (hasVerifiedEditorialDescription(current)) {
    reportRows.push({ ...baseReport, saltata: true, motivo_skip: 'descrizione_editoriale_verificata' });
    continue;
  }

  if (!applyConfirmed) {
    reportRows.push({ ...baseReport, saltata: true, motivo_skip: `dry_run_conferma_mancante: --confirm="${expectedConfirm}"` });
    continue;
  }

  const patch = {
    descrizione_generata: row.descrizione_nuova,
    descrizione_pubblica: row.descrizione_nuova,
    descrizione_source: `levels_preview:${path.basename(previewFile)}`,
    descrizione_quality_score: Number(row.raw.quality_score_after || row.raw.quality_score || 0),
    descrizione_needs_review: false
  };

  try {
    await patchGym(supabaseUrl, serviceKey, row.id, patch);
    await writeAuditLog(supabaseUrl, serviceKey, {
      record_id: row.id,
      before_data: {
        descrizione_precedente: baseReport.descrizione_precedente,
        descrizione_generata: current.descrizione_generata || null,
        descrizione_pubblica: current.descrizione_pubblica || null,
        descrizione_source: current.descrizione_source || null,
        descrizione_quality_score: current.descrizione_quality_score || null,
        descrizione_needs_review: current.descrizione_needs_review || null
      },
      after_data: patch
    });
    reportRows.push({ ...baseReport, applicata: true });
  } catch (error) {
    reportRows.push({
      ...baseReport,
      saltata: true,
      errore: error instanceof Error ? error.message : String(error),
      motivo_skip: 'errore_update_o_audit'
    });
  }
}

await mkdir(path.dirname(jsonOut), { recursive: true });
const report = {
  generated_at: timestamp,
  ambiente: environment,
  mode: applyConfirmed ? 'apply' : 'dry-run',
  preview_file: previewFile,
  limit,
  include_review: includeReview,
  confirmation_required: expectedConfirm,
  confirmation_received: applyConfirmed,
  summary: {
    candidate_rows: candidates.length,
    selected_rows: selected.length,
    applicate: reportRows.filter((row) => row.applicata).length,
    saltate: reportRows.filter((row) => row.saltata).length,
    errore: reportRows.filter((row) => row.errore).length,
    needs_review_saltate: reportRows.filter((row) => row.needs_review_saltata).length
  },
  rows: reportRows
};

await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(csvOut, `${toCsv(reportRows)}\n`, 'utf8');

console.log(
  `[descriptions:levels:apply] mode=${report.mode} ambiente=${environment} selected=${selected.length} applicate=${report.summary.applicate} saltate=${report.summary.saltate} errori=${report.summary.errore}`
);
console.log(`[descriptions:levels:apply] json=${jsonOut}`);
console.log(`[descriptions:levels:apply] csv=${csvOut}`);
