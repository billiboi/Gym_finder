import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Read-only diff between the staging and production Supabase projects,
// per docs/ROADMAP.md priority 1 and the "Scoperta collaterale" section
// of docs/gsc-analysis-2026-07-09.md. Never writes to either database.

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const stagingEnvFile = args.get('--staging-env-file') || '.env.staging.local';
const productionEnvFile = args.get('--production-env-file') || '.env.vercel.production.check';
const outFile = args.get('--out') || 'docs/audit/staging-production-diff-2026-07.md';

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

const COLUMNS = [
  'id',
  'nome',
  'name',
  'citta',
  'city',
  'indirizzo',
  'address',
  'deleted_at',
  'needs_review',
  'review_reason',
  'priority_score',
  'price_info',
  'price_source_url',
  'price_updated_at',
  'descrizione',
  'description',
  'descrizione_pubblica',
  'data_verified_at',
  'data_quality_score',
  'updated_at',
  'created_at'
].join(',');

async function readAllGyms(env, label) {
  const url = env.SUPABASE_URL.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/rest/v1/gyms?select=${COLUMNS}&order=id.asc&limit=2000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`${label} read failed (${res.status}): ${await res.text()}`);
  const rows = await res.json();
  return { rows, projectRef: url.replace(/^https:\/\/([a-z0-9]+)\..*/, '$1') };
}

function fold(value) {
  return String(value ?? '').trim();
}

function isActive(row) {
  return !row.deleted_at;
}

function nameOf(row) {
  return row.nome || row.name || '';
}

function enrichmentFingerprint(row) {
  return JSON.stringify({
    price_info: fold(row.price_info),
    description: fold(row.descrizione || row.description || row.descrizione_pubblica),
    data_verified_at: fold(row.data_verified_at)
  });
}

