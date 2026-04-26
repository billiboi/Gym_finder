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
  },
  {
    slug: 'pilates',
    name: 'Pilates',
    title: 'Studi e palestre di Pilates',
    description:
      'Confronta studi e palestre di Pilates con indirizzi, contatti, orari e schede complete.',
    keywords: ['Pilates']
  },
  {
    slug: 'fitness',
    name: 'Fitness',
    title: 'Palestre Fitness',
    description:
      'Trova palestre fitness e club generalisti con informazioni utili per confrontare posizione, orari e contatti.',
    keywords: ['Fitness', 'Functional', 'Bodybuilding', 'Calisthenics']
  },
  {
    slug: 'yoga',
    name: 'Yoga',
    title: 'Centri Yoga',
    description:
      'Esplora centri e palestre con corsi yoga, schede locali e percorsi rapidi verso contatti e dettagli.',
    keywords: ['Yoga']
  },
  {
    slug: 'karate',
    name: 'Karate',
    title: 'Palestre di Karate',
    description:
      'Scopri dojo e associazioni di karate con discipline collegate, indirizzi e schede di approfondimento.',
    keywords: ['Karate']
  },
  {
    slug: 'nuoto',
    name: 'Nuoto',
    title: 'Piscine e centri nuoto',
    description:
      'Consulta piscine e centri sportivi con nuoto, informazioni locali e link alle schede complete.',
    keywords: ['Nuoto']
  },
  {
    slug: 'padel',
    name: 'Padel',
    title: 'Centri Padel',
    description:
      'Trova centri sportivi con padel e confronta indirizzi, servizi collegati e contatti disponibili.',
    keywords: ['Padel']
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
