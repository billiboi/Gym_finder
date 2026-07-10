import { isIndexableGym, slugifyGym } from '$lib/gym-detail';
import { normalizeGym } from '$lib/gym-normalizer';
import { SITE_URL } from '$lib/site';
import { buildSeoDisciplineCityEntries, buildSeoDisciplineEntries, buildSeoLocationEntries } from '$lib/seo-directory';
import { EDITORIAL_GUIDES, editorialGuideHref } from '$lib/editorial';
import { isPublicActiveGym, readPublicRouteGyms } from '$lib/server/gym-store';
import { withCanonicalGymSlugs } from '$lib/gym-canonical-slug';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const SITEMAP_GYM_COLUMNS = [
  'id',
  'slug',
  'nome',
  'name',
  'indirizzo',
  'address',
  'citta',
  'city',
  'telefono',
  'phone',
  'sito',
  'website',
  'discipline',
  'disciplines',
  'orari',
  'hours_info',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'updated_at',
  'deleted_at'
];

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_READ_KEY,
    Authorization: `Bearer ${SUPABASE_READ_KEY}`
  };
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function readSitemapGyms() {
  if (!hasSupabaseRead) return readPublicRouteGyms();

  try {
    const params = [
      'select=*',
      'deleted_at=is.null',
      'order=updated_at.desc.nullslast,nome.asc.nullslast,id.asc',
      'limit=5000'
    ];
    const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
      method: 'GET',
      headers: supabaseHeaders()
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    const gyms = withCanonicalGymSlugs(
      rows
        .map((row, index) => normalizeGym(row, row?.id || `sitemap-${index + 1}`))
        .filter(isPublicActiveGym)
    );
    return gyms;
  } catch {
    return [];
  }
}

export async function GET() {
  const gyms = (await readSitemapGyms()).filter((gym) => isPublicActiveGym(gym) && isIndexableGym(gym));
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
    { loc: `${SITE_URL}/guide`, changefreq: 'weekly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/chi-siamo`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${SITE_URL}/verifica-schede`, changefreq: 'monthly', priority: '0.5', lastmod: today },
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

  const disciplineCityEntries = buildSeoDisciplineCityEntries(gyms).map((entry) => ({
    loc: `${SITE_URL}/discipline/${entry.disciplineSlug}/${entry.citySlug}`,
    changefreq: 'weekly',
    priority: '0.5',
    lastmod: today
  }));

  const gymEntries = indexableGyms.map((gym) => ({
    loc: `${SITE_URL}/palestre/${slugifyGym(gym)}`,
    changefreq: 'weekly',
    priority: '0.5',
    lastmod: lastmodForGym(gym)
  }));

  const guideEntries = EDITORIAL_GUIDES.map((guide) => ({
    loc: `${SITE_URL}${editorialGuideHref(guide)}`,
    changefreq: 'monthly',
    priority: '0.7',
    lastmod: guide.updatedAt || today
  }));

  const seen = new Set();
  const urls = [...staticEntries, ...locationEntries, ...disciplineEntries, ...disciplineCityEntries, ...guideEntries, ...gymEntries].filter((entry) => {
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
