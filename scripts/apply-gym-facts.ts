// Stage A (Tema 3) apply mode: promotes facts from a dry-run report produced by
// scripts/enrich-gym-facts.ts into public.gym_facts, with full provenance, and
// records the run outcome on public.gyms.source_discovery_*.
//
// This script never writes to canonical gym columns (telefono, sito, orari,
// prezzo). Promoting a fact from gym_facts into a canonical column is a
// separate, later step. Here the only public.gyms columns touched are the
// source_discovery_* run-metadata columns added in
// 20260717_001_description_enrichment_schema.sql.
//
// Deliberately split from enrich-gym-facts.ts so the expensive,
// non-deterministic LLM search stays read-only and its JSON report is the
// review artifact between search and write. Re-running this script on the same
// report is safe: identical facts are deduplicated, not re-inserted.
//
// Default mode is plan-only. Writing requires --confirm-apply, and writing to
// production additionally requires --allow-production.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Gym = Record<string, any>;
type ReportRow = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const factsTable = args.get('--facts-table') || 'gym_facts';
const reportFile = args.get('--report-file') || '';
const confirmApply = args.has('--confirm-apply');
const allowProduction = args.has('--allow-production');
const allowIdentityDrift = args.has('--allow-identity-drift');
const skipGymsStatus = args.has('--skip-gyms-status');
const maxInserts = Number(args.get('--max-inserts') || '200');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupOut = args.get('--backup-out') || `data/gym-facts-apply-backup-${stamp}.json`;
const logOut = args.get('--log-out') || `data/gym-facts-apply-log-${stamp}.json`;

