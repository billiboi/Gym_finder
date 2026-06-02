import { fail } from '@sveltejs/kit';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { canWriteSupabase, readGyms, writeGymRecords } from '$lib/server/gym-store';
import { isArchivedGym } from '$lib/admin/gyms';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';

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

function adminErrorMessage(err, fallback) {
  const message = err?.message || fallback;
  return String(message).replace(/\s+/g, ' ').trim();
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

function isPlaceholderPrice(value) {
  const text = clean(value).toLowerCase();
  if (!text) return true;
  if (/(^|\D)(0[,.]00|0)\s*(chf|eur|euro|€|fr\.)|\b(chf|eur|euro|€|fr\.)\s*0([,.]00)?\b/i.test(text)) return true;
  return false;
}

function isWeakHours(value) {
  const text = clean(value);
  return !text || /orari da verificare/i.test(text);
}

function hasVerifiedEditorial(gym) {
  const source = clean(gym.descrizione_source || gym.description_source).toLowerCase();
  return Boolean(clean(gym.descrizione_owner) || /editoriale_verificata|owner|verificata/.test(source));
}

function buildAppliedGym(gym, row) {
  const changed = { ...gym };
  const weeklyHours = gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {};
  const applied = [];
  const sourceUrl = clean(row.source_url);

  if (!hasPrice(gym) && sourceUrl && clean(row.proposed_price_info) && !isPlaceholderPrice(row.proposed_price_info)) {
    changed.price_info = clean(row.proposed_price_info);
    changed.price_source_url = sourceUrl;
    changed.price_updated_at = new Date().toISOString();
    changed.verified_commercial_info = false;
    applied.push('price_info');
  }

  if (isWeakHours(gym.hours_info || gym.orari) && clean(row.proposed_hours_info)) {
    changed.hours_info = clean(row.proposed_hours_info);
    changed.orari = clean(row.proposed_hours_info);
    applied.push('hours_info');
  }

  const editorialEvidence = clean(row.proposed_editorial_evidence || row.proposed_courses_info || row.proposed_contact_info);
  if (editorialEvidence && !hasVerifiedEditorial(gym)) {
    if (!clean(gym.editorial_summary)) {
      changed.editorial_summary = editorialEvidence;
      applied.push('editorial_summary');
    }
    if (!clean(gym.descrizione_generata)) {
      changed.descrizione_generata = editorialEvidence;
      changed.descrizione_source = 'enrichment_preview_admin';
      changed.descrizione_needs_review = true;
      applied.push('descrizione_generata');
    }
  }

  changed.enrichment_status = applied.length ? 'preview_applied_needs_review' : gym.enrichment_status || 'pending';
  changed.enrichment_updated_at = new Date().toISOString();
  changed.enrichment_notes = [
    clean(gym.enrichment_notes),
    applied.length
      ? `Preview contenuti applicata da admin: ${applied.join(', ')}. Fonte: ${sourceUrl || 'n/d'}`
      : `Preview contenuti ignorata: nessun campo applicabile senza overwrite. Fonte: ${sourceUrl || 'n/d'}`
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);
  changed.weekly_hours = {
    ...weeklyHours,
    _content_enrichment_source_url: sourceUrl || weeklyHours._content_enrichment_source_url || '',
    _content_enrichment_topics: clean(row.extracted_topics)
  };

  return { changed, applied };
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
  },

  applySelected: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error: 'Apply bloccato: SUPABASE_SERVICE_ROLE_KEY non disponibile nell’ambiente corrente.'
      });
    }

    const form = await request.formData();
    const confirmText = clean(form.get('confirm_text'));
    if (confirmText !== 'APPLICA') {
      return fail(400, { error: 'Apply bloccato: scrivi APPLICA per confermare.' });
    }

    const selectedRows = form
      .getAll('selected_rows')
      .map((value) => {
        try {
          return JSON.parse(String(value || '{}'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (!selectedRows.length) return fail(400, { error: 'Seleziona almeno una preview da applicare.' });

    const gyms = await readGyms();
    const byId = new Map(gyms.map((gym) => [clean(gym.id), gym]));
    const changedRecords = [];
    const auditRows = [];
    const skipped = [];

    for (const row of selectedRows) {
      const id = clean(row.id);
      const gym = byId.get(id);
      if (!gym || isArchivedGym(gym)) {
        skipped.push({ id, reason: 'scheda non trovata o archiviata' });
        continue;
      }

      if (clean(row.nome) && clean(row.nome) !== getGymName(gym)) {
        skipped.push({ id, reason: 'nome preview non coerente con scheda' });
        continue;
      }

      const { changed, applied } = buildAppliedGym(gym, row);
      if (!applied.length) {
        skipped.push({ id, reason: 'nessun campo applicabile senza overwrite' });
        continue;
      }

      changedRecords.push(changed);
      auditRows.push({ before: gym, after: changed, applied });
    }

    if (!changedRecords.length) {
      return fail(400, { error: 'Nessuna preview applicabile senza sovrascrivere dati esistenti.', skipped });
    }

    try {
      await writeGymRecords(changedRecords);
      await writeAdminAuditLog({
        action: 'CONTENT_ENRICHMENT_APPLY_SELECTED',
        recordId: changedRecords.map((gym) => gym.id).join(','),
        beforeData: {
          count: auditRows.length,
          records: auditRows.map((row) => ({
            id: row.before.id,
            price_info: row.before.price_info,
            hours_info: row.before.hours_info,
            editorial_summary: row.before.editorial_summary,
            descrizione_generata: row.before.descrizione_generata
          }))
        },
        afterData: {
          count: auditRows.length,
          skipped,
          records: auditRows.map((row) => ({
            id: row.after.id,
            applied: row.applied,
            price_info: row.after.price_info,
            hours_info: row.after.hours_info,
            editorial_summary: row.after.editorial_summary,
            descrizione_generata: row.after.descrizione_generata,
            enrichment_status: row.after.enrichment_status
          }))
        }
      }).catch(() => {});
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Apply contenuti non riuscito.'), skipped });
    }

    return {
      applied: changedRecords.length,
      skipped,
      message: `Applicate ${changedRecords.length} schede.`
    };
  }
};
