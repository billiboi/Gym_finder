export const SEO_DISCIPLINES = [
  {
    slug: 'boxe',
    name: 'Boxe',
    title: 'Palestre di Boxe',
    description:
      'Scopri palestre e corsi di boxe con schede complete, contatti e orari aggiornabili.',
    keywords: ['Boxe']
  },
  {
    slug: 'judo',
    name: 'Judo',
    title: 'Palestre di Judo',
    description:
      'Trova dojo e palestre di judo con informazioni chiare su contatti, indirizzo e orari.',
    keywords: ['Judo']
  },
  {
    slug: 'mma',
    name: 'MMA',
    title: 'Palestre di MMA',
    description:
      'Esplora palestre di MMA e sport da combattimento con una selezione orientata alla ricerca locale.',
    keywords: ['MMA']
  },
  {
    slug: 'kickboxe',
    name: 'Kickboxe',
    title: 'Palestre di Kickboxe',
    description:
      'Consulta una raccolta di palestre di kickboxe con schede dedicate e link ai dettagli completi.',
    keywords: ['Kickboxe']
  }
];

export function getSeoDiscipline(slug) {
  return SEO_DISCIPLINES.find((discipline) => discipline.slug === slug) || null;
}

export function gymsForSeoDiscipline(gyms, discipline) {
  if (!discipline) return [];

  const keywords = discipline.keywords.map((keyword) => keyword.toLowerCase());

  return gyms.filter((gym) => {
    const values = Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : String(gym?.discipline || '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean);

    return values.some((value) => keywords.includes(String(value).toLowerCase()));
  });
}

export function seoDisciplineForGym(gym) {
  if (!gym) return null;

  const values = Array.isArray(gym?.disciplines) && gym.disciplines.length
    ? gym.disciplines
    : String(gym?.discipline || '')
        .split('|')
        .map((value) => value.trim())
        .filter(Boolean);

  const normalized = values.map((value) => String(value).toLowerCase());
  return (
    SEO_DISCIPLINES.find((discipline) =>
      discipline.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    ) || null
  );
}