async function main() {
  const stagingEnv = await loadEnv(path.resolve(stagingEnvFile));
  const productionEnv = await loadEnv(path.resolve(productionEnvFile));

  const staging = await readAllGyms(stagingEnv, 'staging');
  const production = await readAllGyms(productionEnv, 'production');

  const stagingById = new Map(staging.rows.map((r) => [r.id, r]));
  const productionById = new Map(production.rows.map((r) => [r.id, r]));

  const stagingIds = new Set(stagingById.keys());
  const productionIds = new Set(productionById.keys());

  const onlyInStaging = [...stagingIds].filter((id) => !productionIds.has(id)).sort();
  const onlyInProduction = [...productionIds].filter((id) => !stagingIds.has(id)).sort();
  const inBoth = [...stagingIds].filter((id) => productionIds.has(id)).sort();

  const archivedInStagingActiveInProduction = [];
  const archivedInProductionActiveInStaging = [];
  const enrichmentDivergent = [];

  for (const id of inBoth) {
    const s = stagingById.get(id);
    const p = productionById.get(id);
    const sActive = isActive(s);
    const pActive = isActive(p);

    if (!sActive && pActive) {
      archivedInStagingActiveInProduction.push({ id, name: nameOf(s), stagingDeletedAt: s.deleted_at, stagingReason: s.review_reason || '' });
    }
    if (sActive && !pActive) {
      archivedInProductionActiveInStaging.push({ id, name: nameOf(p), productionDeletedAt: p.deleted_at });
    }

    if (sActive && pActive) {
      const sFp = enrichmentFingerprint(s);
      const pFp = enrichmentFingerprint(p);
      if (sFp !== pFp) {
        enrichmentDivergent.push({
          id,
          name: nameOf(p),
          staging: { price_info: fold(s.price_info), description: fold(s.descrizione || s.description || s.descrizione_pubblica), data_verified_at: fold(s.data_verified_at) },
          production: { price_info: fold(p.price_info), description: fold(p.descrizione || p.description || p.descrizione_pubblica), data_verified_at: fold(p.data_verified_at) }
        });
      }
    }
  }

  const stagingActive = staging.rows.filter(isActive).length;
  const stagingArchived = staging.rows.length - stagingActive;
  const productionActive = production.rows.filter(isActive).length;
  const productionArchived = production.rows.length - productionActive;

  const summary = {
    generated_at: new Date().toISOString(),
    staging: { project_ref: staging.projectRef, total: staging.rows.length, active: stagingActive, archived: stagingArchived },
    production: { project_ref: production.projectRef, total: production.rows.length, active: productionActive, archived: productionArchived },
    only_in_staging: onlyInStaging.length,
    only_in_production: onlyInProduction.length,
    in_both: inBoth.length,
    archived_in_staging_active_in_production: archivedInStagingActiveInProduction.length,
    archived_in_production_active_in_staging: archivedInProductionActiveInStaging.length,
    enrichment_divergent: enrichmentDivergent.length
  };

  console.log(JSON.stringify(summary, null, 2));

  const lines = [];
  lines.push('# Diff staging vs produzione — public.gyms');
  lines.push('');
  lines.push(`Generato: ${summary.generated_at}`);
  lines.push('');
  lines.push('Sola lettura. Nessuna scrittura eseguita su nessuno dei due database.');
  lines.push('');
  lines.push('## Conteggi');
  lines.push('');
  lines.push('| | Staging (`' + staging.projectRef + '`) | Produzione (`' + production.projectRef + '`) |');
  lines.push('|---|---:|---:|');
  lines.push(`| Totale | ${summary.staging.total} | ${summary.production.total} |`);
  lines.push(`| Attive | ${summary.staging.active} | ${summary.production.active} |`);
  lines.push(`| Archiviate | ${summary.staging.archived} | ${summary.production.archived} |`);
  lines.push('');
  lines.push(`Record in comune (stesso id): ${summary.in_both}`);
  lines.push(`Solo in staging: ${summary.only_in_staging}`);
  lines.push(`Solo in produzione: ${summary.only_in_production}`);
  lines.push('');

  lines.push('## Archiviate su staging (fase P4, oggi) ma ancora attive in produzione');
  lines.push('');
  lines.push(`${archivedInStagingActiveInProduction.length} record. Queste sono le pulizie P4 fatte su staging che NON hanno ancora effetto sul sito live.`);
  lines.push('');
  if (archivedInStagingActiveInProduction.length) {
    lines.push('| id | nome | archiviata su staging il | motivo |');
    lines.push('|---|---|---|---|');
    for (const r of archivedInStagingActiveInProduction) {
      lines.push(`| ${r.id} | ${r.name.replace(/\|/g, '\\|')} | ${r.stagingDeletedAt} | ${r.stagingReason.replace(/\|/g, '\\|')} |`);
    }
  }
  lines.push('');

  lines.push('## Archiviate autonomamente in produzione ma ancora attive su staging');
  lines.push('');
  lines.push(`${archivedInProductionActiveInStaging.length} record. Pulizia indipendente di produzione (metà maggio) mai replicata su staging.`);
  lines.push('');
  if (archivedInProductionActiveInStaging.length) {
    lines.push('| id | nome | archiviata in produzione il |');
    lines.push('|---|---|---|');
    for (const r of archivedInProductionActiveInStaging) {
      lines.push(`| ${r.id} | ${r.name.replace(/\|/g, '\\|')} | ${r.productionDeletedAt} |`);
    }
  }
  lines.push('');

  lines.push('## Record presenti solo in staging (non esistono in produzione)');
  lines.push('');
  lines.push(`${onlyInStaging.length} record.`);
  lines.push('');
  if (onlyInStaging.length) {
    lines.push('| id | nome | stato staging |');
    lines.push('|---|---|---|');
    for (const id of onlyInStaging) {
      const r = stagingById.get(id);
      lines.push(`| ${id} | ${nameOf(r).replace(/\|/g, '\\|')} | ${isActive(r) ? 'attiva' : 'archiviata'} |`);
    }
  }
  lines.push('');

  lines.push('## Record presenti solo in produzione (non esistono in staging)');
  lines.push('');
  lines.push(`${onlyInProduction.length} record.`);
  lines.push('');
  if (onlyInProduction.length) {
    lines.push('| id | nome | stato produzione |');
    lines.push('|---|---|---|');
    for (const id of onlyInProduction) {
      const r = productionById.get(id);
      lines.push(`| ${id} | ${nameOf(r).replace(/\|/g, '\\|')} | ${isActive(r) ? 'attiva' : 'archiviata'} |`);
    }
  }
  lines.push('');

  lines.push('## Divergenze nei campi enrichment (solo record attivi in entrambi)');
  lines.push('');
  lines.push(`${enrichmentDivergent.length} record con differenze in price_info, description, o data_verified_at.`);
  lines.push('');
  if (enrichmentDivergent.length) {
    lines.push('| id | nome | campo | staging | produzione |');
    lines.push('|---|---|---|---|---|');
    for (const r of enrichmentDivergent) {
      for (const field of ['price_info', 'description', 'data_verified_at']) {
        if (r.staging[field] !== r.production[field]) {
          const sVal = (r.staging[field] || '').slice(0, 80).replace(/\|/g, '\\|');
          const pVal = (r.production[field] || '').slice(0, 80).replace(/\|/g, '\\|');
          lines.push(`| ${r.id} | ${r.name.replace(/\|/g, '\\|')} | ${field} | ${sVal} | ${pVal} |`);
        }
      }
    }
  }
  lines.push('');

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, lines.join('\n') + '\n', 'utf8');
  console.log(`\nReport scritto in: ${outFile}`);
}

await main();
