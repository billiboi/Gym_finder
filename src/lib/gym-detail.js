import { normalizeDisciplineLabel } from '$lib/disciplines';

export function fixGymText(value) {
  let text = String(value || '');
  if (!text) return '';

  const replacements = [
    ['ÃƒÆ’Ã¢â€šÂ¬', 'Ãƒâ‚¬'], ['ÃƒÆ’Ã‹â€ ', 'ÃƒË†'], ['ÃƒÆ’Ã¢â‚¬Â°', 'Ãƒâ€°'], ['ÃƒÆ’Ã…â€™', 'ÃƒÅ’'], ['ÃƒÆ’Ã¢â‚¬â„¢', 'Ãƒâ€™'], ['ÃƒÆ’Ã¢â€žÂ¢', 'Ãƒâ„¢'],
    ['ÃƒÆ’Ã‚Â ', 'ÃƒÂ '], ['ÃƒÆ’Ã‚Â¨', 'ÃƒÂ¨'], ['ÃƒÆ’Ã‚Â©', 'ÃƒÂ©'], ['ÃƒÆ’Ã‚Â¬', 'ÃƒÂ¬'], ['ÃƒÆ’Ã‚Â²', 'ÃƒÂ²'], ['ÃƒÆ’Ã‚Â¹', 'ÃƒÂ¹'],
    ['ÃƒÆ’Ã‚Â¶', 'ÃƒÂ¶'], ['ÃƒÆ’Ã‚Â¤', 'ÃƒÂ¤'], ['ÃƒÆ’Ã…Â¸', 'ÃƒÅ¸'], ['ÃƒÆ’Ã¢â‚¬â€œ', 'Ãƒâ€“'], ['ÃƒÆ’Ã‚Â¼', 'ÃƒÂ¼'], ['ÃƒÆ’Ã…â€œ', 'ÃƒÅ“'],
    ['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“', '-'], ['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â', '-'], ['ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“', "'"], ['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢', "'"], ['ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ', '"'], ['ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â', '"'],
    ['Ãƒâ€š', '']
  ];

  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function disciplineListForGym(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length) {
    return gym.disciplines.map((d) => normalizeDisciplineLabel(d)).filter(Boolean);
  }

  if (typeof gym?.discipline === 'string' && gym.discipline.trim()) {
    return gym.discipline
      .split('|')
      .map((d) => normalizeDisciplineLabel(d))
      .filter(Boolean);
  }

  return ['Fitness'];
}

export function primaryDisciplineForGym(gym) {
  return disciplineListForGym(gym)[0] || 'Fitness';
}

export function disciplinePreviewForGym(gym, max = 3) {
  const list = disciplineListForGym(gym);
  return {
    primary: list[0] || 'Fitness',
    secondary: list.slice(1),
    remaining: 0
  };
}

export function placeholderImageForDiscipline(discipline) {
  const normalized = normalizeDisciplineLabel(discipline) || 'Fitness';
  const map = {
    Boxe: '/images/placeholders/boxe.svg',
    Kickboxe: '/images/placeholders/kickboxe.svg',
    'Muay Thai': '/images/placeholders/muay-thai.svg',
    K1: '/images/placeholders/kickboxe.svg',
    MMA: '/images/placeholders/mma.svg',
    Judo: '/images/placeholders/judo.svg',
    Jujistu: '/images/placeholders/grappling.svg',
    'Jujistu Brasiliano': '/images/placeholders/grappling.svg',
    Karate: '/images/placeholders/karate.svg',
    Taekwondo: '/images/placeholders/kickboxe.svg',
    Aikido: '/images/placeholders/judo.svg',
    'Kung Fu': '/images/placeholders/kung-fu.svg',
    'Wing Chun': '/images/placeholders/kung-fu.svg',
    'Tai Chi': '/images/placeholders/kung-fu.svg',
    Scherma: '/images/placeholders/fitness.svg',
    Chanbara: '/images/placeholders/karate.svg',
    'Difesa Personale': '/images/placeholders/difesa-personale.svg',
    'Arti Marziali': '/images/placeholders/mma.svg',
    CrossFit: '/images/placeholders/functional.svg',
    Pilates: '/images/placeholders/wellness.svg',
    Yoga: '/images/placeholders/wellness.svg',
    Nuoto: '/images/placeholders/nuoto.svg',
    Calisthenics: '/images/placeholders/functional.svg',
    Functional: '/images/placeholders/functional.svg',
    Bodybuilding: '/images/placeholders/fitness.svg',
    Fitness: '/images/placeholders/fitness.svg'
  };

  return map[normalized] || '/images/placeholders/fitness.svg';
}

