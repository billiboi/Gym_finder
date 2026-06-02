import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { readGyms } from '$lib/server/gym-store';
import { isArchivedGym } from '$lib/admin/gyms';

const DATA_DIR = path.resolve('data');

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

function isOwnWebsite(website) {
  const host = getWebsiteHost(website);
  if (!host) return false;
  return !/(^|\.)((facebook|instagram|linkedin|youtube|google|maps|wa|whatsapp|tiktok)\.)/i.test(host);
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
