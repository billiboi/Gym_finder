import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
const maxPagesPerSite = Number(args.get('--max-pages-per-site') || '5');
const timeoutMs = Number(args.get('--timeout-ms') || '5500');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/price-enrichment-preview-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/price-enrichment-preview-${stamp}.csv`;

const PRICE_TEXT_RE =
  /\b(chf|eur|euro|€|fr\.|prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|mensile|annuale|listino|costo|costi|membership)\b/i;
const PRICE_AMOUNT_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:chf|eur|euro|€|fr\.)/gi;
const LINK_HINT_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|costo|costi|membership|shop|iscrizione)\b/i;

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
    .replace(/&#8217;/g, "'");
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
    const score = (PRICE_TEXT_RE.test(combined) ? 80 : 0) + (LINK_HINT_RE.test(combined) ? 40 : 0);
    if (score <= 0) continue;
    links.push({ url, score });
  }

  return [...new Map(links.sort((a, b) => b.score - a.score || a.url.length - b.url.length).map((link) => [link.url, link])).values()].map(
    (link) => link.url
  );
}

function priceSnippet(text: string) {
  const normalized = clean(text);
  const amounts = [...normalized.matchAll(PRICE_AMOUNT_RE)].map((match) => clean(match[0]));
  if (!amounts.length) return { amounts: [], snippet: '' };

  const index = normalized.search(PRICE_AMOUNT_RE);
  const start = Math.max(0, index - 220);
  const end = Math.min(normalized.length, index + 520);
  return {
    amounts: [...new Set(amounts)].slice(0, 8),
    snippet: normalized.slice(start, end)
  };
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

function priorityScore(gym: Gym) {
  let score = 0;
  const discipline = fold(primaryDiscipline(gym));
  if (/fitness|palestra|pilates|crossfit|yoga|nuoto|padel|judo|karate|boxe|kickboxing|personal/.test(discipline)) score += 30;
  if (hasOwnWebsite(gym)) score += 35;
  if (gym.verified || gym.is_verified || gym.weekly_hours?._verified) score += 15;
  if (!gym.needs_review) score += 10;
  if (clean(gym.phone || gym.telefono)) score += 5;
  if (clean(gym.hours_info || gym.orari)) score += 5;
  return score;
}

function proposedPriceInfo(snippet: string) {
  return clean(snippet).slice(0, 650);
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PalestreInZonaDataQualityBot/1.0 (+https://www.palestreinzona.it)'
      },
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !/text\/html|text\/plain|application\/xhtml|application\/pdf/i.test(contentType)) {
      return { ok: false, status: response.status, contentType, html: '' };
    }
    return { ok: true, status: response.status, contentType, html: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, contentType: '', html: '', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverPages(website: string) {
  const urls = new Set<string>();
  if (website) urls.add(website);

  const home = await fetchWithTimeout(website);
  if (home.ok) {
    for (const url of extractInternalLinks(home.html, website)) urls.add(url);
  }

  return [...urls].slice(0, maxPagesPerSite);
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
  .filter((gym) => !clean(gym.price_info) && hasOwnWebsite(gym))
  .sort((a, b) => priorityScore(b) - priorityScore(a) || nameOf(a).localeCompare(nameOf(b), 'it'))
  .slice(0, limit);

const rows = [];

for (const gym of candidates) {
  const website = clean(gym.website || gym.sito);
  const pages = await discoverPages(website);
  let best: Record<string, any> | null = null;

  for (const url of pages) {
    const result = await fetchWithTimeout(url);
    if (!result.ok) continue;

    const text = stripHtml(result.html);
    const extracted = priceSnippet(text);
    if (!extracted.amounts.length) continue;

    const pageScore = extracted.amounts.length * 20 + (PRICE_TEXT_RE.test(text) ? 25 : 0) + (url !== website ? 15 : 0);
    const row = {
      id: clean(gym.id),
      slug: clean(gym.slug || gym._canonical_slug),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina: primaryDiscipline(gym),
      website,
      website_host: hostForUrl(website),
      source_url: url,
      source_title: extractTitle(result.html),
      http_status: result.status,
      extracted_amounts: extracted.amounts.join(' | '),
      source_snippet: extracted.snippet,
      proposed_price_info: proposedPriceInfo(extracted.snippet),
      risk: extracted.amounts.length > 5 ? 'medium' : 'low',
      needs_review: true,
      decisione_consigliata: 'review_prezzo_estratto',
      score: pageScore
    };

    if (!best || Number(row.score) > Number(best.score || 0)) best = row;
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
      http_status: '',
      extracted_amounts: '',
      source_snippet: '',
      proposed_price_info: '',
      risk: 'none',
      needs_review: true,
      decisione_consigliata: 'nessun_prezzo_estratto',
      score: 0
    }
  );
}

const summary = {
  env_file: envFile,
  table,
  selected: candidates.length,
  extracted: rows.filter((row) => clean(row.proposed_price_info)).length,
  not_found: rows.filter((row) => !clean(row.proposed_price_info)).length,
  low_risk: rows.filter((row) => row.risk === 'low').length,
  medium_risk: rows.filter((row) => row.risk === 'medium').length
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(
  jsonOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      summary,
      rows
    },
    null,
    2
  )
);

const header = [
  'id',
  'slug',
  'nome',
  'citta',
  'indirizzo',
  'disciplina',
  'website',
  'source_url',
  'source_title',
  'extracted_amounts',
  'proposed_price_info',
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
        .filter((row) => clean(row.proposed_price_info))
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          nome: row.nome,
          source_url: row.source_url,
          extracted_amounts: row.extracted_amounts,
          risk: row.risk
        }))
    },
    null,
    2
  )
);
