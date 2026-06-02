import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Candidate = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const candidatesFile = args.get('--candidates-file') || '';
const limit = Number(args.get('--limit') || '30');
const maxUrlsPerSite = Number(args.get('--max-urls-per-site') || '4');
const timeoutMs = Number(args.get('--timeout-ms') || '4500');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/official-price-page-discovery-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/official-price-page-discovery-${stamp}.csv`;

const PRICE_TEXT_RE = /\b(chf|eur|euro|€|fr\.|prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|mensile|annuale|listino|costo|costi|membership)\b/i;
const PRICE_AMOUNT_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+|\d+\s*(?:chf|eur|euro|€|fr\.)/i;
const LINK_HINT_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|costo|costi|membership|shop|corsi|orari)\b/i;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hostForUrl(value: unknown) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function csvCell(value: unknown) {
  const text = clean(value).replace(/"/g, '""');
  return /[",;\n\r]/.test(text) ? `"${text}"` : text;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&');
}

function extractTitle(html: string) {
  return clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function extractSnippet(text: string) {
  const normalized = clean(text);
  const amountMatch = normalized.match(PRICE_AMOUNT_RE);
  const keywordMatch = normalized.match(PRICE_TEXT_RE);
  const index = amountMatch?.index ?? keywordMatch?.index ?? -1;
  if (index < 0) return '';
  return normalized.slice(Math.max(0, index - 180), Math.min(normalized.length, index + 360));
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

function extractInternalLinks(html: string, base: string) {
  const host = hostForUrl(base);
  const links = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRe.exec(html))) {
    const url = absoluteUrl(match[1], base);
    if (!url || !sameHost(url, host)) continue;
    if (/\.(pdf|jpg|jpeg|png|webp|gif|zip|docx?|xlsx?)($|\?)/i.test(url)) continue;
    const text = stripHtml(match[2]);
    const combined = `${url} ${text}`;
    const score = (PRICE_TEXT_RE.test(combined) ? 80 : 0) + (LINK_HINT_RE.test(combined) ? 20 : 0);
    if (score <= 0) continue;
    links.push({ url, score, text: clean(text) });
  }

  return links
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .map((link) => link.url);
}

async function discoverUrls(candidate: Candidate) {
  const website = clean(candidate.website);
  const urls = new Set<string>();
  if (website) urls.add(website);

  const home = await fetchWithTimeout(website);
  if (home.ok) {
    const homeText = stripHtml(home.html);
    if (PRICE_TEXT_RE.test(homeText) || PRICE_AMOUNT_RE.test(homeText)) urls.add(website);
    for (const url of extractInternalLinks(home.html, website)) urls.add(url);
  }

  return [...urls].slice(0, maxUrlsPerSite);
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

if (!candidatesFile) throw new Error('Specifica --candidates-file=data/price-enrichment-candidates-....json');

const payload = JSON.parse(await readFile(candidatesFile, 'utf8'));
const candidates: Candidate[] = Array.isArray(payload.rows) ? payload.rows : [];
const selected = candidates.slice(0, limit);
const rows = [];

for (const candidate of selected) {
  const urls = await discoverUrls(candidate);
  let best: Record<string, any> | null = null;

  for (const url of urls) {
    const result = await fetchWithTimeout(url);
    if (!result.ok) continue;
    const text = stripHtml(result.html);
    const snippet = extractSnippet(text);
    const hasAmount = PRICE_AMOUNT_RE.test(text);
    const hasPriceSignal = PRICE_TEXT_RE.test(text);
    const score = (hasAmount ? 70 : 0) + (hasPriceSignal ? 20 : 0) + (url !== clean(candidate.website) ? 10 : 0);
    if (!hasPriceSignal && !hasAmount) continue;

    const row = {
      id: clean(candidate.id),
      nome: clean(candidate.nome),
      citta: clean(candidate.citta),
      disciplina: clean(candidate.disciplina),
      website: clean(candidate.website),
      website_host: hostForUrl(candidate.website),
      candidate_url: url,
      candidate_host: hostForUrl(url),
      http_status: result.status,
      title: extractTitle(result.html),
      has_amount: hasAmount,
      has_price_signal: hasPriceSignal,
      score,
      snippet,
      decisione_consigliata: hasAmount ? 'review_prezzo_trovato' : 'review_pagina_prezzi'
    };

    if (!best || row.score > Number(best.score || 0)) best = row;
  }

  rows.push(
    best || {
      id: clean(candidate.id),
      nome: clean(candidate.nome),
      citta: clean(candidate.citta),
      disciplina: clean(candidate.disciplina),
      website: clean(candidate.website),
      website_host: hostForUrl(candidate.website),
      candidate_url: '',
      candidate_host: '',
      http_status: '',
      title: '',
      has_amount: false,
      has_price_signal: false,
      score: 0,
      snippet: '',
      decisione_consigliata: 'nessuna_pagina_prezzi_trovata'
    }
  );
}

const summary = {
  candidates_file: candidatesFile,
  selected: selected.length,
  found_with_amount: rows.filter((row) => row.has_amount).length,
  found_price_page: rows.filter((row) => row.has_price_signal).length,
  not_found: rows.filter((row) => !row.has_price_signal).length
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
  'nome',
  'citta',
  'disciplina',
  'website',
  'candidate_url',
  'http_status',
  'title',
  'has_amount',
  'has_price_signal',
  'score',
  'decisione_consigliata',
  'snippet'
];

await writeFile(csvOut, [header.join(';'), ...rows.map((row) => header.map((key) => csvCell(row[key as keyof typeof row])).join(';'))].join('\n'));

console.log(
  JSON.stringify(
    {
      jsonOut,
      csvOut,
      summary,
      top_found: rows
        .filter((row) => row.has_price_signal)
        .slice(0, 15)
        .map((row) => ({
          id: row.id,
          nome: row.nome,
          url: row.candidate_url,
          has_amount: row.has_amount,
          score: row.score
        }))
    },
    null,
    2
  )
);
