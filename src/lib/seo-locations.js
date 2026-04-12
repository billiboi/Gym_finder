import { dedupeDisciplines } from '$lib/disciplines';

export const SEO_LOCATIONS = [
  {
    slug: 'varese',
    name: 'Varese',
    title: 'Palestre a Varese',
    description:
      'Scopri palestre, boxe, judo, karate e altre discipline sportive a Varese e dintorni.',
    keywords: ['varese', 'gavirate', 'azzate', 'malnate', 'tradate', 'cassano magnago', 'gallarate']
  },
  {
    slug: 'lugano',
    name: 'Lugano',
    title: 'Palestre a Lugano',
    description:
      'Trova palestre e arti marziali a Lugano con una selezione utile per chi si allena in Ticino.',
    keywords: ['lugano', 'massagno', 'savosa', 'paradiso', 'pregassona', 'canobbio', 'cassarate']
  },
  {
    slug: 'bellinzona',
    name: 'Bellinzona',
    title: 'Palestre a Bellinzona',
    description:
      'Esplora palestre e club sportivi a Bellinzona e nelle principali località vicine del Ticino.',
    keywords: ['bellinzona', 'giubiasco', 'arbedo', 'camorino', 'sant antonino', 'biasca']
  }
];

export function getSeoLocation(slug) {
  return SEO_LOCATIONS.find((location) => location.slug === slug) || null;
}

export function gymsForSeoLocation(gyms, location) {
  if (!location) return [];

  return gyms.filter((gym) => {
    const haystack = [gym.name, gym.address, gym.city].join(' | ').toLowerCase();
    return location.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });
}

export function seoLocationForGym(gym) {
  if (!gym) return null;

  const haystack = [gym.name, gym.address, gym.city].join(' | ').toLowerCase();
  return (
    SEO_LOCATIONS.find((location) =>
      location.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
    ) || null
  );
}

export function topDisciplinesForGyms(gyms, limit = 6) {
  const deduped = dedupeDisciplines(
    gyms.flatMap((gym) =>
      Array.isArray(gym?.disciplines) && gym.disciplines.length
        ? gym.disciplines
        : String(gym?.discipline || '')
            .split('|')
            .map((value) => value.trim())
            .filter(Boolean)
    )
  );

  return deduped.slice(0, limit);
}
