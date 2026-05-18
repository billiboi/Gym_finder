import { DISCIPLINE_ALIAS_ROWS, DISCIPLINE_MASTER, canonicalizeDiscipline, slugifyDiscipline } from '$lib/discipline-taxonomy';
import { gymHref, isIndexableGym, legacySlugifyGym, slugifyGym } from '$lib/gym-detail';
import { isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';
import { absoluteUrl } from '$lib/site';

function clean(value) {
  return String(value ?? '').trim();
}

function disciplineValuesForGym(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length) {
    return gym.disciplines.map(clean).filter(Boolean);
  }

  return clean(gym?.discipline)
    .split('|')
    .map(clean)
    .filter(Boolean);
}

function gymCity(gym) {
  return clean(gym?.city || gym?.citta);
}

function gymName(gym) {
  return clean(gym?.name || gym?.nome) || 'Senza nome';
}

function gymSlug(gym) {
  return clean(gym?._canonical_slug || gym?.slug) || slugifyGym(gym);
}

function compactGym(gym) {
  const path = gymHref(gym);

  return {
    id: gym.id,
    name: gymName(gym),
    city: gymCity(gym),
    path,
    url: absoluteUrl(path),
    adminUrl: `/admin/gyms/${gym.id}`
  };
}

function buildDisciplineRows(activeGyms) {
  const counts = new Map();
  const examples = new Map();
  for (const gym of activeGyms) {
    for (const value of disciplineValuesForGym(gym)) {
      const canonical = canonicalizeDiscipline(value);
      if (!canonical) continue;

      const count = counts.get(canonical.slug) || { active: 0, indexable: 0 };
      count.active += 1;
      if (isIndexableGym(gym)) count.indexable += 1;
      counts.set(canonical.slug, count);

      if (!examples.has(canonical.slug)) examples.set(canonical.slug, []);
      if (examples.get(canonical.slug).length < 6) examples.get(canonical.slug).push(compactGym(gym));

    }
  }

  return DISCIPLINE_MASTER.map((discipline) => {
    const count = counts.get(discipline.slug) || { active: 0, indexable: 0 };
    const aliasRows = DISCIPLINE_ALIAS_ROWS.filter((alias) => alias.discipline_slug === discipline.slug);

    return {
      name: discipline.name,
      slug: discipline.slug,
      canonicalUrl: absoluteUrl(`/discipline/${discipline.slug}`),
      count: count.active,
      indexableCount: count.indexable,
      aliases: aliasRows.map((alias) => ({
        alias: alias.alias,
        aliasSlug: alias.alias_slug,
        aliasUrl: absoluteUrl(`/discipline/${alias.alias_slug}`),
        canonicalUrl: absoluteUrl(`/discipline/${discipline.slug}`),
        redirectStatus: alias.alias_slug === discipline.slug ? 'Canonico equivalente' : 'Configurato 301'
      })),
      examples: examples.get(discipline.slug) || [],
      hasProblem: count.active === 0 || aliasRows.length === 0
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'it'));
}

function buildSlugRows(activeGyms) {
  const groups = new Map();

  for (const gym of activeGyms) {
    const slug = gymSlug(gym);
    if (!slug) continue;
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(gym);
  }

  return [...groups.entries()]
    .filter(([, gyms]) => gyms.length > 1)
    .map(([slug, gyms]) => ({
      slug,
      url: absoluteUrl(`/palestre/${slug}`),
      count: gyms.length,
      gyms: gyms.map(compactGym)
    }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug, 'it'));
}

function buildLegacySlugRows(activeGyms) {
  return activeGyms
    .map((gym) => {
      const canonical = gymSlug(gym);
      const legacy = clean(gym?._legacy_slug) || legacySlugifyGym(gym);
      if (!canonical || !legacy || canonical === legacy) return null;

      return {
        gym: compactGym(gym),
        legacySlug: legacy,
        legacyUrl: absoluteUrl(`/palestre/${legacy}`),
        canonicalSlug: canonical,
        canonicalUrl: absoluteUrl(`/palestre/${canonical}`),
        redirectStatus: 'Configurato 301'
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.gym.name.localeCompare(b.gym.name, 'it'));
}

function buildCanonicalChecks(disciplineRows, duplicateSlugs, legacyDisciplineRows, legacySlugRows) {
  const staticChecks = [
    { type: 'Pagina', label: 'Homepage', path: '/', canonical: absoluteUrl('/'), status: 'Configurato' },
    { type: 'Pagina', label: 'Discipline', path: '/discipline', canonical: absoluteUrl('/discipline'), status: 'Configurato' },
    { type: 'Pagina', label: 'Zone', path: '/zone', canonical: absoluteUrl('/zone'), status: 'Configurato' },
    { type: 'Pagina', label: 'Guide', path: '/guide', canonical: absoluteUrl('/guide'), status: 'Configurato' },
    { type: 'Pagina', label: 'Per le palestre', path: '/per-le-palestre', canonical: absoluteUrl('/per-le-palestre'), status: 'Configurato' }
  ];

  const problemChecks = [
    ...disciplineRows.filter((row) => row.count === 0).map((row) => ({
      type: 'Disciplina',
      label: row.name,
      path: `/discipline/${row.slug}`,
      canonical: row.canonicalUrl,
      status: 'Senza schede attive'
    })),
    ...duplicateSlugs.map((row) => ({
      type: 'Scheda',
      label: row.slug,
      path: `/palestre/${row.slug}`,
      canonical: row.url,
      status: 'Slug duplicato'
    }))
  ];

  return {
    items: [...staticChecks, ...problemChecks],
    stats: {
      missingCanonical: 0,
      duplicateSlugs: duplicateSlugs.length,
      legacyDisciplines: legacyDisciplineRows.length,
      legacyGymSlugs: legacySlugRows.length
    }
  };
}

export async function load() {
  const gyms = await readGyms();
  const activeGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const disciplineRows = buildDisciplineRows(activeGyms);
  const duplicateSlugs = buildSlugRows(activeGyms);
  const legacyDisciplineRows = [];

  for (const gym of activeGyms) {
    for (const value of disciplineValuesForGym(gym)) {
      const canonical = canonicalizeDiscipline(value);
      if (!canonical) continue;
      if (!(canonical.matchedAlias || slugifyDiscipline(value) !== canonical.slug)) continue;

      legacyDisciplineRows.push({
        gym: compactGym(gym),
        raw: value,
        canonical: canonical.name,
        canonicalSlug: canonical.slug,
        aliasUrl: absoluteUrl(`/discipline/${slugifyDiscipline(value)}`),
        canonicalUrl: absoluteUrl(`/discipline/${canonical.slug}`),
        redirectStatus: 'Configurato 301'
      });
    }
  }

  const legacySlugRows = buildLegacySlugRows(activeGyms);
  const aliasRows = DISCIPLINE_ALIAS_ROWS.map((alias) => ({
    ...alias,
    aliasUrl: absoluteUrl(`/discipline/${alias.alias_slug}`),
    canonicalUrl: absoluteUrl(`/discipline/${alias.discipline_slug}`),
    hasCanonical: DISCIPLINE_MASTER.some((discipline) => discipline.slug === alias.discipline_slug),
    redirectStatus: alias.alias_slug === alias.discipline_slug ? 'Canonico equivalente' : 'Configurato 301'
  })).sort((a, b) => a.discipline_name.localeCompare(b.discipline_name, 'it') || a.alias.localeCompare(b.alias, 'it'));
  const canonicalChecks = buildCanonicalChecks(disciplineRows, duplicateSlugs, legacyDisciplineRows, legacySlugRows);

  return {
    stats: {
      activeGyms: activeGyms.length,
      canonicalDisciplines: DISCIPLINE_MASTER.length,
      aliases: aliasRows.length,
      disciplineWithoutGyms: disciplineRows.filter((row) => row.count === 0).length,
      aliasWithoutCanonical: aliasRows.filter((row) => !row.hasCanonical).length,
      legacyDisciplines: legacyDisciplineRows.length,
      duplicateSlugs: duplicateSlugs.length,
      legacyGymSlugs: legacySlugRows.length,
      missingCanonical: canonicalChecks.stats.missingCanonical
    },
    disciplineRows,
    aliasRows,
    legacyDisciplineRows,
    duplicateSlugs,
    legacySlugRows,
    canonicalChecks: canonicalChecks.items,
    sitemapUrl: absoluteUrl('/sitemap.xml'),
    robotsUrl: absoluteUrl('/robots.txt'),
    generatedAt: new Date().toISOString()
  };
}
