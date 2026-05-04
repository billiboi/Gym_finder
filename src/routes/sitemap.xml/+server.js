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
  const gyms = await readGyms();
  const indexableGyms = gyms.filter((gym) => isIndexableGym(gym));
  const staticEntries = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/zone`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/discipline`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/contatti`, changefreq: 'monthly', priority: '0.4' },
    { loc: `${SITE_URL}/per-le-palestre`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${SITE_URL}/rivendica-scheda`, changefreq: 'monthly', priority: '0.5' }
  ];

  const locationEntries = buildSeoLocationEntries(gyms, { includeLowCount: false }).map((location) => ({
    loc: `${SITE_URL}/zone/${location.slug}`,
    changefreq: 'weekly',
    priority: location.featured ? '0.8' : '0.6'
  }));

  const disciplineEntries = buildSeoDisciplineEntries(gyms, { includeLowCount: false }).map(
    (discipline) => ({
      loc: `${SITE_URL}/discipline/${discipline.slug}`,
      changefreq: 'weekly',
      priority: discipline.featured ? '0.8' : '0.6'
    })
  );

  const gymEntries = indexableGyms.map((gym) => ({
    loc: `${SITE_URL}/palestre/${slugifyGym(gym)}`,
    changefreq: 'weekly',
    priority: '0.5'
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
      `  <url><loc>${escapeXml(url.loc)}</loc><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`
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
