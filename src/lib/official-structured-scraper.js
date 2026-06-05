import { cleanOfficialScrape, extractOfficialSections } from './official-scrape-cleaner.js';

const DISCOVERY_RE =
  /\b(contatti|dove[-\s]?siamo|chi[-\s]?siamo|about|corsi|discipline|programmi|orari|allenamenti|schedule|timetable|prezzi|tariffe|iscrizioni)\b/i;
const BLOCKED_HOST_RE = /(^|\.)((facebook|instagram|linkedin|youtube|google|maps|wa|whatsapp|tiktok|linktr)\.)/i;
const BLOCKED_FILE_RE = /\.(?:jpg|jpeg|png|webp|gif|svg|pdf|zip|rar|7z|docx?|xlsx?|pptx?|mp4|mov|avi)($|\?)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/g;
const PRICE_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:chf|eur|euro|€|fr\.)/gi;
const ADDRESS_RE = /\b(?:via|viale|piazza|corso|largo|strada|vicolo|contrada)\s+[A-ZÀ-Üa-zà-ÿ0-9'’., -]{3,90}(?:\b\d+[A-Za-z]?)?/gi;
const SCHEDULE_RE =
  /\b(?:lun(?:edi|edì)?|mar(?:tedi|tedì)?|mer(?:coledi|coledì)?|gio(?:vedi|vedì)?|ven(?:erdi|erdì)?|sab(?:ato)?|dom(?:enica)?)(?:[^.;\n]{0,100}?\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?)/gi;
const COURSE_RE =
  /\b(crossfit|fitness|pilates|yoga|taekwondo|karate|judo|boxe|kickboxing|muay thai|mma|bjj|krav maga|wing chun|calisthenics|allenamento funzionale|personal training|ginnastica posturale|danza|nuoto|padel)\b/gi;
const SOCIAL_RE = /\b(instagram|facebook|linkedin|youtube|tiktok|whatsapp)\.com|wa\.me|youtu\.be/i;
const ABOUT_RE = /\b(chi siamo|about|storia|scuola|palestra|associazione|centro|fondat[ao]|nasce|missione|valori)\b/i;

function clean(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeUrlValue(value) {
  try {
    return decodeURIComponent(clean(value));
  } catch {
    return clean(value);
  }
}

function decodeHtml(value) {
  return clean(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&euro;/gi, '€')
    .replace(/&#0*([0-9]+);/g, (_, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCharCode(value) : ' ';
    })
    .replace(/&[#a-z0-9]+;/gi, ' ');
}

function stripHtml(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  return decodeHtml(String(tag || '').match(re)?.[1] || '');
}

function tagTexts(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...String(html || '').matchAll(re)].map((match) => stripHtml(match[1])).filter(Boolean);
}

function metaContent(html, selectorRe) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((item) => selectorRe.test(item));
  return tag ? attr(tag, 'content') : '';
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

function hostFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function sameOfficialHost(url, base) {
  const host = hostFor(url);
  return Boolean(host && host === hostFor(base) && !BLOCKED_HOST_RE.test(host));
}

function fact(value, sourceUrl, sourceSection, confidence = 'medium', warning = '', extra = {}) {
  return { value: clean(value), source_url: sourceUrl, source_section: sourceSection, confidence, warning, ...extra };
}

function pushUnique(target, item) {
  if (!item?.value) return;
  const key = `${item.source_section}:${item.value}`.toLowerCase();
  if (!target.some((existing) => `${existing.source_section}:${existing.value}`.toLowerCase() === key)) target.push(item);
}

function collectAnchors(html, baseUrl) {
  const anchors = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const href = attr(match[1], 'href');
    anchors.push({ href, url: absoluteUrl(href, baseUrl), text: stripHtml(match[2]) });
  }
  return anchors;
}

function parseJsonLd(html) {
  const items = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      items.push(...values);
    } catch {
      items.push({ warning: 'JSON-LD non valido o non leggibile.' });
    }
  }
  return items;
}

