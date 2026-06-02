import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { readGyms } from '$lib/server/gym-store';
import { isArchivedGym } from '$lib/admin/gyms';

const DATA_DIR = path.resolve('data');
const PRICE_TEXT_RE =
  /\b(chf|eur|euro|€|fr\.|prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|mensile|annuale|listino|costo|costi|membership)\b/i;
const PRICE_AMOUNT_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:chf|eur|euro|€|fr\.)/gi;
const COURSES_RE =
  /\b(corsi?|lezioni?|attivit[aà]|disciplin[ae]|fitness|pilates|yoga|crossfit|judo|karate|boxe|kickboxing|nuoto|personal training|ems|padel)\b/i;
const HOURS_RE = /\b(orari?|apert[ou]ra|lun|mar|mer|gio|ven|sab|dom|mattina|pomeriggio|sera)\b/i;
const CONTACT_RE = /\b(contatti?|telefono|tel\.|email|e-mail|whatsapp|indirizzo|sede)\b/i;
const LINK_HINT_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|costo|costi|membership|corsi?|attivit[aà]|orari?|contatti?|sede)\b/i;

async function readLatestReport(prefix) {
  try {
    const files = await readdir(DATA_DIR);
    const latest = files
      .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
      .sort()
      .reverse()[0];

    if (!latest) {
      return { filename: '', generatedAt: '', summary: {}, rows: [], hasReport: false };
    }

    const raw = await readFile(path.join(DATA_DIR, latest), 'utf8');
    const report = JSON.parse(raw);

    return {
      filename: latest,
      generatedAt: report.generated_at || '',
      summary: report.summary || {},
      rows: Array.isArray(report.rows) ? report.rows : [],
      hasReport: true
    };
  } catch {
    return { filename: '', generatedAt: '', summary: {}, rows: [], hasReport: false };
  }
}

function hasPrice(gym) {
  return Boolean(String(gym.price_info || '').trim());
}

function hasDescription(gym) {
  return Boolean(String(gym.description || gym.descrizione || gym.descrizione_editoriale || '').trim());
}

function getGymName(gym) {
  return gym.nome || gym.name || 'Senza nome';
}

function getGymCity(gym) {
  return gym.citta || gym.city || '';
}

function getGymAddress(gym) {
  return gym.indirizzo || gym.address || '';
}

function getGymDiscipline(gym) {
  return gym.disciplina || gym.discipline || (Array.isArray(gym.disciplines) ? gym.disciplines[0] : '') || 'Fitness';
}

