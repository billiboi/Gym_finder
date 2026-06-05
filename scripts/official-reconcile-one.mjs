import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeOfficialHtmlPages, discoverOfficialLinks } from '../src/lib/official-structured-scraper.js';
import { reconcileGymFacts } from '../src/lib/official-reconciliation.js';

const args = new Map(
  process.argv.slice(2).map((arg, index, all) => {
    if (arg.startsWith('--') && !arg.includes('=')) return [arg, all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : '1'];
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const gymArg = args.get('--gym') || '';
const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const timeoutMs = Number(args.get('--timeout-ms') || '5500');
const delayMs = Number(args.get('--delay-ms') || '1200');
const maxPages = Math.min(Number(args.get('--max-pages') || '8'), 8);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!gymArg) throw new Error('Specifica --gym <slug-or-id>.');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseEnvValue(value) {
  const trimmed = clean(value);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

async function loadEnvFile(filePath) {
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

function ensureStagingTarget(supabaseUrl) {
  const envName = clean(process.env.SUPABASE_ENV).toLowerCase();
  const targetEnv = clean(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV).toLowerCase();
  const url = clean(supabaseUrl).toLowerCase();
  const tableName = clean(table).toLowerCase();
  const looksProduction = envName === 'production' || envName === 'prod' || targetEnv === 'production' || url.includes('prod') || tableName.includes('prod');
  if (envName !== 'staging' || looksProduction) {
    throw new Error('Reconcile bloccato: usa solo staging/preview con SUPABASE_ENV=staging. Production non consentita.');
  }
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function slugPart(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function hostForUrl(value) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PalestreInZonaDataQualityBot/1.0 (+https://www.palestreinzona.it)' },
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return { ok: false, status: response.status, contentType, html: '' };
    }
    return { ok: true, status: response.status, contentType, html: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, contentType: '', html: '', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readGym(baseUrl, key, identifier) {
  const encoded = encodeURIComponent(identifier);
  const queries = [`id=eq.${encoded}`, `slug=eq.${encoded}`, `_canonical_slug=eq.${encoded}`];
  let lastError = '';
  for (const query of queries) {
    const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&${query}&limit=1`, {
      method: 'GET',
      headers: headers(key)
    });
    if (!response.ok) {
      lastError = await response.text();
      if (response.status === 400 && query.startsWith('_canonical_slug=')) continue;
      if (response.status === 400 && /column .* does not exist/i.test(lastError)) continue;
      throw new Error(`Lettura scheda non riuscita (${response.status}): ${lastError}`);
    }
    const rows = await response.json();
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  if (lastError && /column .* does not exist/i.test(lastError) === false) throw new Error(`Lettura scheda non riuscita: ${lastError}`);
  return null;
}

function appSnapshot(gym) {
  return {
    id: clean(gym?.id),
    slug: clean(gym?.slug || gym?._canonical_slug),
    nome: clean(gym?.nome || gym?.name),
    citta: clean(gym?.citta || gym?.city),
    indirizzo: clean(gym?.indirizzo || gym?.address),
    telefono: clean(gym?.telefono || gym?.phone),
    email: clean(gym?.email),
    sito: clean(gym?.sito || gym?.website),
    discipline: Array.isArray(gym?.disciplines) ? gym.disciplines : clean(gym?.discipline || gym?.disciplina_principale),
    orari: clean(gym?.orari || gym?.hours_info || gym?.opening_hours),
    descrizione: clean(gym?.descrizione_pubblica || gym?.descrizione_editoriale || gym?.descrizione_generata || gym?.descrizione || gym?.description),
    quality_score: gym?.quality_score || gym?.descrizione_quality_score || null,
    claim_or_verified: Boolean(gym?.claim_approved || gym?.owner_claim_approved || gym?.is_verified || gym?.verified)
  };
}

function markdownTable(rows) {
  const header = '| Campo | Valore scheda | Valore fonte ufficiale | Esito | Azione suggerita | Confidenza |';
  const sep = '|---|---|---|---|---|---|';
  const body = rows.map((row) =>
    [
      row.field_label,
      row.app_value || 'vuoto',
      row.official_value || 'non trovato',
      row.status_label,
      row.suggested_action_label,
      row.confidence
    ]
      .map((cell) => clean(cell).replace(/\|/g, '/').slice(0, 240))
      .join(' | ')
  );
  return [header, sep, ...body.map((line) => `| ${line} |`)].join('\n');
}

function toMarkdown(report) {
  return [
    `# Riconciliazione fonte ufficiale - ${report.app_data.nome}`,
    '',
    `Generato: ${report.generated_at}`,
    `Ambiente: ${report.source.env_file} / ${report.source.target}`,
    `Fonte: ${report.official_source.source_url || 'non disponibile'}`,
    `Needs review: ${report.needs_review ? 'si' : 'no'}`,
    `Confidenza generale: ${report.overall_confidence}`,
    '',
    '## Dati app',
    '',
    `\`\`\`json\n${JSON.stringify(report.app_data, null, 2)}\n\`\`\``,
    '',
    '## Dati fonte ufficiale',
    '',
    `Pagine lette: ${report.official_source.pages.map((page) => page.url).join(', ') || 'nessuna'}`,
    '',
    '## Tabella confronto',
    '',
    markdownTable(report.reconciliation.rows),
    '',
    '## Dati confermati',
    '',
    report.confirmed.length ? markdownTable(report.confirmed) : 'Nessun dato confermato.',
    '',
    '## Nuovi dati suggeriti',
    '',
    report.suggested.length ? markdownTable(report.suggested) : 'Nessun nuovo dato suggerito.',
    '',
    '## Conflitti',
    '',
    report.conflicts.length ? markdownTable(report.conflicts) : 'Nessun conflitto rilevato.',
    '',
    '## Dati esclusi',
    '',
    report.excluded.length ? markdownTable(report.excluded) : 'Nessun dato escluso.',
    '',
    '## Avvisi',
    '',
    report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join('\n') : 'Nessun avviso.'
  ].join('\n');
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !key) throw new Error('Missing Supabase env.');
ensureStagingTarget(supabaseUrl);

const gym = await readGym(supabaseUrl, key, gymArg);
if (!gym) throw new Error(`Scheda non trovata in staging: ${gymArg}`);

const website = clean(gym.sito || gym.website);
if (!website) throw new Error(`Scheda senza sito ufficiale: ${gymArg}`);

const home = await fetchWithTimeout(website);
const urls = home.ok ? discoverOfficialLinks(home.html, website, maxPages) : [website];

const pages = [];
const scrapedPages = [];
for (const url of urls.slice(0, maxPages)) {
  if (pages.length > 0 && delayMs > 0) await wait(delayMs);
  const result = url === website ? home : await fetchWithTimeout(url);
  const fetchedAt = new Date().toISOString();
  pages.push({ url, ok: result.ok, status: result.status, title: '', fetched_at: fetchedAt });
  if (result.ok) scrapedPages.push({ url, html: result.html, fetched_at: fetchedAt });
}

const officialAnalysis = analyzeOfficialHtmlPages(scrapedPages);
for (const page of pages) {
  const analyzed = officialAnalysis.pages_scraped.find((item) => item.url === page.url);
  if (analyzed?.title) page.title = analyzed.title;
}

const reconciliation = reconcileGymFacts(gym, {
  ...officialAnalysis.facts_json,
  source_url: website,
  website
});

const slug = slugPart(clean(gym.slug || gym._canonical_slug || gym.nome || gym.name || gym.id));
const jsonOut = `data/official-reconcile-${slug}-${stamp}.json`;
const mdOut = `data/official-reconcile-${slug}-${stamp}.md`;

const report = {
  generated_at: new Date().toISOString(),
  source: { env_file: envFile, table, target: 'staging', mode: 'read_only_no_apply' },
  app_data: appSnapshot(gym),
  official_source: {
    source_url: website,
    host: hostForUrl(website),
    pages,
    clean_text: officialAnalysis.clean_text,
    sections: officialAnalysis.sections_json,
    facts_json: officialAnalysis.facts_json,
    confidence_score: officialAnalysis.confidence_score,
    extraction_warnings: officialAnalysis.warnings
  },
  reconciliation,
  confirmed: reconciliation.confirmed,
  suggested: reconciliation.suggested,
  conflicts: reconciliation.conflicts,
  excluded: reconciliation.excluded,
  needs_review: reconciliation.needs_review,
  overall_confidence: reconciliation.overall_confidence,
  warnings: reconciliation.warnings
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdOut, `${toMarkdown(report)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      jsonOut,
      mdOut,
      nome: report.app_data.nome,
      source_url: website,
      needs_review: report.needs_review,
      overall_confidence: report.overall_confidence,
      confirmed: report.confirmed.length,
      suggested: report.suggested.length,
      conflicts: report.conflicts.length,
      excluded: report.excluded.length
    },
    null,
    2
  )
);
