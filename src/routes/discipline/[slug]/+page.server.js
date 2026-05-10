import { error } from '@sveltejs/kit';
import { isIndexableGym } from '$lib/gym-detail';
import { slugifySeoName } from '$lib/seo-directory';
import { readGyms } from '$lib/server/gym-store';
import { getSeoDiscipline, gymsForSeoDiscipline } from '$lib/seo-disciplines';
import { dedupeDisciplines } from '$lib/disciplines';
import { relatedGuidesForDiscipline } from '$lib/editorial';

export async function load({ params }) {
  const gyms = await readGyms();
  let discipline = getSeoDiscipline(params.slug);

  if (!discipline) {
    const allDisciplines = dedupeDisciplines(
      gyms.flatMap((gym) =>
        Array.isArray(gym?.disciplines) && gym.disciplines.length
          ? gym.disciplines
          : String(gym?.discipline || '')
              .split('|')
              .map((value) => value.trim())
              .filter(Boolean)
      )
    );

    const matchedName = allDisciplines.find((name) => slugifySeoName(name) === params.slug);

    if (!matchedName) {
      throw error(404, 'Disciplina non trovata');
    }

    discipline = {
      slug: params.slug,
      name: matchedName,
      title: `Palestre di ${matchedName}`,
      description: `Esplora le schede pubbliche collegate a ${matchedName} e vedi quali strutture del catalogo rientrano davvero in questa disciplina.`,
      keywords: [matchedName]
    };
  }

  const matchedGyms = gymsForSeoDiscipline(gyms, discipline).filter((gym) => isIndexableGym(gym));

  return {
    discipline,
    gyms: matchedGyms,
    relatedGuides: relatedGuidesForDiscipline(discipline.slug)
  };
}
