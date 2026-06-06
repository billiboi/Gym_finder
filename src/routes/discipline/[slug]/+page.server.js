import { error, redirect } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { publicListingGym } from '$lib/gym-client';
import { normalizeGym } from '$lib/gym-normalizer';
import { readPublicRouteGyms } from '$lib/server/gym-store';
import { getSeoDiscipline, gymsForSeoDiscipline } from '$lib/seo-disciplines';
import { relatedGuidesForDiscipline } from '$lib/editorial';
import {
  canonicalSlugForDisciplineSlug,
  getDisciplineBySlug,
  isDisciplineAliasSlug,
  isPublicDisciplineSlug
} from '$lib/discipline-taxonomy';

const INITIAL_DISCIPLINE_GYMS = 72;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);

const DISCIPLINE_GYM_COLUMNS = [
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
  'discipline_aliases',
  'discipline_canonical_slugs',
  'orari',
  'hours_info',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'image_url',
  'is_verified',
  'verified',
  'is_premium',
  'priority_score',
  'deleted_at',
  'updated_at'
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

function slugPart(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withCanonicalGymSlugs(gyms) {
  const groups = new Map();
  const normalized = gyms.map((gym) => ({ ...gym }));

  for (const gym of normalized) {
    const base = slugPart(gym?.name || gym?.nome) || 'palestra';
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(gym);
  }

  const used = new Set();
  for (const [base, group] of groups) {
    group.forEach((gym, index) => {
      let slug = base;
      if (group.length > 1) {
        const city = slugPart(gym?.city || gym?.citta);
        const street = slugPart(String(gym?.address || gym?.indirizzo || '').split(',')[0]);
        slug = [base, city && !base.includes(city) ? city : '', street]
          .filter(Boolean)
          .join('-')
          .replace(/-{2,}/g, '-');
      }

      if (used.has(slug)) slug = `${slug}-${index + 1}`;
      used.add(slug);
      gym._canonical_slug = slug;
      gym._legacy_slug = gym?.id ? `${base}-${String(gym.id).trim()}` : base;
    });
  }

  return normalized;
}

function safeLike(value) {
  return String(value || '')
    .replace(/[%*,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function disciplineOrFilter(discipline) {
  const clauses = [];
  const terms = [...new Set([discipline?.name, ...(discipline?.keywords || [])].map(safeLike).filter(Boolean))].slice(0, 8);

  for (const term of terms) {
    const encoded = encodeURIComponent(`*${term}*`);
    clauses.push(
      `discipline.ilike.${encoded}`,
      `nome.ilike.${encoded}`,
      `name.ilike.${encoded}`
    );
  }

  return clauses.length ? `or=(${clauses.join(',')})` : '';
}

async function readDisciplineGyms(discipline) {
  if (!hasSupabaseRead) {
    const fallbackGyms = await readPublicRouteGyms();
    return gymsForSeoDiscipline(fallbackGyms, discipline).filter((gym) => isIndexableGym(gym));
  }

  const params = [
    `select=${encodeURIComponent(DISCIPLINE_GYM_COLUMNS.join(','))}`,
    'deleted_at=is.null',
    disciplineOrFilter(discipline),
    'order=priority_score.desc.nullslast,nome.asc.nullslast',
    `limit=${INITIAL_DISCIPLINE_GYMS}`
  ].filter(Boolean);
  const url = `${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders()
    });
  } catch {
    const fallbackGyms = await readPublicRouteGyms();
    return gymsForSeoDiscipline(fallbackGyms, discipline).filter((gym) => isIndexableGym(gym));
  }

  if (!response.ok) {
    const fallbackGyms = await readPublicRouteGyms();
    return gymsForSeoDiscipline(fallbackGyms, discipline).filter((gym) => isIndexableGym(gym));
  }

  const data = await response.json();
  const rows = Array.isArray(data) ? data : [];
  const gyms = rows.length
    ? withCanonicalGymSlugs(rows.map((row, index) => normalizeGym(row, row?.id || `discipline-${index + 1}`)))
    : await readPublicRouteGyms();
  return gymsForSeoDiscipline(gyms, discipline).filter((gym) => isIndexableGym(gym));
}

export async function load({ params }) {
  const canonicalSlug = canonicalSlugForDisciplineSlug(params.slug) || params.slug;
  if (!isPublicDisciplineSlug(canonicalSlug)) {
    throw error(410, 'Disciplina rimossa');
  }

  if (isDisciplineAliasSlug(params.slug)) {
    throw redirect(301, `/discipline/${canonicalSlug}`);
  }

  let discipline = getSeoDiscipline(params.slug);

  if (!discipline) {
    const canonical = getDisciplineBySlug(params.slug);

    if (!canonical || canonical.slug !== params.slug) {
      throw error(404, 'Disciplina non trovata');
    }

    discipline = {
      slug: params.slug,
      name: canonical.name,
      title: `Palestre di ${canonical.name}`,
      description: `Esplora le schede pubbliche collegate a ${canonical.name} e vedi quali strutture del catalogo rientrano davvero in questa disciplina.`,
      keywords: [canonical.name, ...(canonical.aliases || [])]
    };
  }

  const matchedGyms = await readDisciplineGyms(discipline);

  return {
    discipline,
    gyms: matchedGyms.map(publicListingGym),
    relatedGuides: relatedGuidesForDiscipline(discipline.slug)
  };
}