// gym_facts constraints (see the migration): source_type and confidence have no
// 'none' member, so empty/unsourced facts are not representable and are skipped.
const FACT_FIELDS = ['telefono', 'sito', 'orari', 'prezzo'];
const VALID_SOURCE_TYPES = new Set(['official_site', 'google_business', 'social', 'article']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const SELF_CITATION_HOSTS = ['palestreinzona.it'];

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

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function looksProductionUrl(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  return (
    envName === 'production' ||
    envName === 'prod' ||
    targetEnv === 'production' ||
    targetEnv === 'prod' ||
    supabaseUrl.toLowerCase().includes('prod')
  );
}

function ensureApplyAllowed(supabaseUrl: string) {
  if (!confirmApply) return;
  if (looksProductionUrl(supabaseUrl) && !allowProduction) {
    throw new Error('Apply production bloccato: richiede --allow-production esplicito.');
  }
}

// Loose comparison for the report-vs-live identity gate below: the report can be
// generated against a different project (or simply be old), and csv-NNN ids are
// known to get reassigned to different businesses across reimports.
function comparable(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isSelfCitation(url: string) {
  const host = hostOf(url);
  if (!host) return false;
  return SELF_CITATION_HOSTS.some((banned) => host === banned || host.endsWith(`.${banned}`));
}

// Deterministic backstop for the two clamps the extraction prompt asks for but
// cannot guarantee (Haiku 4.5 still rationalizes 'high' on directory sources).
// Prompt rules live in scripts/enrich-gym-facts.ts; these are enforced at write
// time so nothing gets into gym_facts above the confidence its source earns.
function clampConfidence(sourceType: string, confidence: string, identityMatch: boolean) {
  const applied: string[] = [];
  let result = confidence;

  if (sourceType === 'article' && result === 'high') {
    result = 'medium';
    applied.push('article_max_medium');
  }

  if (!identityMatch && result !== 'low') {
    result = 'low';
    applied.push('identity_unconfirmed_max_low');
  }

  return { confidence: result, clamps: applied };
}

function planFactsForRow(row: ReportRow) {
  const facts = row?.facts;
  const gymId = clean(row?.id);
  const kept: Record<string, any>[] = [];
  const skipped: Record<string, any>[] = [];

  if (!facts) {
    return { kept, skipped, identityMatch: false, identityNotes: '' };
  }

  const identityMatch = facts.identity_match === true;

  for (const field of FACT_FIELDS) {
    const fact = facts[field];
    if (!fact) continue;

    const value = clean(fact.value);
    const sourceUrl = clean(fact.source_url);
    const sourceType = clean(fact.source_type);
    const rawConfidence = clean(fact.confidence);

    if (!value) {
      skipped.push({ gym_id: gymId, field, reason: 'empty_value' });
      continue;
    }
    if (!sourceUrl) {
      // A value with no source URL has no provenance to record, and gym_facts
      // requires source_url NOT NULL. Unsourced values are exactly what this
      // pipeline exists to avoid writing.
      skipped.push({ gym_id: gymId, field, reason: 'missing_source_url', value });
      continue;
    }
    if (isSelfCitation(sourceUrl)) {
      skipped.push({ gym_id: gymId, field, reason: 'self_citation', value, source_url: sourceUrl });
      continue;
    }
    if (!VALID_SOURCE_TYPES.has(sourceType)) {
      skipped.push({ gym_id: gymId, field, reason: 'invalid_source_type', value, source_type: sourceType });
      continue;
    }
    if (!VALID_CONFIDENCE.has(rawConfidence)) {
      skipped.push({ gym_id: gymId, field, reason: 'invalid_confidence', value, confidence: rawConfidence });
      continue;
    }

    const { confidence, clamps } = clampConfidence(sourceType, rawConfidence, identityMatch);

    kept.push({
      gym_id: gymId,
      field,
      value: { text: value },
      source_url: sourceUrl,
      source_type: sourceType,
      confidence,
      confidence_reported: rawConfidence,
      clamps
    });
  }

  return { kept, skipped, identityMatch, identityNotes: clean(facts.identity_notes) };
}

function statusForRow(row: ReportRow, identityMatch: boolean, keptCount: number) {
  if (row?.error || !row?.tool_called) return '';
  if (!identityMatch) return 'needs_review';
  if (keptCount > 0) return 'enriched';
  return 'no_sources_found';
}

async function fetchGymsByIds(supabaseUrl: string, key: string, ids: string[]) {
  if (!ids.length) return [] as Gym[];
  const encodedIds = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=in.(${encodedIds})&select=*`,
    { method: 'GET', headers: headers(key) }
  );
  if (!response.ok) throw new Error(`Lettura gyms non riuscita (${response.status}): ${await response.text()}`);
  return (await response.json()) as Gym[];
}

async function fetchExistingFacts(supabaseUrl: string, key: string, ids: string[]) {
  if (!ids.length) return [] as Record<string, any>[];
  const encodedIds = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(factsTable)}?gym_id=in.(${encodedIds})&select=*`,
    { method: 'GET', headers: headers(key) }
  );
  if (!response.ok) throw new Error(`Lettura ${factsTable} non riuscita (${response.status}): ${await response.text()}`);
  return (await response.json()) as Record<string, any>[];
}

async function countFacts(supabaseUrl: string, key: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(factsTable)}?select=id`, {
    method: 'HEAD',
    headers: headers(key, { Prefer: 'count=exact', Range: '0-0' })
  });
  if (!response.ok) throw new Error(`Conteggio ${factsTable} non riuscito (${response.status})`);
  const range = response.headers.get('content-range') || '';
  const total = range.split('/')[1];
  return Number(total || '0');
}

async function insertFacts(supabaseUrl: string, key: string, rows: Record<string, any>[]) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(factsTable)}`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(rows)
  });
  if (!response.ok) throw new Error(`Insert ${factsTable} non riuscito (${response.status}): ${await response.text()}`);
  return (await response.json()) as Record<string, any>[];
}

async function patchGym(supabaseUrl: string, key: string, id: string, patch: Record<string, any>) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(patch)
    }
  );
  if (!response.ok) throw new Error(`Update gyms ${id} non riuscito (${response.status}): ${await response.text()}`);
}

function factKey(gymId: string, field: string, sourceUrl: string, text: string) {
  return [gymId, field, sourceUrl, text].map((part) => comparable(part)).join('|');
}

if (!reportFile) {
  throw new Error('Specifica --report-file=data/gym-facts-dry-run-....json (output di enrich-gym-facts.ts).');
}

await loadEnvFile(path.resolve(envFile));
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
ensureApplyAllowed(supabaseUrl);

