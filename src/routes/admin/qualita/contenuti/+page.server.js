import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';

const DATA_DIR = path.resolve('data');

async function readLatestCandidatesReport() {
  try {
    const files = await readdir(DATA_DIR);
    const latest = files
      .filter((file) => file.startsWith('price-enrichment-candidates-') && file.endsWith('.json'))
      .sort()
      .reverse()[0];

    if (!latest) return null;

    const raw = await readFile(path.join(DATA_DIR, latest), 'utf8');
    const report = JSON.parse(raw);
    return {
      filename: latest,
      generatedAt: report.generated_at || '',
      rows: Array.isArray(report.rows) ? report.rows : []
    };
  } catch {
    return null;
  }
}

function hasPrice(gym) {
  return Boolean(String(gym.price_info || '').trim());
}

function hasDescription(gym) {
  return Boolean(String(gym.description || gym.descrizione || gym.descrizione_editoriale || '').trim());
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

function scoreCandidate(gym) {
  let score = 45;
  if (gym.citta || gym.city) score += 10;
  if (gym.indirizzo || gym.address) score += 10;
  if (gym.disciplina || gym.discipline) score += 10;
  if (String(gym.phone || gym.telefono || '').trim()) score += 5;
  if (String(gym.hours_info || gym.orari || '').trim()) score += 5;
  if (String(gym.description || gym.descrizione || '').trim()) score += 5;
  return Math.min(score, 100);
}

function buildLiveCandidates(activeGyms) {
  return activeGyms
    .filter((gym) => (!hasPrice(gym) || !hasDescription(gym)) && isOwnWebsite(gym.website || gym.sito || ''))
    .map((gym) => {
      const website = gym.website || gym.sito || '';
      return {
        id: gym.id,
        nome: gym.nome || gym.name || 'Senza nome',
        citta: gym.citta || gym.city || '',
        website,
        website_host: getWebsiteHost(website),
        needs_price: !hasPrice(gym),
        needs_description: !hasDescription(gym),
        priority_score: scoreCandidate(gym)
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score || a.nome.localeCompare(b.nome, 'it'));
}

export async function load() {
  const [report, gyms] = await Promise.all([readLatestCandidatesReport(), readGyms().catch(() => [])]);
  const activeGyms = Array.isArray(gyms) ? gyms.filter((gym) => !isArchivedGym(gym)) : [];

  const rows = report?.rows?.length
    ? report.rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        citta: row.citta,
        website: row.website,
        website_host: row.website_host || getWebsiteHost(row.website || ''),
        needs_price: Boolean(row.needs_price),
        needs_description: Boolean(row.needs_description),
        priority_score: Number(row.priority_score || 0)
      }))
    : buildLiveCandidates(activeGyms);

  return {
    filename: report?.filename || '',
    generatedAt: report?.generatedAt || '',
    hasReport: Boolean(report?.rows?.length),
    rows: rows.slice(0, 200)
  };
}