function getWebsiteHost(website) {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isOwnWebsite(website) {
  const host = getWebsiteHost(website);
  if (!host) return false;
  return !/(^|\.)((facebook|instagram|linkedin|youtube|google|maps|wa|whatsapp|tiktok)\.)/i.test(host);
}

function sameHost(url, host) {
  return getWebsiteHost(url).toLowerCase() === String(host || '').toLowerCase();
}

function absoluteUrl(href, base) {
  try {
    const url = new URL(href, base);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function stripHtml(html) {
  return String(html || '')
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

function extractTitle(html) {
  return clean(String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function extractInternalLinks(html, base) {
  const host = getWebsiteHost(base);
  const links = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRe.exec(String(html || '')))) {
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
    if (score > 0) links.push({ url, score });
  }

  return [...new Map(links.sort((a, b) => b.score - a.score || a.url.length - b.url.length).map((link) => [link.url, link])).values()]
    .map((link) => link.url)
    .slice(0, 4);
}

function snippetAround(text, patterns) {
  const normalized = clean(text);
  const indexes = patterns.map((pattern) => normalized.search(pattern)).filter((index) => index >= 0);
  if (!indexes.length) return '';
  const index = Math.min(...indexes);
  return normalized.slice(Math.max(0, index - 220), Math.min(normalized.length, index + 620));
}

function summarizeText(text) {
  const normalized = clean(text);
  const amounts = [...normalized.matchAll(PRICE_AMOUNT_RE)].map((match) => clean(match[0]));
  const hasPrice = amounts.length > 0 || PRICE_TEXT_RE.test(normalized);
  const hasCourses = COURSES_RE.test(normalized);
  const hasHours = HOURS_RE.test(normalized);
  const hasContact = CONTACT_RE.test(normalized);
  const topics = [
    hasPrice ? 'prezzi_abbonamenti' : '',
    hasCourses ? 'corsi_discipline' : '',
    hasHours ? 'orari' : '',
    hasContact ? 'contatti_sede' : ''
  ].filter(Boolean);

  return {
    amounts: [...new Set(amounts)].slice(0, 8),
    topics,
    proposed_price_info: hasPrice ? snippetAround(normalized, [PRICE_AMOUNT_RE, PRICE_TEXT_RE]).slice(0, 650) : '',
    proposed_courses_info: hasCourses ? snippetAround(normalized, [COURSES_RE]).slice(0, 650) : '',
    proposed_hours_info: hasHours ? snippetAround(normalized, [HOURS_RE]).slice(0, 650) : '',
    proposed_contact_info: hasContact ? snippetAround(normalized, [CONTACT_RE]).slice(0, 650) : ''
  };
}

async function fetchHtml(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PalestreInZonaDataQualityBot/1.0 (+https://www.palestreinzona.it)' },
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return { ok: false, status: response.status, html: '' };
    }
    return { ok: true, status: response.status, html: await response.text() };
  } catch {
    return { ok: false, status: 0, html: '' };
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverPages(website) {
  const urls = new Set();
  if (website) urls.add(website);
  const home = await fetchHtml(website);
  if (home.ok) {
    for (const url of extractInternalLinks(home.html, website)) urls.add(url);
  }
  return [...urls].slice(0, 4);
}

function needsEnrichment(gym) {
  return (
    !hasPrice(gym) ||
    !hasDescription(gym) ||
    !String(gym.hours_info || gym.orari || '').trim() ||
    !String(gym.phone || gym.telefono || '').trim()
  );
}

function normalizePreviewRow(gym, best) {
  const website = clean(gym.website || gym.sito || '');
  return {
    id: clean(gym.id),
    slug: clean(gym.slug || gym._canonical_slug),
    nome: getGymName(gym),
    citta: getGymCity(gym),
    indirizzo: getGymAddress(gym),
    disciplina: getGymDiscipline(gym),
    website,
    website_host: getWebsiteHost(website),
    source_url: best?.source_url || '',
    source_title: best?.source_title || '',
    extracted_topics: best?.extracted_topics || '',
    extracted_amounts: best?.extracted_amounts || '',
    proposed_price_info: best?.proposed_price_info || '',
    proposed_courses_info: best?.proposed_courses_info || '',
    proposed_hours_info: best?.proposed_hours_info || '',
    proposed_contact_info: best?.proposed_contact_info || '',
    proposed_editorial_evidence: best?.proposed_editorial_evidence || '',
    risk: best?.risk || 'none',
    needs_review: true,
    decisione_consigliata: best?.decisione_consigliata || 'nessun_contenuto_estratto',
    score: best?.score || 0
  };
}

async function generatePreviewFromGyms(gyms, limit = 20) {
  const selected = gyms
    .filter((gym) => !isArchivedGym(gym))
    .filter((gym) => isOwnWebsite(gym.website || gym.sito || '') && needsEnrichment(gym))
    .slice(0, limit);

  const rows = [];
  for (const gym of selected) {
    const website = clean(gym.website || gym.sito || '');
    const pages = await discoverPages(website);
    let best = null;

    for (const url of pages) {
      const result = await fetchHtml(url);
      if (!result.ok) continue;
      const summary = summarizeText(stripHtml(result.html));
      if (!summary.topics.length) continue;
      const score = summary.topics.length * 25 + summary.amounts.length * 15 + (url !== website ? 10 : 0);
      const row = {
        source_url: url,
        source_title: extractTitle(result.html),
        extracted_topics: summary.topics.join(' | '),
        extracted_amounts: summary.amounts.join(' | '),
        proposed_price_info: summary.proposed_price_info,
        proposed_courses_info: summary.proposed_courses_info,
        proposed_hours_info: summary.proposed_hours_info,
        proposed_contact_info: summary.proposed_contact_info,
        proposed_editorial_evidence: (summary.proposed_courses_info || summary.proposed_contact_info || summary.proposed_hours_info).slice(0, 650),
        risk: summary.amounts.length > 5 ? 'medium' : 'low',
        decisione_consigliata: 'review_contenuti_estratti',
        score
      };
      if (!best || row.score > Number(best.score || 0)) best = row;
    }

    rows.push(normalizePreviewRow(gym, best));
  }

  return {
    filename: 'generato dalla pagina admin',
    generatedAt: new Date().toISOString(),
    hasReport: true,
    summary: {
      selected: selected.length,
      extracted: rows.filter((row) => row.extracted_topics).length,
      with_prices: rows.filter((row) => row.proposed_price_info).length,
      with_courses: rows.filter((row) => row.proposed_courses_info).length,
      with_hours: rows.filter((row) => row.proposed_hours_info).length,
      not_found: rows.filter((row) => !row.extracted_topics).length
    },
    rows
  };
}

function scorePriceCandidate(gym) {
  let score = 45;
  if (getGymCity(gym)) score += 10;
  if (getGymAddress(gym)) score += 10;
  if (getGymDiscipline(gym)) score += 10;
  if (String(gym.phone || gym.telefono || '').trim()) score += 5;
  if (String(gym.hours_info || gym.orari || '').trim()) score += 5;
  if (String(gym.description || gym.descrizione || '').trim()) score += 5;
  return Math.min(score, 100);
}

function buildLiveEnrichmentReport(activeGyms) {
  const rows = activeGyms
    .filter((gym) => (!hasPrice(gym) || !hasDescription(gym)) && isOwnWebsite(gym.website || gym.sito || ''))
    .map((gym) => {
      const website = gym.website || gym.sito || '';
      const priorityScore = scorePriceCandidate(gym);
      return {
        id: gym.id,
        slug: gym.slug || '',
        nome: getGymName(gym),
        citta: getGymCity(gym),
        indirizzo: getGymAddress(gym),
        disciplina: getGymDiscipline(gym),
        website,
        website_host: getWebsiteHost(website),
        needs_review: false,
        review_reason: '',
        priority_score: priorityScore,
        needs_price: !hasPrice(gym),
        needs_description: !hasDescription(gym)
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score || a.nome.localeCompare(b.nome, 'it'));

  return {
    filename: 'calcolato dal database live',
    generatedAt: new Date().toISOString(),
    hasReport: false,
    summary: {
      without_price_with_own_website: rows.filter((row) => row.needs_price).length,
      content_candidates: rows.length,
      high_priority: rows.filter((row) => Number(row.priority_score) >= 80).length,
      medium_priority: rows.filter((row) => Number(row.priority_score) >= 60 && Number(row.priority_score) < 80).length,
      low_priority: rows.filter((row) => Number(row.priority_score) < 60).length
    },
    rows
  };
}

export async function load() {
  const [reviewReport, enrichmentReport, contentPreviewReport, pricePreviewReport, gyms] = await Promise.all([
    readLatestReport('price-review-queue-'),
    readLatestReport('price-enrichment-candidates-'),
    readLatestReport('content-enrichment-preview-'),
    readLatestReport('price-enrichment-preview-'),
    readGyms().catch(() => [])
  ]);

  const activeGyms = Array.isArray(gyms) ? gyms.filter((gym) => !isArchivedGym(gym)) : [];
  const liveEnrichmentReport = enrichmentReport.rows.length > 0 ? enrichmentReport : buildLiveEnrichmentReport(activeGyms);
  const previewReport = contentPreviewReport.rows.length > 0 ? contentPreviewReport : pricePreviewReport;

  return {
    priceStats: {
      activeGyms: activeGyms.length,
      withPrice: activeGyms.filter(hasPrice).length,
      withoutPrice: activeGyms.filter((gym) => !hasPrice(gym)).length,
      withDescription: activeGyms.filter(hasDescription).length,
      withoutDescription: activeGyms.filter((gym) => !hasDescription(gym)).length
    },
    reviewReport: {
      ...reviewReport,
      rows: reviewReport.rows.slice(0, 200)
    },
    enrichmentReport: {
      ...liveEnrichmentReport,
      rows: liveEnrichmentReport.rows.slice(0, 200)
    },
    discoveryReport: {
      ...previewReport,
      rows: previewReport.rows.slice(0, 200)
    }
  };
}

export const actions = {
  generatePreview: async ({ request }) => {
    const form = await request.formData();
    const limit = Math.min(Math.max(Number(form.get('limit') || 20), 1), 40);
    const gyms = await readGyms().catch(() => []);
    const previewReport = await generatePreviewFromGyms(Array.isArray(gyms) ? gyms : [], limit);
    return { previewReport };
  }
};
