import { analyzeOfficialHtmlPages, discoverOfficialLinks } from '$lib/official-structured-scraper.js';
import { reconcileGymFacts } from '$lib/official-reconciliation.js';
import { generateGymEditorialPreview } from '$lib/gym-editorial-preview.js';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max = 6000) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} [...]`;
}

export function appendAdminNote(existing, note) {
  const current = clean(existing);
  const next = clean(note);
  if (!current) return next;
  if (!next) return current;
  return `${current}\n${next}`.slice(0, 4000);
}

export function normalizeFaqItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: clean(item?.question),
      answer: clean(item?.answer)
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 5);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const home = await fetchHtml(website);
  if (!home.ok) return website ? [website] : [];
  return discoverOfficialLinks(home.html, website, 8);
}

/**
 * Fa scraping del sito ufficiale di una singola scheda e ritorna la
 * riconciliazione scheda/fonte-ufficiale (prezzo, orari, contatti, ecc.)
 * più l'anteprima editoriale generata dagli stessi dati. Nessuna scrittura:
 * la scheda passata in input non viene modificata.
 */
export async function analyzeGymOfficialSite(gym) {
  const website = clean(gym.website || gym.sito || '');
  if (!website) {
    return { hasWebsite: false };
  }

  const pages = await discoverPages(website);
  const scrapedPages = [];

  for (const url of pages) {
    await wait(1200);
    const result = await fetchHtml(url);
    if (!result.ok) continue;
    scrapedPages.push({ url, html: result.html, fetched_at: new Date().toISOString() });
  }

  if (!scrapedPages.length) {
    return { hasWebsite: true, pagesFound: false };
  }

  const officialAnalysis = analyzeOfficialHtmlPages(scrapedPages);
  const reconciliation = reconcileGymFacts(gym, { ...officialAnalysis.facts_json, source_url: website, website });
  const editorialPreview = generateGymEditorialPreview(gym, reconciliation);

  return {
    hasWebsite: true,
    pagesFound: true,
    source_url: scrapedPages[0]?.url || website,
    source_title: officialAnalysis.pages_scraped?.[0]?.title || '',
    source_fetched_at: scrapedPages[0]?.fetched_at || new Date().toISOString(),
    pages_scraped: officialAnalysis.pages_scraped,
    confidence_score: officialAnalysis.confidence_score,
    extracted_sections: officialAnalysis.sections_json,
    extracted_facts: officialAnalysis.facts_json,
    extraction_warnings: officialAnalysis.warnings,
    raw_official_text: truncate(officialAnalysis.raw_text),
    clean_official_text: truncate(officialAnalysis.clean_text),
    reconciliation,
    editorial_preview: editorialPreview
  };
}
