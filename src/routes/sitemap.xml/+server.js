import { isIndexableGym, slugifyGym } from '$lib/gym-detail';
import { readGyms } from '$lib/server/gym-store';
import { SITE_URL } from '$lib/site';
import { buildSeoDisciplineEntries, buildSeoLocationEntries } from '$lib/seo-directory';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const gyms = (await readGyms()).filter((gym) => isIndexableGym(gym));
  const indexableGyms = gyms.filter((gym) => isIndexableGym(gym));
  const today = new Date().toISOString().slice(0, 10);
  const lastmodForGym = (gym) => {
    const raw = gym?.updated_at || gym?.data_verified_at || gym?.price_updated_at || gym?.enrichment_updated_at || today;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? today : date.toISOString().slice(0, 10);
  };
  const staticEntries = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/zone`, changefreq: 'weekly', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/discipline`, changefreq: 'weekly', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/contatti`, changefreq: 'monthly', priority: '0.4', lastmod: today },
    { loc: `${SITE_URL}/per-le-palestre`, changefreq: 'monthly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.2', lastmod: today },
    { loc: `${SITE_URL}/rivendica-scheda`, changefreq: 'monthly', priority: '0.5', lastmod: today }
  ];

  const locationEntries = buildSeoLocationEntries(gyms, { includeLowCount: false }).map((location) => ({
    loc: `${SITE_URL}/zone/${location.slug}`,
    changefreq: 'weekly',
    priority: location.featured ? '0.8' : '0.6',
    lastmod: today
  }));

  const disciplineEntries = buildSeoDisciplineEntries(gyms, { includeLowCount: false }).map(
    (discipline) => ({
      loc: `${SITE_URL}/discipline/${discipline.slug}`,
      changefreq: 'weekly',
      priority: discipline.featured ? '0.8' : '0.6',
      lastmod: today
    })
  );

  const gymEntries = indexableGyms.map((gym) => ({
    loc: `${SITE_URL}/palestre/${slugifyGym(gym)}`,
    changefreq: 'weekly',
    priority: '0.5',
    lastmod: lastmodForGym(gym)
  }));

  const seen = new Set();
  const urls = [...staticEntries, ...locationEntries, ...disciplineEntries, ...gymEntries].filter((entry) => {
    if (seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `  <url><loc>${escapeXml(url.loc)}</loc><lastmod>${escapeXml(url.lastmod)}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=3600'
    }
  });
}