export function stockImageForDiscipline(discipline) {
  const normalized = normalizeDisciplineLabel(discipline) || 'Fitness';
  const map = {
    Boxe: '/images/stock/boxe',
    Kickboxe: '/images/stock/kickboxe',
    'Muay Thai': '/images/stock/muay-thai',
    K1: '/images/stock/kickboxe',
    MMA: '/images/stock/mma',
    Judo: '/images/stock/judo',
    Jujistu: '/images/stock/grappling',
    'Jujistu Brasiliano': '/images/stock/grappling',
    Karate: '/images/stock/karate',
    Taekwondo: '/images/stock/taekwondo',
    Aikido: '/images/stock/aikido',
    'Kung Fu': '/images/stock/kung-fu',
    'Wing Chun': '/images/stock/kung-fu',
    'Tai Chi': '/images/stock/kung-fu',
    Scherma: '/images/stock/scherma',
    Chanbara: '/images/stock/karate',
    'Difesa Personale': '/images/stock/difesa-personale',
    'Arti Marziali': '/images/stock/mma',
    CrossFit: '/images/stock/functional',
    Pilates: '/images/stock/pilates',
    Yoga: '/images/stock/yoga',
    Nuoto: '/images/stock/nuoto',
    Calisthenics: '/images/stock/functional',
    Functional: '/images/stock/functional',
    Bodybuilding: '/images/stock/fitness',
    Fitness: '/images/stock/fitness'
  };

  return map[normalized] || '/images/stock/fitness';
}

export function stockImageCandidatesForDiscipline(discipline) {
  const normalized = normalizeDisciplineLabel(discipline) || 'Fitness';
  const overrides = {
    // Until we have dedicated stock sets, keep yoga and pilates visually separated
    // instead of mixing the whole shared "wellness" pool.
    Yoga: ['/images/stock/wellness.webp', '/images/stock/wellness-3.webp'],
    Pilates: ['/images/stock/wellness-2.webp']
  };

  if (overrides[normalized]) {
    return overrides[normalized];
  }

  const base = stockImageForDiscipline(discipline);
  const variants = ['', '-2', '-3'];
  const extensions = ['.webp'];
  const out = [];

  for (const variant of variants) {
    for (const ext of extensions) {
      out.push(`${base}${variant}${ext}`);
    }
  }

  return out;
}

