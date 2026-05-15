import { canonicalDisciplineName } from '$lib/disciplines';

export const SEO_DISCIPLINES = [
  {
    slug: 'boxe',
    name: 'Boxe',
    title: 'Palestre di Boxe',
    description:
      'Scopri palestre e corsi di boxe con schede complete, contatti e orari aggiornabili.',
    keywords: ['Boxe', 'Boxing', 'Pugilato']
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
    keywords: ['MMA', 'Mixed Martial Arts']
  },
  {
    slug: 'kickboxing',
    name: 'Kickboxing',
    title: 'Palestre di Kickboxing',
    description:
      'Consulta una raccolta di palestre di kickboxing con schede dedicate e link ai dettagli completi.',
    keywords: ['Kickboxing', 'Kickboxe', 'Kick Boxing']
  },
  {
    slug: 'brazilian-jiu-jitsu',
    name: 'Brazilian Jiu Jitsu',
    title: 'Palestre di Brazilian Jiu Jitsu',
    description:
      'Trova accademie e corsi di Brazilian Jiu Jitsu con schede locali e dati utili per confrontare le strutture.',
    keywords: ['Brazilian Jiu Jitsu', 'BJJ', 'Jujitsu Brasiliano']
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
    keywords: ['Fitness']
  },
  {
    slug: 'personal-training',
    name: 'Personal Training',
    title: 'Personal Training e trainer',
    description:
      'Confronta strutture e studi con personal training, contatti e schede locali verificabili.',
    keywords: ['Personal Training', 'Personal Trainer']
  },
  {
    slug: 'functional-training',
    name: 'Functional Training',
    title: 'Palestre di Functional Training',
    description:
      'Trova palestre e corsi di functional training, circuiti e allenamento funzionale.',
    keywords: ['Functional Training', 'Functional']
  },
  {
    slug: 'cross-training',
    name: 'Cross Training',
    title: 'Palestre di Cross Training',
    description:
      'Consulta strutture con cross training e allenamento incrociato, senza confonderle con CrossFit.',
    keywords: ['Cross Training', 'Crosstraining']
  },
  {
    slug: 'crossfit',
    name: 'CrossFit',
    title: 'Box e palestre CrossFit',
    description:
      'Trova box CrossFit e strutture specializzate con informazioni locali e schede complete.',
    keywords: ['CrossFit', 'Cross Fit']
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
    keywords: ['Karate', 'Kyokushin', 'Shito Ryu', 'Wa Rei Ryu']
  },
  {
    slug: 'nuoto',
    name: 'Nuoto',
    title: 'Piscine e centri nuoto',
    description:
      'Consulta piscine e centri sportivi con nuoto, informazioni locali e link alle schede complete.',
    keywords: ['Nuoto', 'Swimming']
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

  const keywords = new Set(discipline.keywords.map((keyword) => canonicalDisciplineName(keyword).toLowerCase()));

  return gyms.filter((gym) => {
    const values = Array.isArray(gym?.disciplines) && gym.disciplines.length
      ? gym.disciplines
      : String(gym?.discipline || '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean);

    return values.some((value) => keywords.has(canonicalDisciplineName(value).toLowerCase()));
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

  const normalized = values.map((value) => canonicalDisciplineName(value).toLowerCase()).filter(Boolean);
  return (
    SEO_DISCIPLINES.find((discipline) =>
      discipline.keywords.some((keyword) => normalized.includes(canonicalDisciplineName(keyword).toLowerCase()))
    ) || null
  );
}