const report = JSON.parse(await readFile(path.resolve(reportFile), 'utf8'));
const reportRows: ReportRow[] = Array.isArray(report.rows) ? report.rows : [];
if (!reportRows.length) throw new Error(`Nessuna riga nel report ${reportFile}.`);

const reportEnvFile = clean(report?.source?.env_file);
const targetIsProduction = looksProductionUrl(supabaseUrl);
const reportIds = reportRows.map((row) => clean(row.id)).filter(Boolean);

console.log(
  `[apply-gym-facts] report=${reportFile} rows=${reportRows.length} report_env=${reportEnvFile || 'n/d'} target_env=${envFile} production=${targetIsProduction}`
);

const liveGyms = await fetchGymsByIds(supabaseUrl, serviceKey, reportIds);
const liveById = new Map(liveGyms.map((gym) => [clean(gym.id), gym]));

// Identity gate. The report carries the nome/citta the facts were researched
// against; if the live row under the same id is a different business, writing
// the facts would attach them to the wrong gym. csv-NNN ids are known to be
// reassigned across reimports, so this is a real failure mode, not a formality
// - especially when the report was generated against a different project.
const planned: Record<string, any>[] = [];
const skippedFacts: Record<string, any>[] = [];
const gymUpdates: Record<string, any>[] = [];
const identityDrift: Record<string, any>[] = [];
const missingGyms: string[] = [];

for (const row of reportRows) {
  const gymId = clean(row.id);
  const live = liveById.get(gymId);

  if (!live) {
    missingGyms.push(gymId);
    continue;
  }

  const reportName = comparable(row.nome);
  const reportCity = comparable(row.citta);
  const liveName = comparable(live.nome || live.name);
  const liveCity = comparable(live.citta || live.city);
  const nameMatches = Boolean(reportName) && reportName === liveName;
  const cityMatches = !reportCity || !liveCity || reportCity === liveCity;

  if (!nameMatches || !cityMatches) {
    identityDrift.push({
      gym_id: gymId,
      report: { nome: clean(row.nome), citta: clean(row.citta) },
      live: { nome: clean(live.nome || live.name), citta: clean(live.citta || live.city) }
    });
    if (!allowIdentityDrift) continue;
  }

  const { kept, skipped, identityMatch, identityNotes } = planFactsForRow(row);
  planned.push(...kept);
  skippedFacts.push(...skipped);

  const status = statusForRow(row, identityMatch, kept.length);
  if (status && !skipGymsStatus) {
    gymUpdates.push({
      gym_id: gymId,
      patch: {
        source_discovery_status: status,
        source_discovery_checked_at: clean(report.generated_at) || new Date().toISOString(),
        source_discovery_notes: identityNotes.slice(0, 2000) || null
      },
      before: {
        source_discovery_status: live.source_discovery_status ?? null,
        source_discovery_checked_at: live.source_discovery_checked_at ?? null,
        source_discovery_notes: live.source_discovery_notes ?? null
      }
    });
  }
}

// Deduplicate against what is already stored, so re-running the same report is
// a no-op instead of doubling every fact.
const existingFacts = await fetchExistingFacts(supabaseUrl, serviceKey, reportIds);
const existingKeys = new Set(
  existingFacts.map((fact) =>
    factKey(clean(fact.gym_id), clean(fact.field), clean(fact.source_url), clean(fact?.value?.text ?? fact?.value))
  )
);

const toInsert: Record<string, any>[] = [];
const duplicates: Record<string, any>[] = [];
const seenInBatch = new Set<string>();

for (const fact of planned) {
  const key = factKey(fact.gym_id, fact.field, fact.source_url, fact.value.text);
  if (existingKeys.has(key) || seenInBatch.has(key)) {
    duplicates.push({ gym_id: fact.gym_id, field: fact.field, source_url: fact.source_url });
    continue;
  }
  seenInBatch.add(key);
  toInsert.push(fact);
}

if (toInsert.length > maxInserts) {
  throw new Error(
    `Insert bloccato: ${toInsert.length} fatti superano --max-inserts=${maxInserts}. Alza il limite consapevolmente.`
  );
}

const clampedCount = toInsert.filter((fact) => fact.clamps.length > 0).length;
const factsCountBefore = await countFacts(supabaseUrl, serviceKey);