function hashSeed(seed = '') {
  const key = String(seed || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function orderedStockImageCandidates(discipline, seed = '') {
  const candidates = stockImageCandidatesForDiscipline(discipline);
  if (!candidates.length) return [];

  const offset = hashSeed(seed || discipline) % candidates.length;
  return [...candidates.slice(offset), ...candidates.slice(0, offset)];
}

export function resolveAvailableStockImage(discipline, seed = '') {
  return orderedStockImageCandidates(discipline, seed);
}

export function selectRandomStockImage(discipline, seed = '') {
  const ordered = orderedStockImageCandidates(discipline, seed);
  return ordered[0] || '';
}

export function imageForGym(gym) {
  const imageUrl = String(gym?.image_url || '').trim();
  if (imageUrl) {
    return {
      src: imageUrl,
      candidates: [imageUrl],
      fallback: imageUrl
    };
  }

  const discipline = primaryDisciplineForGym(gym);
  const stockCandidates = orderedStockImageCandidates(
    discipline,
    gym?.id || gym?.name || discipline
  );
  const fallback = placeholderImageForDiscipline(discipline);

  // Public pages receive a deterministic source here:
  // uploaded image -> stock photo candidates -> branded SVG placeholder.
  // Missing stock files are skipped client-side via `onerror`, so this stays in sync
  // with whatever is actually present under `static/images/stock`.
  return {
    src: stockCandidates[0] || fallback,
    candidates: [...stockCandidates, fallback],
    fallback
  };
}

export function slugifyGym(gym) {
  const base = fixGymText(gym?.name || 'palestra')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const fallback = base || 'palestra';
  const id = String(gym?.id || '').trim();
  return id ? `${fallback}-${id}` : fallback;
}

export function gymHref(gym) {
  return `/palestre/${slugifyGym(gym)}`;
}

export function formatAddressForDisplay(gym) {
  const raw = fixGymText([gym?.address, gym?.city].filter(Boolean).join(', '));
  if (!raw) return 'Indirizzo non disponibile';

  let parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return 'Indirizzo non disponibile';

  const countryTokens = ['italia', 'svizzera', 'suisse', 'schweiz', 'svizra'];
  while (parts.length > 1 && countryTokens.includes(parts[parts.length - 1].toLowerCase())) {
    parts = parts.slice(0, -1);
  }

  const street = parts[0] || '';
  const remaining = parts.slice(1);
  const cityProvRaw = remaining.length ? remaining[remaining.length - 1] : '';
  const cityProv = cityProvRaw.replace(/\b\d{4,5}\b/g, '').replace(/\s+/g, ' ').trim();

  if (street && cityProv) return `${street}, ${cityProv}`;
  if (street) return street;
  return cityProv || 'Indirizzo non disponibile';
}

export function structuredAddressForGym(gym) {
  const rawAddress = fixGymText(gym?.address || '');
  const rawCity = fixGymText(gym?.city || '');
  const countryAliases = {
    italia: 'IT',
    italy: 'IT',
    svizzera: 'CH',
    switzerland: 'CH',
    suisse: 'CH',
    schweiz: 'CH',
    svizra: 'CH'
  };

  let parts = [rawAddress, rawCity].filter(Boolean).join(', ').split(',').map((part) => part.trim()).filter(Boolean);
  let countryCode = 'IT';

  const trailingCountry = parts.at(-1)?.toLowerCase();
  if (trailingCountry && countryAliases[trailingCountry]) {
    countryCode = countryAliases[trailingCountry];
    parts = parts.slice(0, -1);
  } else if (rawCity && countryAliases[rawCity.toLowerCase()]) {
    countryCode = countryAliases[rawCity.toLowerCase()];
  }

  const streetAddress = parts[0] || rawAddress;
  const localityChunk = parts.length > 1 ? parts.at(-1) : '';
  const postalCode = localityChunk.match(/\b\d{4,5}\b/)?.[0];
  let locality = localityChunk.replace(/\b\d{4,5}\b/g, '').replace(/\s+/g, ' ').trim();
  let addressRegion = '';

  if (countryCode === 'IT') {
    const regionMatch = locality.match(/^(.*?)(?:\s+([A-Z]{2}))$/);
    if (regionMatch) {
      locality = regionMatch[1].trim();
      addressRegion = regionMatch[2];
    }
  }

  return {
    '@type': 'PostalAddress',
    streetAddress,
    postalCode,
    addressLocality: locality || undefined,
    addressRegion: addressRegion || undefined,
    addressCountry: countryCode
  };
}

export function buildGymPresentation(gym) {
  const customDescription = fixGymText(gym?.description || gym?.presentazione || '');
  if (customDescription) {
    return customDescription;
  }

  const name = fixGymText(gym?.name || 'Questa palestra');
  const disciplines = disciplineListForGym(gym);
  const first = disciplines[0] || 'Fitness';
  const address = formatAddressForDisplay(gym);

  if (disciplines.length > 1) {
    return `${name} propone un'offerta dedicata a ${disciplines.join(', ')}. La sede si trova in ${address} ed e pensata per chi cerca un luogo dove allenarsi con continuita, anche quando si trova fuori zona.`;
  }

  return `${name} e una palestra specializzata in ${first}. La struttura si trova in ${address} ed e un punto utile per chi vuole allenarsi con regolarita trovando rapidamente informazioni essenziali su contatti e orari.`;
}

export function cityLabelForGym(gym) {
  const address = structuredAddressForGym(gym);
  return fixGymText(address.addressLocality || gym?.city || '');
}

export function buildGymSeoHighlights(gym) {
  const disciplines = disciplineListForGym(gym);
  const primary = disciplines[0] || 'Fitness';
  const city = cityLabelForGym(gym);
  const address = formatAddressForDisplay(gym);
  const hoursInfo = fixGymText(gym?.hours_info || '');
  const points = [
    `${fixGymText(gym?.name || 'La struttura')} propone ${disciplines.join(', ')} con una scheda pensata per chi vuole confrontare rapidamente opzioni reali nella zona di ${city || 'riferimento'}.`,
    `L'indirizzo pubblicato e ${address}, quindi puoi capire subito se la palestra e comoda rispetto alla tua posizione o a un periodo di viaggio.`,
    hoursInfo && hoursInfo !== 'Orari da verificare'
      ? `Gli orari disponibili sono gia visibili nella scheda, utile per una prima selezione senza dover aprire altre pagine o chiamare subito la struttura.`
      : `Se gli orari non sono ancora completi, hai comunque contatti e riferimenti per verificare rapidamente la disponibilita della struttura.`,
    `Se stai cercando ${primary}${city ? ` a ${city}` : ''}, questa pagina ti aiuta a valutare in pochi secondi se vale la pena approfondire.`
  ];

  return points.filter(Boolean);
}

export function buildGymFaqItems(gym) {
  const name = fixGymText(gym?.name || 'questa palestra');
  const disciplines = disciplineListForGym(gym);
  const address = formatAddressForDisplay(gym);
  const phone = fixGymText(gym?.phone || '');
  const website = fixGymText(gym?.website || '');
  const hoursInfo = fixGymText(gym?.hours_info || '');

  return [
    {
      question: `Quali discipline si praticano da ${name}?`,
      answer: `${name} risulta collegata a ${disciplines.join(', ')}. La scheda pubblica serve a capire rapidamente se l'offerta e coerente con quello che stai cercando.`
    },
    {
      question: `Dove si trova ${name}?`,
      answer: `${name} si trova in ${address}. In questa pagina trovi anche il collegamento rapido per aprire la posizione in mappa.`
    },
    {
      question: `Come posso contattare ${name}?`,
      answer: phone
        ? `Puoi contattare ${name} telefonicamente al ${phone}${website ? ` oppure visitare il sito ufficiale: ${website}.` : '.'}`
        : website
          ? `Puoi visitare il sito ufficiale di ${name}: ${website}.`
          : `La scheda non riporta ancora un contatto diretto completo, ma mostra i dati principali utili per identificare la struttura.`
    },
    {
      question: `Gli orari di ${name} sono disponibili?`,
      answer: hoursInfo && hoursInfo !== 'Orari da verificare'
        ? `Si, gli orari pubblicati per ${name} sono: ${hoursInfo}.`
        : `Gli orari di ${name} non sono ancora completi nella scheda pubblica e conviene verificarli direttamente con la struttura.`
    }
  ];
}

export function isIndexableGym(gym) {
  const name = fixGymText(gym?.name || '');
  const address = fixGymText(gym?.address || '');
  const phone = fixGymText(gym?.phone || '');
  const website = fixGymText(gym?.website || '');
  const hoursInfo = fixGymText(gym?.hours_info || '');
  const disciplines = disciplineListForGym(gym);
  const hasCoordinates =
    Number.isFinite(Number(gym?.latitude)) && Number.isFinite(Number(gym?.longitude));
  const hasContactSignal = Boolean(phone || website);
  const hasUsableHours = Boolean(hoursInfo && hoursInfo !== 'Orari da verificare');

  return Boolean(
    name &&
    address &&
    disciplines.length > 0 &&
    hasCoordinates &&
    hasContactSignal &&
    hasUsableHours
  );
}