export function buildOfficialDomSnapshot(html, sourceUrl) {
  const title = tagTexts(html, 'title')[0] || '';
  const metaDescription = metaContent(html, /\bname=["']description["']/i);
  const og = {
    title: metaContent(html, /\bproperty=["']og:title["']/i),
    description: metaContent(html, /\bproperty=["']og:description["']/i),
    image: metaContent(html, /\bproperty=["']og:image["']/i)
  };
  const anchors = collectAnchors(html, sourceUrl);
  const images = (String(html || '').match(/<img\b[^>]*>/gi) || []).map((tag) => ({
    src: absoluteUrl(attr(tag, 'src') || attr(tag, 'data-src'), sourceUrl),
    alt: attr(tag, 'alt')
  }));
  const iframes = (String(html || '').match(/<iframe\b[^>]*>/gi) || []).map((tag) => ({ src: absoluteUrl(attr(tag, 'src'), sourceUrl) }));
  const tables = tagTexts(html, 'table');

  return {
    source_url: sourceUrl,
    title,
    meta_description: metaDescription,
    open_graph: og,
    h1: tagTexts(html, 'h1'),
    h2: tagTexts(html, 'h2'),
    h3: tagTexts(html, 'h3'),
    p: tagTexts(html, 'p'),
    li: tagTexts(html, 'li'),
    table: tables,
    tel_links: anchors.filter((anchor) => /^tel:/i.test(anchor.href)),
    mail_links: anchors.filter((anchor) => /^mailto:/i.test(anchor.href)),
    anchors,
    images,
    iframes,
    schema_org: parseJsonLd(html),
    raw_text: stripHtml(html)
  };
}

export function discoverOfficialLinks(homeHtml, baseUrl, maxPages = 8) {
  const scored = new Map([[baseUrl, 1000]]);
  for (const anchor of collectAnchors(homeHtml, baseUrl)) {
    if (!anchor.url || !sameOfficialHost(anchor.url, baseUrl)) continue;
    if (BLOCKED_FILE_RE.test(anchor.url)) continue;
    if (SOCIAL_RE.test(`${anchor.url} ${anchor.text}`)) continue;
    const haystack = decodeURIComponent(`${anchor.url} ${anchor.text}`.toLowerCase());
    if (!DISCOVERY_RE.test(haystack)) continue;
    const keywordScore = (haystack.match(DISCOVERY_RE) || []).length * 50;
    const shortUrlBonus = Math.max(0, 40 - anchor.url.length / 4);
    scored.set(anchor.url, Math.max(scored.get(anchor.url) || 0, keywordScore + shortUrlBonus));
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([url]) => url).slice(0, maxPages);
}

export function extractContacts(dom) {
  const items = [];
  for (const link of dom.tel_links || []) pushUnique(items, fact(decodeUrlValue(link.href.replace(/^tel:/i, '')), dom.source_url, 'tel', 'high', '', { type: 'phone' }));
  for (const link of dom.mail_links || []) pushUnique(items, fact(decodeUrlValue(link.href.replace(/^mailto:/i, '').split('?')[0]), dom.source_url, 'mailto', 'high', '', { type: 'email' }));
  for (const block of [dom.meta_description, ...dom.p, ...dom.li, ...dom.table].filter(Boolean)) {
    for (const value of block.match(EMAIL_RE) || []) pushUnique(items, fact(value, dom.source_url, 'testo', 'high', '', { type: 'email' }));
    if (!/\b(tel|telefono|cell|cellulare|whatsapp|contatti|chiama)\b/i.test(block)) continue;
    for (const value of block.match(PHONE_RE) || []) {
      const digits = clean(value).replace(/\D/g, '');
      if (digits.length < 7) continue;
      if (digits.length === 11 && !/^\+|^00/.test(clean(value))) continue;
      pushUnique(items, fact(value, dom.source_url, 'testo', 'medium', '', { type: 'phone' }));
    }
  }
  return items;
}

export function extractAddress(dom) {
  const items = [];
  const schemaText = JSON.stringify(dom.schema_org || []);
  for (const value of schemaText.match(ADDRESS_RE) || []) pushUnique(items, fact(value, dom.source_url, 'schema_org', 'high'));
  const text = [dom.meta_description, ...dom.p, ...dom.li, ...dom.table].join('\n');
  for (const value of text.match(ADDRESS_RE) || []) pushUnique(items, fact(value, dom.source_url, 'testo', 'medium'));
  for (const iframe of dom.iframes || []) {
    if (/google\.[^/]+\/maps|maps\.google/i.test(iframe.src)) pushUnique(items, fact(iframe.src, dom.source_url, 'iframe_google_maps', 'medium', 'Mappa rilevata: verificare indirizzo testuale prima di pubblicare.'));
  }
  return items;
}

export function extractCourses(dom) {
  const items = [];
  const textBlocks = [...dom.h1, ...dom.h2, ...dom.h3, ...dom.p, ...dom.li].filter((text) => COURSE_RE.test(text) || /\b(corsi|discipline|programmi|allenamenti)\b/i.test(text));
  for (const block of textBlocks) {
    for (const value of block.match(COURSE_RE) || []) pushUnique(items, fact(value, dom.source_url, 'corsi_discipline', 'high'));
    if (/\b(corsi|discipline|programmi|allenamenti)\b/i.test(block) && clean(block).split(/\s+/).length >= 5) {
      pushUnique(items, fact(block.slice(0, 280), dom.source_url, 'corsi_discipline', 'medium'));
    }
  }
  return items;
}

export function extractSchedules(dom) {
  const items = [];
  for (const block of [...dom.table, ...dom.p, ...dom.li]) {
    for (const value of block.match(SCHEDULE_RE) || []) pushUnique(items, fact(value, dom.source_url, dom.table.includes(block) ? 'table' : 'testo', 'medium'));
    if (/\b(orari|schedule|timetable)\b/i.test(block) && /\d{1,2}[:.]\d{2}/.test(block)) pushUnique(items, fact(block.slice(0, 320), dom.source_url, 'orari', 'medium'));
  }
  return items;
}

export function extractPrices(dom) {
  const items = [];
  for (const block of [...dom.table, ...dom.p, ...dom.li]) {
    for (const value of block.match(PRICE_RE) || []) {
      pushUnique(items, fact(value, dom.source_url, dom.table.includes(block) ? 'table' : 'testo', 'medium', 'Prezzo da verificare prima di uso editoriale.'));
    }
    if (/\b(prezzi|tariffe|abbonamenti|iscrizioni)\b/i.test(block) && PRICE_RE.test(block)) {
      pushUnique(items, fact(block.slice(0, 320), dom.source_url, 'prezzi', 'medium', 'Blocco prezzo da review manuale.'));
    }
  }
  return items;
}

export function extractAboutText(dom) {
  const items = [];
  const candidates = [dom.meta_description, dom.open_graph?.description, ...dom.h1, ...dom.h2, ...dom.h3, ...dom.p].filter(Boolean);
  for (const block of candidates) {
    if (ABOUT_RE.test(block) && clean(block).split(/\s+/).length >= 8) pushUnique(items, fact(block.slice(0, 420), dom.source_url, 'chi_siamo', 'medium'));
  }
  return items;
}

export function extractSocialLinks(dom) {
  const items = [];
  for (const anchor of dom.anchors || []) {
    if (SOCIAL_RE.test(anchor.url)) pushUnique(items, fact(anchor.url, dom.source_url, 'social_link', 'medium', '', { label: anchor.text }));
  }
  return items;
}

export function extractImages(dom) {
  const items = [];
  for (const image of dom.images || []) {
    if (!image.src || !/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(image.src)) continue;
    pushUnique(items, fact(image.src, dom.source_url, 'immagine', image.alt ? 'medium' : 'low', image.alt ? '' : 'Immagine senza testo alternativo.', { alt: image.alt }));
  }
  if (dom.open_graph?.image) pushUnique(items, fact(absoluteUrl(dom.open_graph.image, dom.source_url), dom.source_url, 'open_graph', 'medium'));
  return items.slice(0, 12);
}

export function extractSchemaOrg(dom) {
  return (dom.schema_org || []).map((item) => fact(JSON.stringify(item).slice(0, 1200), dom.source_url, 'schema_org', item.warning ? 'low' : 'medium', item.warning || ''));
}

function factsFromDom(dom) {
  return {
    contacts: extractContacts(dom),
    addresses: extractAddress(dom),
    courses: extractCourses(dom),
    schedules: extractSchedules(dom),
    prices: extractPrices(dom),
    about: extractAboutText(dom),
    social_links: extractSocialLinks(dom),
    images: extractImages(dom),
    schema_org: extractSchemaOrg(dom),
    warnings: []
  };
}

function mergeFacts(target, source) {
  for (const [key, items] of Object.entries(source)) {
    if (key === 'warnings') continue;
    if (!Array.isArray(target[key])) target[key] = [];
    for (const item of items || []) pushUnique(target[key], item);
  }
}

function legacyFacts(factsJson) {
  const contacts = factsJson.contacts || [];
  return {
    phones_found: contacts.filter((item) => item.type === 'phone'),
    emails_found: contacts.filter((item) => item.type === 'email'),
    addresses_found: factsJson.addresses || [],
    disciplines_found: (factsJson.courses || []).filter((item) => item.value.split(/\s+/).length <= 4),
    schedules_found: factsJson.schedules || [],
    prices_found: factsJson.prices || [],
    people_found: [],
    organization_history: factsJson.about || [],
    source_highlights: [...(factsJson.about || []), ...(factsJson.courses || []), ...(factsJson.schedules || [])].slice(0, 12),
    social_found: factsJson.social_links || []
  };
}

function confidenceScore(factsJson, cleanText, warnings) {
  let score = 20;
  score += Math.min((factsJson.contacts || []).length, 4) * 8;
  score += Math.min((factsJson.addresses || []).length, 2) * 10;
  score += Math.min((factsJson.courses || []).length, 6) * 5;
  score += Math.min((factsJson.schedules || []).length, 4) * 5;
  score += Math.min((factsJson.about || []).length, 3) * 7;
  if (cleanText.length > 500) score += 8;
  score -= Math.min(warnings.length * 6, 24);
  return Math.max(0, Math.min(100, score));
}

export function analyzeOfficialHtmlPages(pages) {
  const snapshots = pages.map((page) => buildOfficialDomSnapshot(page.html, page.url));
  const factsJson = { contacts: [], addresses: [], courses: [], schedules: [], prices: [], about: [], social_links: [], images: [], schema_org: [], warnings: [] };
  const rawText = snapshots.map((dom) => [dom.title, dom.meta_description, ...dom.h1, ...dom.h2, ...dom.h3, ...dom.p, ...dom.li, ...dom.table].join('\n')).join('\n\n');
  for (const dom of snapshots) mergeFacts(factsJson, factsFromDom(dom));
  const cleanText = cleanOfficialScrape(rawText);
  const sectionsPayload = extractOfficialSections(cleanText);
  const warnings = [...new Set([...(sectionsPayload.warnings || []), ...(factsJson.warnings || [])])];
  if (!factsJson.contacts.length) warnings.push('Nessun contatto strutturato rilevato dal DOM.');
  if (!factsJson.courses.length && !factsJson.about.length) warnings.push('Pochi facts editoriali rilevati dal DOM.');
  factsJson.warnings = warnings;

  return {
    pages_scraped: pages.map((page) => ({ url: page.url, title: buildOfficialDomSnapshot(page.html, page.url).title, fetched_at: page.fetched_at })),
    raw_text: clean(rawText),
    clean_text: cleanText,
    sections: sectionsPayload.sections,
    sections_json: sectionsPayload.sections,
    facts_json: factsJson,
    facts: legacyFacts(factsJson),
    confidence_score: confidenceScore(factsJson, cleanText, warnings),
    warnings
  };
}
