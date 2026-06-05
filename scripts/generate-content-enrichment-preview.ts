import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeOfficialHtmlPages, discoverOfficialLinks } from '../src/lib/official-structured-scraper.js';
import { reconcileGymFacts } from '../src/lib/official-reconciliation.js';
import { generateGymEditorialPreview } from '../src/lib/gym-editorial-preview.js';

type Gym = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const limit = Number(args.get('--limit') || '40');
const maxPagesPerSite = Math.min(Number(args.get('--max-pages-per-site') || '8'), 8);
const timeoutMs = Number(args.get('--timeout-ms') || '5500');
const delayMs = Number(args.get('--delay-ms') || '1200');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/content-enrichment-preview-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/content-enrichment-preview-${stamp}.csv`;

const PRICE_TEXT_RE =
  /\b(chf|eur|euro|€|fr\.|prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|mensile|annuale|listino|costo|costi|membership)\b/i;
const PRICE_AMOUNT_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:chf|eur|euro|€|fr\.)/gi;
const COURSES_RE =
  /\b(corsi?|lezioni?|attivit[aà]|disciplin[ae]|fitness|pilates|yoga|crossfit|judo|karate|boxe|kickboxing|nuoto|personal training|ems|padel)\b/i;
const HOURS_RE = /\b(orari?|apert[ou]ra|lun|mar|mer|gio|ven|sab|dom|mattina|pomeriggio|sera)\b/i;
const CONTACT_RE = /\b(contatti?|telefono|tel\.|email|e-mail|whatsapp|indirizzo|sede)\b/i;
const LINK_HINT_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|costo|costi|membership|corsi?|attivit[aà]|orari?|contatti?|sede)\b/i;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(value: unknown, max = 6000) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} [...]`;
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseEnvValue(value: string) {
  const trimmed = clean(value);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
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

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function csvCell(value: unknown) {
  const text = clean(value).replace(/"/g, '""');
  return /[",;\n\r]/.test(text) ? `"${text}"` : text;
}

function hostForUrl(value: unknown) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sameHost(url: string, host: string) {
  return hostForUrl(url) === host;
}

function absoluteUrl(href: string, base: string) {
  try {
    const url = new URL(href, base);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#0*([0-9]+);/g, (_, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCharCode(value) : ' ';
    })
    .replace(/&[#a-z0-9]+;/gi, ' ');
}

function extractTitle(html: string) {
  return clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function extractInternalLinks(html: string, base: string) {
  const host = hostForUrl(base);
  const links: Array<{ url: string; score: number }> = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRe.exec(html))) {
    const url = absoluteUrl(match[1], base);
    if (!url || !sameHost(url, host)) continue;
    if (/\.(jpg|jpeg|png|webp|gif|zip|docx?|xlsx?)($|\?)/i.test(url)) continue;
    const text = stripHtml(match[2]);
    const combined = `${url} ${text}`;
    const score =
      (PRICE_TEXT_RE.test(combined) ? 70 : 0) +
      (COURSES_RE.test(combined) ? 45 : 0) +
      (HOURS_RE.test(combined) ? 25 : 0) +
      (CONTACT_RE.test(combined) ? 20 : 0) +
      (LINK_HINT_RE.test(combined) ? 25 : 0);
    if (score <= 0) continue;
    links.push({ url, score });
  }

  return [...new Map(links.sort((a, b) => b.score - a.score || a.url.length - b.url.length).map((link) => [link.url, link])).values()]
    .map((link) => link.url)
    .slice(0, maxPagesPerSite);
}

function snippetAround(text: string, patterns: RegExp[]) {
  const normalized = clean(text);
  const indexes = patterns.map((pattern) => normalized.search(pattern)).filter((index) => index >= 0);
  if (!indexes.length) return '';
  const index = Math.min(...indexes);
  return normalized.slice(Math.max(0, index - 220), Math.min(normalized.length, index + 620));
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

function primaryDiscipline(gym: Gym) {
  if (Array.isArray(gym.disciplines) && gym.disciplines.length) return clean(gym.disciplines[0]);
  return clean(gym.discipline || gym.disciplina_principale || 'Fitness');
}

function activeGym(gym: Gym) {
  return !(gym.deleted_at || gym.weekly_hours?._deleted_at);
}

function hasOwnWebsite(gym: Gym) {
  const websiteHost = hostForUrl(gym.website || gym.sito);
  if (!websiteHost) return false;
  return !/(facebook|instagram|tiktok|linkedin|youtube|google|goo\.gl|wa\.me|linktr|superprof|ticino\.ch|luganoregion\.com)/i.test(
    websiteHost
  );
}

function needsEnrichment(gym: Gym) {
  return (
    !clean(gym.price_info) ||
    !clean(gym.description || gym.descrizione || gym.descrizione_editoriale) ||
    !clean(gym.hours_info || gym.orari) ||
    !clean(gym.phone || gym.telefono)
  );
}

function priorityScore(gym: Gym) {
  let score = 0;
  const discipline = fold(primaryDiscipline(gym));
  if (/fitness|palestra|pilates|crossfit|yoga|nuoto|padel|judo|karate|boxe|kickboxing|personal/.test(discipline)) score += 25;
  if (hasOwnWebsite(gym)) score += 35;
  if (!clean(gym.price_info)) score += 20;
  if (!clean(gym.description || gym.descrizione || gym.descrizione_editoriale)) score += 10;
  if (!clean(gym.hours_info || gym.orari)) score += 5;
  return score;
}

async function fetchWithTimeout(url: string) {
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discoverPages(website: string) {
  const home = await fetchWithTimeout(website);
  if (!home.ok) return website ? [website] : [];
  return discoverOfficialLinks(home.html, website, maxPagesPerSite);
}

function summarizePage(text: string) {
  const amounts = [...clean(text).matchAll(PRICE_AMOUNT_RE)].map((match) => clean(match[0]));
  const hasPrice = amounts.length > 0 || PRICE_TEXT_RE.test(text);
  const hasCourses = COURSES_RE.test(text);
  const hasHours = HOURS_RE.test(text);
  const hasContact = CONTACT_RE.test(text);
  const topics = [
    hasPrice ? 'prezzi_abbonamenti' : '',
    hasCourses ? 'corsi_discipline' : '',
    hasHours ? 'orari' : '',
    hasContact ? 'contatti_sede' : ''
  ].filter(Boolean);

  return {
    amounts: [...new Set(amounts)].slice(0, 8),
    topics,
    priceSnippet: hasPrice ? snippetAround(text, [PRICE_AMOUNT_RE, PRICE_TEXT_RE]) : '',
    coursesSnippet: hasCourses ? snippetAround(text, [COURSES_RE]) : '',
    hoursSnippet: hasHours ? snippetAround(text, [HOURS_RE]) : '',
    contactSnippet: hasContact ? snippetAround(text, [CONTACT_RE]) : ''
  };
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !key) throw new Error('Missing Supabase env.');

const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=5000`, {
  method: 'GET',
  headers: headers(key)
});

if (!response.ok) throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);

const gyms: Gym[] = await response.json();
const candidates = gyms
  .filter(activeGym)
  .filter((gym) => hasOwnWebsite(gym) && needsEnrichment(gym))
  .sort((a, b) => priorityScore(b) - priorityScore(a) || nameOf(a).localeCompare(nameOf(b), 'it'))
  .slice(0, limit);

const rows = [];

for (const gym of candidates) {
  const website = clean(gym.website || gym.sito);
  const pages = await discoverPages(website);
  const scrapedPages: Record<string, any>[] = [];
  let best: Record<string, any> | null = null;

  for (const url of pages) {
    if (delayMs > 0) await wait(delayMs);
    const result = await fetchWithTimeout(url);
    if (!result.ok) continue;
    scrapedPages.push({ url, html: result.html, fetched_at: new Date().toISOString() });
  }

  if (scrapedPages.length) {
    const officialAnalysis = analyzeOfficialHtmlPages(scrapedPages);
    const reconciliation = reconcileGymFacts(gym, { ...officialAnalysis.facts_json, source_url: website, website });
    const editorialPreview = generateGymEditorialPreview(gym, reconciliation);
    const summary = summarizePage(officialAnalysis.clean_text);
    if (summary.topics.length || editorialPreview.used_facts.length) {
      const score = officialAnalysis.confidence_score + summary.topics.length * 10 + summary.amounts.length * 8;
      const row = {
      id: clean(gym.id),
      slug: clean(gym.slug || gym._canonical_slug),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina: primaryDiscipline(gym),
      website,
      website_host: hostForUrl(website),
      source_url: scrapedPages[0]?.url || website,
      source_title: officialAnalysis.pages_scraped?.[0]?.title || '',
      source_fetched_at: scrapedPages[0]?.fetched_at || new Date().toISOString(),
      pages_scraped: officialAnalysis.pages_scraped,
      raw_official_text: truncate(officialAnalysis.raw_text),
      clean_official_text: truncate(officialAnalysis.clean_text),
      extracted_sections: officialAnalysis.sections_json,
      extracted_facts: officialAnalysis.facts_json,
      confidence_score: officialAnalysis.confidence_score,
      extraction_warnings: officialAnalysis.warnings,
      reconciliation,
      editorial_preview: editorialPreview,
      extracted_topics: summary.topics.join(' | '),
      extracted_amounts: summary.amounts.join(' | '),
      proposed_price_info: summary.priceSnippet.slice(0, 650),
      proposed_courses_info: summary.coursesSnippet.slice(0, 650),
      proposed_hours_info: summary.hoursSnippet.slice(0, 650),
      proposed_contact_info: summary.contactSnippet.slice(0, 650),
      proposed_editorial_evidence: (summary.coursesSnippet || summary.contactSnippet || summary.hoursSnippet).slice(0, 650),
      risk: summary.amounts.length > 5 || officialAnalysis.warnings.length ? 'medium' : 'low',
      needs_review: true,
      decisione_consigliata: 'review_contenuti_estratti',
      score
      };

      if (!best || Number(row.score) > Number(best.score || 0)) best = row;
    }
  }

  rows.push(
    best || {
      id: clean(gym.id),
      slug: clean(gym.slug || gym._canonical_slug),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina: primaryDiscipline(gym),
      website,
      website_host: hostForUrl(website),
      source_url: '',
      source_title: '',
      source_fetched_at: '',
      raw_official_text: '',
      clean_official_text: '',
      extracted_sections: {},
      extracted_facts: {},
      extraction_warnings: ['Nessun contenuto utile estratto dal sito ufficiale.'],
      reconciliation: reconcileGymFacts(gym, {}),
      editorial_preview: generateGymEditorialPreview(gym, reconcileGymFacts(gym, {})),
      extracted_topics: '',
      extracted_amounts: '',
      proposed_price_info: '',
      proposed_courses_info: '',
      proposed_hours_info: '',
      proposed_contact_info: '',
      proposed_editorial_evidence: '',
      risk: 'none',
      needs_review: true,
      decisione_consigliata: 'nessun_contenuto_estratto',
      score: 0
    }
  );
}

const summary = {
  env_file: envFile,
  table,
  selected: candidates.length,
  extracted: rows.filter((row) => clean(row.extracted_topics)).length,
  with_prices: rows.filter((row) => clean(row.proposed_price_info)).length,
  with_courses: rows.filter((row) => clean(row.proposed_courses_info)).length,
  with_hours: rows.filter((row) => clean(row.proposed_hours_info)).length,
  not_found: rows.filter((row) => !clean(row.extracted_topics)).length
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, JSON.stringify({ generated_at: new Date().toISOString(), summary, rows }, null, 2));

const header = [
  'id',
  'slug',
  'nome',
  'citta',
  'indirizzo',
  'disciplina',
  'website',
  'source_url',
  'source_fetched_at',
  'extracted_topics',
  'extracted_amounts',
  'clean_official_text',
  'extraction_warnings',
  'proposed_price_info',
  'proposed_courses_info',
  'proposed_hours_info',
  'proposed_contact_info',
  'proposed_editorial_evidence',
  'risk',
  'needs_review',
  'decisione_consigliata',
  'score'
];

await writeFile(csvOut, [header.join(';'), ...rows.map((row) => header.map((key) => csvCell(row[key as keyof typeof row])).join(';'))].join('\n'));

console.log(
  JSON.stringify(
    {
      jsonOut,
      csvOut,
      summary,
      top_extracted: rows
        .filter((row) => clean(row.extracted_topics))
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          nome: row.nome,
          source_url: row.source_url,
          topics: row.extracted_topics,
          amounts: row.extracted_amounts
        }))
    },
    null,
    2
  )
);