const plan = {
  generated_at: new Date().toISOString(),
  mode: confirmApply ? 'apply' : 'plan_only',
  report: { file: reportFile, generated_at: clean(report.generated_at), env_file: reportEnvFile, model: clean(report.model) },
  target: { env_file: envFile, table, facts_table: factsTable, production: targetIsProduction },
  counts: {
    report_rows: reportRows.length,
    gyms_found_live: liveGyms.length,
    gyms_missing_live: missingGyms.length,
    identity_drift: identityDrift.length,
    facts_planned: planned.length,
    facts_to_insert: toInsert.length,
    facts_duplicate_skipped: duplicates.length,
    facts_skipped: skippedFacts.length,
    facts_confidence_clamped: clampedCount,
    gym_status_updates: gymUpdates.length,
    gym_facts_rows_before: factsCountBefore
  },
  identity_drift: identityDrift,
  gyms_missing_live: missingGyms,
  facts_to_insert: toInsert,
  facts_skipped: skippedFacts,
  facts_duplicate_skipped: duplicates,
  gym_status_updates: gymUpdates
};

console.log(`[apply-gym-facts] ${JSON.stringify(plan.counts)}`);
if (identityDrift.length) {
  console.log(`[apply-gym-facts] ATTENZIONE identity drift su ${identityDrift.length} palestre:`);
  for (const drift of identityDrift) {
    console.log(
      `  - ${drift.gym_id}: report="${drift.report.nome}" (${drift.report.citta}) vs live="${drift.live.nome}" (${drift.live.citta})`
    );
  }
}

await mkdir(path.dirname(logOut), { recursive: true });

if (!confirmApply) {
  await writeFile(logOut, JSON.stringify(plan, null, 2));
  console.log(`[apply-gym-facts] plan-only, nessuna scrittura. plan=${logOut}`);
  console.log('[apply-gym-facts] per scrivere: aggiungi --confirm-apply (e --allow-production se il target e produzione).');
  process.exit(0);
}

// Backup before any write: current gym_facts rows for the gyms in scope plus
// the source_discovery_* values that are about to be overwritten.
await mkdir(path.dirname(backupOut), { recursive: true });
await writeFile(
  backupOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      target: plan.target,
      gym_facts_rows_before: factsCountBefore,
      existing_facts_for_scope: existingFacts,
      gyms_source_discovery_before: gymUpdates.map((update) => ({ gym_id: update.gym_id, ...update.before }))
    },
    null,
    2
  )
);
console.log(`[apply-gym-facts] backup=${backupOut} (gym_facts totali prima: ${factsCountBefore})`);

const inserted = toInsert.length
  ? await insertFacts(
      supabaseUrl,
      serviceKey,
      toInsert.map((fact) => ({
        gym_id: fact.gym_id,
        field: fact.field,
        value: fact.value,
        source_url: fact.source_url,
        source_type: fact.source_type,
        confidence: fact.confidence
      }))
    )
  : [];

console.log(`[apply-gym-facts] inseriti ${inserted.length} fatti in ${factsTable}.`);

const statusResults: Record<string, any>[] = [];
for (const update of gymUpdates) {
  try {
    await patchGym(supabaseUrl, serviceKey, update.gym_id, update.patch);
    statusResults.push({ gym_id: update.gym_id, ok: true, status: update.patch.source_discovery_status });
  } catch (error) {
    statusResults.push({ gym_id: update.gym_id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const factsCountAfter = await countFacts(supabaseUrl, serviceKey);

await writeFile(
  logOut,
  JSON.stringify(
    {
      ...plan,
      mode: 'apply',
      applied_at: new Date().toISOString(),
      backup_file: backupOut,
      inserted_ids: inserted.map((row) => row.id),
      gym_status_results: statusResults,
      gym_facts_rows_after: factsCountAfter
    },
    null,
    2
  )
);

console.log(
  `[apply-gym-facts] gym_facts: ${factsCountBefore} -> ${factsCountAfter} (+${factsCountAfter - factsCountBefore}). ` +
    `status aggiornati: ${statusResults.filter((row) => row.ok).length}/${statusResults.length}. log=${logOut}`
);
