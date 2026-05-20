import { error, redirect } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { publicClientGym } from '$lib/gym-client';
import { readGyms } from '$lib/server/gym-store';
import { getSeoDiscipline, gymsForSeoDiscipline } from '$lib/seo-disciplines';
import { relatedGuidesForDiscipline } from '$lib/editorial';
import {
  canonicalSlugForDisciplineSlug,
  getDisciplineBySlug,
  isDisciplineAliasSlug,
  isPublicDisciplineSlug
} from '$lib/discipline-taxonomy';

export async function load({ params }) {
  const canonicalSlug = canonicalSlugForDisciplineSlug(params.slug) || params.slug;
  if (!isPublicDisciplineSlug(canonicalSlug)) {
    throw error(410, 'Disciplina rimossa');
  }

  if (isDisciplineAliasSlug(params.slug)) {
    throw redirect(301, `/discipline/${canonicalSlug}`);
  }

  const gyms = await readGyms();
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

  const matchedGyms = gymsForSeoDiscipline(gyms, discipline).filter((gym) => isIndexableGym(gym));

  return {
    discipline,
    gyms: matchedGyms.map(publicClientGym),
    relatedGuides: relatedGuidesForDiscipline(discipline.slug)
  };
}
