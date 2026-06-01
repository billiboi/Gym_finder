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
      return { filename: '', generatedAt: '', summary: {}, rows: [] };
    }

    const raw = await readFile(path.join(DATA_DIR, latest), 'utf8');
    const report = JSON.parse(raw);

    return {
      filename: latest,
      generatedAt: report.generated_at || '',
      summary: report.summary || {},
      rows: Array.isArray(report.rows) ? report.rows : []
    };
  } catch {
    return { filename: '', generatedAt: '', summary: {}, rows: [] };
  }
}

function hasPrice(gym) {
  return Boolean(String(gym.price_info || '').trim());
}

export async function load() {
  const [reviewReport, enrichmentReport, discoveryReport, gyms] = await Promise.all([
    readLatestReport('price-review-queue-'),
    readLatestReport('price-enrichment-candidates-'),
    readLatestReport('official-price-page-discovery-'),
    readGyms().catch(() => [])
  ]);

  const activeGyms = Array.isArray(gyms) ? gyms.filter((gym) => !isArchivedGym(gym)) : [];

  return {
    priceStats: {
      activeGyms: activeGyms.length,
      withPrice: activeGyms.filter(hasPrice).length,
      withoutPrice: activeGyms.filter((gym) => !hasPrice(gym)).length
    },
    reviewReport: {
      ...reviewReport,
      rows: reviewReport.rows.slice(0, 200)
    },
    enrichmentReport: {
      ...enrichmentReport,
      rows: enrichmentReport.rows.slice(0, 200)
    },
    discoveryReport: {
      ...discoveryReport,
      rows: discoveryReport.rows.slice(0, 200)
    }
  };
}
