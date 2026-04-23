import { normalizeDisciplineLabel } from '$lib/disciplines';

export function fixGymText(value) {
  let text = String(value || '');
  if (!text) return '';

  const replacements = [
    ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬', 'ÃƒÆ’Ã¢â€šÂ¬'], ['ÃƒÆ’Ã†â€™Ãƒâ€¹Ã¢â‚¬Â ', 'ÃƒÆ’Ã‹â€ '], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°', 'ÃƒÆ’Ã¢â‚¬Â°'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬â„¢', 'ÃƒÆ’Ã…â€™'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢', 'ÃƒÆ’Ã¢â‚¬â„¢'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢', 'ÃƒÆ’Ã¢â€žÂ¢'],
    ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ', 'ÃƒÆ’Ã‚Â '], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨', 'ÃƒÆ’Ã‚Â¨'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©', 'ÃƒÆ’Ã‚Â©'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬', 'ÃƒÆ’Ã‚Â¬'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â²', 'ÃƒÆ’Ã‚Â²'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹', 'ÃƒÆ’Ã‚Â¹'],
    ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶', 'ÃƒÆ’Ã‚Â¶'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤', 'ÃƒÆ’Ã‚Â¤'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¸', 'ÃƒÆ’Ã…Â¸'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“', 'ÃƒÆ’Ã¢â‚¬â€œ'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼', 'ÃƒÆ’Ã‚Â¼'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬Å“', 'ÃƒÆ’Ã…â€œ'],
    ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ', '-'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â', '-'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ', "'"], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢', "'"], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“', '"'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â', '"'],
    ['ÃƒÆ’Ã¢â‚¬Å¡', '']
  ];

  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }

  return text.replace(/\s+/g, ' ').trim();
}

function inferredDisciplinesFromName(name) {
  const text = fixGymText(name).toLowerCase();
  if (!text) return [];

  const patterns = [
    ['Iaido', /(^|\s)(iaido|iado|laido)(\s|$)/i],
    ['Wing Chun', /(^|\s)(wing chun|win chun|win chung)(\s|$)/i],
    ['Kung Fu', /(^|\s)kung fu(\s|$)|(^|\s)kungfu(\s|$)|(^|\s)choy(\s|$)/i],
    ['Tai Chi', /(^|\s)tai chi(\s|$)|(^|\s)taiji(\s|$)/i],
    ['Taekwondo', /(^|\s)taekwondo(\s|$)/i],
    ['Aikido', /(^|\s)aikido(\s|$)/i],
    ['Scherma', /(^|\s)scherma(\s|$)|(^|\s)fencing(\s|$)/i],
    ['Jujitsu Brasiliano', /(^|\s)bjj(\s|$)|brazilian jiu jitsu|jiu ?jitsu brasiliano|ju ?jitsu brasiliano/i],
    ['Jujitsu', /(^|\s)jiu ?jitsu(\s|$)|(^|\s)ju ?jitsu(\s|$)/i],
    ['Grappling', /(^|\s)grappling(\s|$)|(^|\s)wrestling(\s|$)|(^|\s)lotta(\s|$)/i],
    ['Kickboxe', /(^|\s)kick ?boxing?(\s|$)|(^|\s)kickboxe(\s|$)/i],
    ['Muay Thai', /(^|\s)muay ?thai(\s|$)/i],
    ['K1', /(^|\s)k1(\s|$)/i],
    ['MMA', /(^|\s)mma(\s|$)|mixed martial arts/i],
    ['Boxe', /(^|\s)boxe(\s|$)|(^|\s)boxing(\s|$)/i],
    ['Judo', /(^|\s)judo(\s|$)/i],
    ['Karate', /(^|\s)karate(\s|$)|kyokushin|shito ryu|wa rei ryu/i],
    ['Difesa Personale', /self defense|difesa personale/i],
    ['CrossFit', /(^|\s)crossfit(\s|$)/i],
    ['Calisthenics', /(^|\s)calisthenics(\s|$)/i],
    ['Functional', /(^|\s)functional(\s|$)/i],
    ['Nuoto', /(^|\s)nuoto(\s|$)|(^|\s)swim(ming)?(\s|$)/i],
    ['Yoga', /(^|\s)yoga(\s|$)/i],
    ['Pilates', /(^|\s)pilates(\s|$)/i],
    ['Basket', /(^|\s)basket(ball)?(\s|$)/i],
    ['Calcio', /(^|\s)calcio(\s|$)|(^|\s)soccer(\s|$)|(^|\s)football(\s|$)/i],
    ['Pattinaggio', /(^|\s)pattinaggio(\s|$)|(^|\s)skating(\s|$)|roller/i]
  ];

  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function disciplineListForGym(gym) {
  let normalized = [];

  if (Array.isArray(gym?.disciplines) && gym.disciplines.length) {
    normalized = gym.disciplines.map((d) => normalizeDisciplineLabel(d)).filter(Boolean);
  } else if (typeof gym?.discipline === 'string' && gym.discipline.trim()) {
    normalized = gym.discipline
      .split('|')
      .map((d) => normalizeDisciplineLabel(d))
      .filter(Boolean);
  }

  if (!normalized.length) {
    normalized = ['Fitness'];
  }

  const inferred = inferredDisciplinesFromName(gym?.name);
  if (inferred.length && normalized.length === 1 && normalized[0] === 'Fitness') {
    return [...new Set([...inferred, ...normalized])];
  }

  return normalized;
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
    Jujitsu: '/images/placeholders/grappling.svg',
    'Jujitsu Brasiliano': '/images/placeholders/grappling.svg',
    Grappling: '/images/placeholders/grappling.svg',
    Karate: '/images/placeholders/karate.svg',
    Taekwondo: '/images/placeholders/taekwondo.svg',
    Aikido: '/images/placeholders/aikido.svg',
    'Kung Fu': '/images/placeholders/kung-fu.svg',
    'Wing Chun': '/images/placeholders/kung-fu.svg',
    'Tai Chi': '/images/placeholders/kung-fu.svg',
    Scherma: '/images/placeholders/scherma.svg',
    Chanbara: '/images/placeholders/karate.svg',
    'Difesa Personale': '/images/placeholders/difesa-personale.svg',
    'Arti Marziali': '/images/placeholders/mma.svg',
    CrossFit: '/images/placeholders/functional.svg',
    Pilates: '/images/placeholders/wellness.svg',
    Yoga: '/images/placeholders/wellness.svg',
    Nuoto: '/images/placeholders/nuoto.svg',
    Basket: '/images/placeholders/basket.svg',
    Calcio: '/images/placeholders/calcio.svg',
    Pattinaggio: '/images/placeholders/pattinaggio.svg',
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
    Jujitsu: '/images/stock/grappling',
    'Jujitsu Brasiliano': '/images/stock/grappling',
    Grappling: '/images/stock/grappling',
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
    Basket: '/images/stock/basket',
    Calcio: '/images/stock/calcio',
    Pattinaggio: '/images/stock/pattinaggio',
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
    // Keep dedicated yoga/pilates sets isolated from the legacy shared wellness pool.
    Yoga: ['/images/stock/yoga.webp', '/images/stock/yoga-2.webp', '/images/stock/yoga-3.webp'],
    Pilates: ['/images/stock/pilates.webp', '/images/stock/pilates-2.webp', '/images/stock/pilates-3.webp'],
    // Support the current local naming while we standardize the asset set.
    'Difesa Personale': [
      '/images/stock/difesapersonale.webp',
      '/images/stock/difesapersonale-2.webp',
      '/images/stock/difesapersonale-3.webp'
    ],
    'Kung Fu': ['/images/stock/kungfu.webp', '/images/stock/kungfu-2.webp', '/images/stock/kungfu-3.webp'],
    'Wing Chun': ['/images/stock/kungfu.webp', '/images/stock/kungfu-2.webp', '/images/stock/kungfu-3.webp'],
    'Tai Chi': ['/images/stock/kungfu.webp', '/images/stock/kungfu-2.webp', '/images/stock/kungfu-3.webp']
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
    return `${name} è presente a ${address} e nel catalogo risulta collegata a ${disciplines.join(', ')}. In questa scheda trovi i dati principali per capire se può avere senso approfondire.`;
  }

  return `${name} è una palestra di ${first} in ${address}. Qui abbiamo raccolto indirizzo, orari e riferimenti utili per una prima verifica.`;
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
    `${fixGymText(gym?.name || 'La struttura')} nel catalogo compare con queste discipline: ${disciplines.join(', ')}${city ? `, nella zona di ${city}` : ''}.`,
    `L'indirizzo pubblicato è ${address}, quindi puoi capire subito se la struttura è compatibile con i tuoi spostamenti.`,
    hoursInfo && hoursInfo !== 'Orari da verificare'
      ? `Gli orari sono già visibili nella scheda, quindi puoi controllare disponibilità e fascia oraria senza passare da altri canali.`
      : `Gli orari non sono completi, ma restano disponibili i riferimenti principali per contattare la struttura.`,
    `${primary}${city ? ` a ${city}` : ''} è il taglio con cui questa pagina viene presentata, così capisci subito se stai guardando il tipo di struttura che ti interessa.`
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
      answer: `${name} nel catalogo risulta collegata a ${disciplines.join(', ')}. Se stai confrontando più strutture, questo è il primo dato da verificare.`
    },
    {
      question: `Dove si trova ${name}?`,
      answer: `${name} si trova in ${address}. Nella scheda trovi anche il collegamento rapido per aprire la posizione in mappa.`
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
        ? `Sì, gli orari pubblicati per ${name} sono: ${hoursInfo}.`
        : `Gli orari di ${name} non sono ancora completi nella scheda pubblica e conviene verificarli direttamente con la struttura.`
    }
  ];
}

const OFFICIAL_20TRAININGLAB_OVERRIDE = {
  sourceUrl: 'https://www.20traininglab.it/',
  website: 'https://www.20traininglab.it/',
  infoCards: [
    {
      label: 'Formula',
      value: 'EMS 20 min · Vaculab 30 min',
      body: 'Il sito ufficiale presenta due format rapidi: EMS da 20 minuti e Vaculab da 30 minuti, entrambi costruiti per chi vuole allenarsi bene senza sedute molto lunghe.'
    },
    {
      label: 'Metodo',
      value: 'EMS + Vacuum Terapia',
      body: '20 Training Lab combina allenamento EMS con tuta dedicata e Vaculab con tapis roulant, infrarossi e ambiente sottovuoto.'
    },
    {
      label: 'Supporto',
      value: 'Personal trainer qualificati',
      body: 'Il brand insiste su un percorso guidato da trainer specializzati, con allenamento personalizzato costruito sugli obiettivi della persona.'
    },
    {
      label: 'Network',
      value: '65+ sedi · 120+ trainer',
      body: 'La home ufficiale mette in evidenza una rete ampia, con oltre 65 sedi in Italia e più di 120 personal trainer.'
    }
  ],
  presentation:
    '20 Training Lab è un network fitness che il sito ufficiale presenta come soluzione rapida e personalizzata per il benessere, con allenamenti EMS e Vaculab costruiti per chi vuole ottimizzare il tempo senza rinunciare a un lavoro guidato da trainer qualificati.',
  highlights: [
    'La proposta ufficiale di 20 Training Lab ruota attorno a due format precisi: EMS, descritto come allenamento rapido da 20 minuti con tuta elettrostimolante, e Vaculab, percorso da 30 minuti con vacuum terapia e infrarossi.',
    'Il brand non si presenta come palestra tradizionale, ma come metodo centrato sulla qualità del tempo. Questo è un dettaglio importante per chi cerca una struttura adatta a routine fitte o allenamenti molto efficienti.',
    'Nella sezione EMS il sito collega il metodo a obiettivi come tonificazione, riduzione massa grassa, contrasto alla cellulite, beneficio posturale e supporto contro la sarcopenia. La scheda diventa quindi più leggibile per chi confronta obiettivi concreti, non solo marchi.',
    'La sezione Vaculab mette in evidenza dimagrimento localizzato, drenaggio, lavoro sul microcircolo e tonificazione di gambe, glutei e addome. In pratica, la differenza rispetto a un centro fitness standard sta anche nella combinazione di tecnologie e protocolli dedicati.'
  ],
  faqItems: [
    {
      question: 'Che tipo di centro è 20 Training Lab secondo il sito ufficiale?',
      answer:
        'Il sito ufficiale presenta 20 Training Lab come network dedicato a EMS e Vaculab, con allenamenti brevi, personalizzati e guidati da trainer qualificati.'
    },
    {
      question: 'Quanto durano le sessioni in 20 Training Lab?',
      answer:
        'La home ufficiale parla di sessioni EMS da 20 minuti e di allenamenti Vaculab da 30 minuti, pensati per offrire un lavoro mirato in poco tempo.'
    },
    {
      question: 'Quali obiettivi vengono messi in evidenza da 20 Training Lab?',
      answer:
        'Il sito collega il metodo a obiettivi come tonificazione, dimagrimento, riduzione della cellulite, miglioramento posturale, drenaggio e benessere generale.'
    },
    {
      question: '20 Training Lab opera come singolo centro o come rete più ampia?',
      answer:
        'Secondo la home ufficiale, il brand conta oltre 65 sedi in Italia e più di 120 personal trainer, quindi si presenta come rete strutturata e non come singolo studio isolato.'
    }
  ]
};

const OFFICIAL_GYM_OVERRIDES = {
  "20' Training Lab Busto Arsizio": OFFICIAL_20TRAININGLAB_OVERRIDE,
  "20' Training Lab Gallarate": OFFICIAL_20TRAININGLAB_OVERRIDE,
  "20' Training Lab Saronno": OFFICIAL_20TRAININGLAB_OVERRIDE,
  "20' Training Lab Varese": OFFICIAL_20TRAININGLAB_OVERRIDE,
  'FitActive Mendrisio': {
    sourceUrl: 'https://www.fitactive.it/i-club/Mendrisio.php',
    seoTitle: 'FitActive Mendrisio: palestra 24/7, prezzi e contatti',
    seoDescription:
      'Scheda completa di FitActive Mendrisio: palestra fitness 24/7, formula da 49,90 CHF al mese, contatti, posizione e dettagli ufficiali del club.',
    monthlyPrice: 'Da 49,90 CHF al mese',
    preSaleHours: 'Lun-Ven 10:00-20:00 · Sab 10:00-18:00',
    email: 'mendrisio@fitactive.ch',
    socialLinks: [
      {
        label: 'Facebook ufficiale',
        href: 'https://www.facebook.com/profile.php?id=61577775070875'
      },
      {
        label: 'Instagram ufficiale',
        href: 'https://www.instagram.com/fitactivemendrisio/'
      }
    ],
    infoCards: [
      {
        label: 'Formula',
        value: 'Da 49,90 CHF al mese'
      },
      {
        label: 'Attrezzature',
        value: 'Cardio e isotoniche',
        body: 'Impostazione orientata a un allenamento fitness completo.'
      },
      {
        label: 'Servizi extra',
        value: 'Corsi, relax e servizi accessori',
        body: 'Corsi di gruppo, lampade abbronzanti, bevande energetiche, pedane vibranti e poltrone relax.'
      },
      {
        label: 'Prevendita',
        value: 'Lun-Ven 10:00-20:00 · Sab 10:00-18:00'
      }
    ],
    presentation:
      'FitActive Mendrisio è una palestra fitness a Mendrisio che, secondo la pagina ufficiale del club, punta su allenamento illimitato, attrezzature cardio e isotoniche di qualità e una proposta orientata a un uso frequente e senza complicazioni.',
    highlights: [
      'La pagina ufficiale del club presenta FitActive Mendrisio come una palestra fitness a Mendrisio con accesso illimitato e formula da 49,90 CHF al mese, un messaggio forte per chi sta confrontando prezzo e posizionamento nella zona.',
      'Tra i punti messi in evidenza dal club ci sono attrezzature cardio e isotoniche, utili per chi cerca una sala fitness orientata all’allenamento completo più che a una sola attività specifica.',
      'Nel materiale ufficiale compaiono anche corsi di gruppo, lampade abbronzanti, bevande energetiche, pedane vibranti e poltrone relax: dettagli che aiutano a capire subito il taglio commerciale e i servizi accessori della struttura.',
      'Per questa sede sono pubblicati anche contatti diretti, email ufficiale e orari di prevendita, quindi la scheda può rispondere bene sia a chi vuole allenarsi sia a chi vuole chiedere informazioni prima di iscriversi.'
    ],
    faqItems: [
      {
        question: 'Quanto costa FitActive Mendrisio secondo il club?',
        answer:
          'La pagina ufficiale del club FitActive Mendrisio indica una formula a partire da 49,90 CHF al mese.'
      },
      {
        question: 'Quali servizi mette in evidenza FitActive Mendrisio?',
        answer:
          'Nel materiale ufficiale del club vengono citati corsi di gruppo, lampade abbronzanti, bevande energetiche, pedane vibranti e poltrone relax, oltre alle attrezzature cardio e isotoniche.'
      },
      {
        question: 'Ci sono contatti diretti per FitActive Mendrisio?',
        answer:
          'Sì. La pagina ufficiale del club riporta il numero +41 76 424 68 50, l’email mendrisio@fitactive.ch e i profili Facebook e Instagram della sede.'
      },
      {
        question: 'Quali orari sono indicati per la prevendita di FitActive Mendrisio?',
        answer:
          'Secondo la pagina ufficiale del club, gli orari di prevendita sono Lun-Ven 10:00-20:00 e Sab 10:00-18:00.'
      }
    ]
  },
  'PilActive Saronno': {
    sourceUrl: 'https://pilactive.com/',
    seoTitle: 'PilActive Saronno: Pilates Reformer, corsi e tariffe',
    seoDescription:
      'Scheda di PilActive Saronno con dati ufficiali: Reformer, Matwork, Yoga, mini classi, formula open annuale e contatti del centro Pilates.',
    website: 'https://pilactive.com/',
    email: 'info@pilactive.it',
    monthlyPrice: 'Open 12 mesi 324€ · Reformer 30 lezioni 399€',
    infoCards: [
      {
        label: 'Tariffe',
        value: 'Open 12 mesi 324€',
        body: 'Pacchetto 30 lezioni Reformer a 399€ nella convenzione CRA FNM 2026.'
      },
      {
        label: 'Classi',
        value: 'Reformer, Matwork, Yoga',
        body: 'Sono citati anche percorsi Personal Pilates/Posturale.'
      },
      {
        label: 'Metodo',
        value: 'Benessere psico-fisico',
        body: 'Il sito ufficiale presenta PilActive come centro orientato a controllo del movimento, postura e lavoro consapevole.'
      },
      {
        label: 'Lezioni',
        value: 'Mini classi max 12 persone',
        body: 'La convenzione CRA FNM 2026 parla di disponibilità 7 giorni su 7 per il Reformer.'
      }
    ],
    presentation:
      'PilActive Saronno è uno studio Pilates a Saronno che il sito ufficiale presenta come centro dedicato al benessere psico-fisico, con un’offerta focalizzata su movimento consapevole, controllo del corpo e lavoro tecnico su più format.',
    highlights: [
      'Il sito ufficiale PilActive descrive il brand come un centro completamente dedicato al benessere psico-fisico: un messaggio utile per chi sta cercando a Saronno una proposta più orientata a postura, controllo e qualità del movimento che a una palestra fitness generica.',
      'Tra le classi messe in evidenza sul sito ufficiale compaiono Group Reformer, Pilates Matwork, Yoga e Personal Pilates/Posturale. Questo aiuta a capire subito che la scheda non riguarda solo lezioni di Pilates tradizionale, ma un’offerta più articolata.',
      'La presentazione ufficiale del Reformer insiste su un allenamento completo ed efficace, mentre il Matwork viene descritto come lavoro utile per forza, resistenza muscolare, mobilità articolare e modellamento muscolare: dettagli concreti per chi sta confrontando approcci diversi.',
      'Il sito ufficiale invita anche a consultare il palinsesto corsi e a contattare direttamente il centro per maggiori informazioni. In pratica, questa pagina è utile per una prima scrematura, ma il passaggio finale resta verificare disponibilità, lezioni e organizzazione direttamente con PilActive.'
    ],
    faqItems: [
      {
        question: 'Che tipo di centro è PilActive Saronno secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta PilActive come un centro completamente dedicato al benessere psico-fisico, con un lavoro basato su Pilates, movimento consapevole e controllo del corpo.'
      },
      {
        question: 'Quali attività vengono messe in evidenza per PilActive Saronno?',
        answer:
          'Nel sito ufficiale PilActive vengono messe in evidenza classi Group Reformer, Pilates Matwork, Yoga e percorsi Personal Pilates/Posturale.'
      },
      {
        question: 'Perché PilActive Saronno può essere interessante per chi cerca Pilates a Saronno?',
        answer:
          'Perché la proposta ufficiale non si limita al Pilates a corpo libero: include anche Reformer e percorsi più mirati, quindi può essere utile sia a chi cerca lavoro tecnico sia a chi vuole un contesto più orientato a postura e benessere.'
      },
      {
        question: 'Dove trovare informazioni aggiornate su corsi e contatti di PilActive Saronno?',
        answer:
          'Il sito ufficiale PilActive invita a consultare il palinsesto corsi e a contattare direttamente il centro. In questa scheda trovi i dati base per una prima verifica, ma per disponibilità e organizzazione conviene usare i canali ufficiali.'
      }
    ]
  },
  'Body Work Lugano - EMS e Vacu Gym': {
    sourceUrl: 'https://bodyworklugano.ch/',
    seoTitle: 'Body Work Lugano: EMS, Vacu Gym e orari',
    seoDescription:
      'Scopri Body Work Lugano - EMS e Vacu Gym: EMS, Vacu Gym, criosauna, prova gratuita, parcheggi riservati e orari ufficiali del centro.',
    website: 'https://bodyworklugano.ch/',
    monthlyPrice: 'Prova gratuita',
    infoCards: [
      {
        label: 'Metodo',
        value: 'EMS · Vacu Gym · Criosauna',
        body: 'Il sito ufficiale presenta Body Work come centro dedicato a tecnologie rapide e mirate per fitness, benessere e longevità.'
      },
      {
        label: 'EMS',
        value: '20 minuti',
        body: 'La pagina ufficiale spiega che le sessioni EMS puntano a stimolare fino al 90% della contrazione muscolare in tempi molto brevi.'
      },
      {
        label: 'Vacu Gym',
        value: '30 minuti',
        body: 'La proposta unisce tapis roulant, sottovuoto ed effetto termico per lavorare su metabolismo, circolazione e tonicità.'
      },
      {
        label: 'Comodità',
        value: 'Prova gratuita e parcheggi riservati',
        body: 'Il sito invita a prenotare una prova gratuita e segnala posti auto disponibili direttamente davanti al centro.'
      }
    ],
    presentation:
      'Body Work Lugano è un centro fitness a Lugano che il sito ufficiale presenta come struttura specializzata in EMS, Vacu Gym e criosauna, con percorsi personalizzati pensati per chi cerca risultati rapidi e allenamenti seguiti senza la logica della palestra tradizionale.',
    highlights: [
      'Il sito ufficiale parla di una nuova frontiera del fitness a Lugano, con un posizionamento molto chiaro: sessioni brevi, tecnologie specifiche e supporto professionale invece di frequenza libera da palestra generalista.',
      'Tra le proposte messe in evidenza compaiono allenamento EMS, Vacu Gym e criosauna. Questo rende subito leggibile la differenza rispetto a un centro fitness classico e aiuta chi cerca un format più mirato e time-efficient.',
      'La pagina dedicata all’EMS insiste su sessioni da 20 minuti, mentre il Vacu Gym viene presentato come trattamento da 30 minuti orientato a metabolismo, circolazione e contrasto a cellulite e ritenzione idrica.',
      'Il sito ufficiale segnala anche prova gratuita, parcheggi riservati davanti al centro, consigli alimentari gratuiti e riconoscimento Qualitop: elementi pratici utili per chi sta confrontando opzioni a Lugano.'
    ],
    faqItems: [
      {
        question: 'Che tipo di centro è Body Work Lugano secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta Body Work Lugano come centro specializzato in EMS, Vacu Gym e criosauna, con percorsi personalizzati orientati a benessere, fitness e longevità.'
      },
      {
        question: 'Quanto dura una sessione EMS a Body Work Lugano?',
        answer:
          'La pagina ufficiale spiega che l’allenamento EMS è strutturato su sessioni da 20 minuti, pensate per massimizzare il lavoro muscolare in tempi brevi.'
      },
      {
        question: 'Body Work Lugano offre una prova iniziale?',
        answer:
          'Sì. Il sito ufficiale invita a prenotare una prova gratuita per conoscere il centro e i diversi percorsi disponibili.'
      },
      {
        question: 'Ci sono parcheggi disponibili da Body Work Lugano?',
        answer:
          'Sì. La pagina ufficiale segnala parcheggi riservati direttamente davanti al centro, oltre alla sede in Via Tesserete 65 a Lugano.'
      }
    ]
  },
  'NonStop Gym Lugano (The CLUB GetFIT)': {
    sourceUrl: 'https://www.nonstopgym.com/nostri-club/lugano/',
    seoTitle: 'NonStop Gym Lugano: palestra 24/7, prezzi e servizi',
    seoDescription:
      'Scopri NonStop Gym Lugano: palestra aperta 24/7, abbonamenti da 49 CHF al mese, Boost Zone, attrezzature e contatti ufficiali.',
    website: 'https://www.nonstopgym.com/nostri-club/lugano/',
    monthlyPrice: 'Annuale 49 CHF/mese · Mensile 69 CHF/mese',
    infoCards: [
      {
        label: 'Abbonamenti',
        value: '49 CHF/mese o 69 CHF/mese',
        body: 'Il sito ufficiale presenta un annuale multisede da 49 CHF/mese e un mensile da 69 CHF/mese.'
      },
      {
        label: 'Accesso',
        value: 'Aperta 24/7',
        body: 'La formula NonStop Gym punta su accesso libero in ogni momento della giornata.'
      },
      {
        label: 'Dotazioni',
        value: 'Cardio, pesi liberi, funzionale',
        body: 'Il brand mette in evidenza attrezzature di qualità, spogliatoi con docce e armadietti, oltre a uno spazio riservato alle donne.'
      },
      {
        label: 'Boost Zone',
        value: 'Supplemento 20 CHF/mese',
        body: 'Lugano è uno dei club con area Boost per piccoli gruppi e allenamento guidato.'
      }
    ],
    presentation:
      'NonStop Gym Lugano è una palestra fitness a Lugano che il sito ufficiale presenta come club aperto 24/7, orientato a rendere il fitness di qualità accessibile con una formula semplice, multisede e sempre disponibile.',
    highlights: [
      'Il sito ufficiale NonStop Gym insiste su una promessa molto chiara: fitness di qualità a prezzo accessibile, con il club di Lugano aperto 24 ore su 24, 7 giorni su 7. Per chi cerca una palestra a Lugano con accesso continuativo, questo è il primo elemento distintivo.',
      'Gli abbonamenti ufficiali comunicati dal brand sono un annuale da 49 CHF al mese e un mensile da 69 CHF al mese, entrambi validi in tutti i club NonStop Gym standard. Questo rende la scheda utile per chi sta confrontando prezzo, flessibilità e copertura multisede.',
      'Nella presentazione ufficiale compaiono attrezzature guidate, pesi liberi, cardio, area funzionale, spogliatoi con docce e armadietti, oltre a uno spazio riservato alle donne. Sono dettagli concreti per capire il taglio del club prima ancora di una visita.',
      'Lugano viene citata anche come sede con Boost Zone, cioè uno spazio dedicato a piccoli gruppi e allenamenti guidati, disponibile con supplemento. Questo aggiunge una differenziazione utile rispetto a una palestra 24/7 puramente autonoma.'
    ],
    faqItems: [
      {
        question: 'Quanto costa NonStop Gym Lugano secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale NonStop Gym indica un abbonamento annuale da 49 CHF al mese e un abbonamento mensile da 69 CHF al mese, con accesso ai club standard del network.'
      },
      {
        question: 'NonStop Gym Lugano è davvero aperta 24 ore su 24?',
        answer:
          'Sì. La comunicazione ufficiale del brand presenta il club di Lugano come struttura aperta 24/7, quindi adatta anche a chi cerca massima flessibilità di accesso.'
      },
      {
        question: 'Che tipo di attrezzature e servizi mette in evidenza NonStop Gym?',
        answer:
          'La presentazione ufficiale parla di attrezzature guidate, pesi liberi, cardio, area funzionale, spogliatoi con docce e armadietti e uno spazio riservato alle donne.'
      },
      {
        question: 'Cos’è la Boost Zone di Lugano?',
        answer:
          'La Boost Zone è l’area dedicata ai piccoli gruppi e agli allenamenti guidati nel club di Lugano. Il sito ufficiale indica un supplemento di 20 CHF al mese per accedere a questa formula.'
      }
    ]
  },
  'Activ Fitness Giubiasco': {
    sourceUrl: 'https://www.activfitness.ch/it/studios/activ-fitness-giubiasco/',
    seoTitle: 'Activ Fitness Giubiasco: corsi, sauna e palestra',
    seoDescription:
      'Scheda di Activ Fitness Giubiasco con dati ufficiali: 800 m², oltre 50 postazioni, più di 25 corsi a settimana, sauna, biosauna e contatti.',
    website: 'https://www.activfitness.ch/it/studios/activ-fitness-giubiasco/',
    infoCards: [
      {
        label: 'Dimensione',
        value: '800 m²',
        body: 'La pagina ufficiale descrive uno studio con circa 800 metri quadrati di spazio dedicato all’allenamento.'
      },
      {
        label: 'Postazioni',
        value: '50+',
        body: 'Il sito ufficiale parla di oltre 50 postazioni di allenamento tra forza e resistenza.'
      },
      {
        label: 'Corsi',
        value: '25+ a settimana',
        body: 'La sede mette in evidenza una sala corsi dedicata e un programma ricco per chi cerca anche classi collettive.'
      },
      {
        label: 'Wellness',
        value: 'Sauna e biosauna',
        body: 'Nella presentazione ufficiale compaiono sauna finlandese e biosauna per il recupero post allenamento.'
      }
    ],
    presentation:
      'Activ Fitness Giubiasco è una palestra fitness a Giubiasco che il sito ufficiale presenta come studio completo e ben collegato, con ampia superficie, molte postazioni di allenamento, corsi di gruppo e un’area wellness pensata per il recupero.',
    highlights: [
      'La pagina ufficiale di Activ Fitness Giubiasco descrive una sede di circa 800 m² con oltre 50 postazioni di allenamento. Questo rende la scheda utile per chi vuole capire subito se si tratta di una palestra compatta o di una struttura più completa.',
      'Tra i punti messi in evidenza dal club ci sono pesi liberi, macchine per forza e resistenza, una Functional Zone con Functional Tower e una sala corsi dedicata. In pratica, il posizionamento è quello di una palestra fitness generalista ben attrezzata.',
      'La sede segnala anche più di 25 corsi a settimana e 5 aree di allenamento. Per chi sta confrontando diverse opzioni nella zona di Giubiasco, è un’informazione concreta sul livello di varietà disponibile.',
      'Un elemento distintivo rispetto a molte palestre standard è la presenza di sauna finlandese e biosauna, oltre ai parcheggi gratuiti per i soci nelle immediate vicinanze. Questo aiuta a capire meglio l’esperienza complessiva, non solo il lato allenamento.'
    ],
    faqItems: [
      {
        question: 'Quanto è grande Activ Fitness Giubiasco secondo il sito ufficiale?',
        answer:
          'La pagina ufficiale parla di una superficie di circa 800 m², con oltre 50 postazioni di allenamento e 5 aree dedicate.'
      },
      {
        question: 'Che tipo di allenamento offre Activ Fitness Giubiasco?',
        answer:
          'Il sito ufficiale cita macchine per forza e resistenza, pesi liberi, una Functional Zone con Functional Tower e una sala dedicata ai corsi di gruppo.'
      },
      {
        question: 'Ci sono corsi e area wellness ad Activ Fitness Giubiasco?',
        answer:
          'Sì. La sede indica più di 25 corsi a settimana e mette in evidenza anche una sauna finlandese e una biosauna per il recupero.'
      },
      {
        question: 'Activ Fitness Giubiasco è comoda da raggiungere in auto?',
        answer:
          'Secondo la pagina ufficiale, lo studio si trova a poche centinaia di metri dall’uscita autostradale Bellinzona Sud e dispone di parcheggi gratuiti per i soci nelle vicinanze.'
      }
    ]
  },
  '1CYCLE': {
    sourceUrl: 'https://www.1cycle.ch/',
    website: 'https://www.1cycle.ch/',
    email: 'info@1cycle.ch',
    monthlyPrice: 'Pacchetti a crediti',
    infoCards: [
      {
        label: 'Formula',
        value: 'Pacchetti a crediti',
        body: 'Il sito ufficiale spiega che puoi costruire il tuo programma acquistando crediti da usare nelle diverse pratiche dello studio.'
      },
      {
        label: 'Workouts',
        value: 'Ride, Flow, Personal Training',
        body: '1CYCLE distingue tra indoor cycling ad alta intensità, lezioni orientate a yoga e postura e percorsi individuali.'
      },
      {
        label: 'Crediti',
        value: '45/50 min = 2 crediti',
        body: 'Le sessioni da 30 minuti in pausa pranzo corrispondono invece a 1 credito, secondo la pagina ufficiale dedicata ai crediti.'
      },
      {
        label: 'Orari studio',
        value: 'Lun-Ven 6:30-20:00 · Sab 6:30-12:30',
        body: 'La pagina contatti indica domenica chiuso e riporta gli stessi riferimenti telefonici e email presenti nella scheda.'
      }
    ],
    presentation:
      '1CYCLE è uno studio fitness boutique a Massagno che il sito ufficiale presenta come luogo dedicato a Ride, Flow e personal training, con un’impostazione centrata su energia, movimento consapevole e flessibilità di utilizzo tramite pacchetti a crediti.',
    highlights: [
      'Il sito ufficiale 1CYCLE non si presenta come palestra tradizionale, ma come studio con tre aree molto chiare: Ride, Flow e personal training. Questo aiuta subito a capire che la proposta è più vicina a un format boutique che a una sala fitness generalista.',
      'Nella sezione Ride il brand parla di ambiente adrenalinico ed energico, con classi che combinano bici e panca funzionale. È un dettaglio utile per chi sta cercando indoor cycling a Lugano o Massagno con un taglio più intenso e strutturato.',
      'La sezione Flow descrive invece lezioni di vinyasa yoga, balance e postural, in un contesto più caldo e accogliente. Questo rende la scheda interessante anche per chi sta confrontando opzioni che uniscono lavoro fisico e recupero.',
      'La pagina crediti spiega che i pacchetti possono essere usati nelle diverse sale e pratiche dello studio, con 1 sessione da 45/50 minuti pari a 2 crediti e la sessione pausa pranzo da 30 minuti pari a 1 credito. È un’informazione concreta per capire il modello di accesso prima di prenotare.'
    ],
    faqItems: [
      {
        question: 'Che tipo di studio è 1CYCLE secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta 1CYCLE come uno studio focalizzato su Ride, Flow e personal training, con un’identità più boutique che da palestra fitness tradizionale.'
      },
      {
        question: 'Quali attività vengono messe in evidenza da 1CYCLE?',
        answer:
          'Le sezioni principali del sito ufficiale sono Ride, Flow e Personal Training. Ride combina bici e panca funzionale, mentre Flow include vinyasa yoga, balance e postural.'
      },
      {
        question: 'Come funziona il sistema a crediti di 1CYCLE?',
        answer:
          'La pagina ufficiale dei crediti spiega che una sessione da 45/50 minuti corrisponde a 2 crediti, mentre una sessione da 30 minuti in pausa pranzo corrisponde a 1 credito.'
      },
      {
        question: 'Dove trovare contatti e orari aggiornati di 1CYCLE?',
        answer:
          'La pagina contatti ufficiale riporta indirizzo in Via S. Gottardo 99 a Massagno, email info@1cycle.ch, telefono +41 789585282 e orari Lun-Ven 6:30-20:00, Sab 6:30-12:30, domenica chiuso.'
      }
    ]
  },
  '1to1 Fitness': {
    sourceUrl: 'https://www.1to1fitness.it/',
    website: 'https://www.1to1fitness.it/',
    monthlyPrice: 'Pacchetti di sessioni / open annuale',
    infoCards: [
      {
        label: 'Formula',
        value: '12 / 24 / 48 sessioni',
        body: 'La pagina ufficiale spiega che non ci sono abbonamenti a tempo tradizionali: i protocolli prevedono pacchetti di sessioni oppure formula open annuale.'
      },
      {
        label: 'Metodo',
        value: 'EMS XBody · 20 minuti',
        body: 'Il metodo 1to1 Fitness ruota attorno alla tuta EMS e a sessioni brevi guidate da personal trainer, presentate come alternativa all’allenamento classico più lungo.'
      },
      {
        label: 'Approccio',
        value: 'Percorso individuale',
        body: 'Il sito mette in evidenza appuntamenti programmati, assenza di attese, spogliatoi e docce individuali e un lavoro continuativo con trainer dedicato.'
      },
      {
        label: 'Protocolli',
        value: 'Dimagrimento · Tonificazione · Posturale',
        body: 'L’offerta ufficiale cita protocolli specifici per dimagrimento, tonicità, postura e percorsi personalizzati in base alle esigenze.'
      }
    ],
    presentation:
      '1to1 Fitness è un centro fitness EMS che il sito ufficiale presenta come alternativa alla palestra tradizionale, con sessioni brevi da 20 minuti, personal trainer dedicato e protocolli costruiti su obiettivi come dimagrimento, tonificazione e postura.',
    highlights: [
      'La homepage di 1to1 Fitness descrive la tecnologia EMS XBody come allenamento ad alta efficienza: sessioni da 20 minuti, tuta dedicata e lavoro muscolare amplificato rispetto all’allenamento tradizionale.',
      'Il metodo ufficiale insiste su un percorso individuale con appuntamenti programmati, nessuna attesa e presenza costante del personal trainer. È un’informazione importante per chi non cerca una sala pesi libera ma una struttura molto guidata.',
      'La pagina dell’offerta chiarisce che il centro non lavora con abbonamenti mensili o annuali standard. I protocolli sono organizzati in pacchetti da 12, 24 o 48 sessioni, con possibilità di formula open annuale.',
      'Tra i protocolli citati dal sito compaiono dimagrimento, tonificazione/rassodamento, posturale e percorsi specific personalizzati. Questo aiuta a capire che la scheda non rappresenta una palestra generalista, ma un centro con proposta molto focalizzata.'
    ],
    faqItems: [
      {
        question: 'Che tipo di allenamento propone 1to1 Fitness secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta 1to1 Fitness come centro focalizzato sull’allenamento EMS con tuta XBody, sessioni brevi da 20 minuti e supporto costante di un personal trainer.'
      },
      {
        question: '1to1 Fitness lavora con abbonamenti tradizionali?',
        answer:
          'No. La pagina ufficiale dell’offerta spiega che non ci sono abbonamenti a tempo classici: i protocolli prevedono pacchetti di sessioni, con opzioni da 12, 24 o 48 sessioni e formula open annuale.'
      },
      {
        question: 'Quali obiettivi vengono messi in evidenza da 1to1 Fitness?',
        answer:
          'Nelle pagine ufficiali compaiono protocolli per dimagrimento, tonificazione/rassodamento, rafforzamento muscolare, miglioramento posturale e percorsi personalizzati specific.'
      },
      {
        question: 'Che esperienza promette 1to1 Fitness rispetto a una palestra classica?',
        answer:
          'Il sito mette in evidenza percorso individuale, appuntamenti pianificati, assenza di attese, spogliatoi e docce individuali e la possibilità di arrivare senza borsa, con tutto il necessario fornito in sede.'
      }
    ]
  },
  'A.S.D. Arashi 21100': {
    sourceUrl: 'https://www.arashi21100.it/',
    website: 'https://www.arashi21100.it/',
    email: 'arashi21100@gmail.com',
    infoCards: [
      {
        label: 'Disciplina guida',
        value: 'Judo',
        body: 'Il sito ufficiale presenta Arashi 21100 come ASD Judo & Arti Marziali, con il judo come disciplina principale del progetto.'
      },
      {
        label: 'Attività',
        value: 'Judo · Fit Boxe · Close Combat',
        body: 'Nel sito ufficiale compaiono anche Fit Boxe, Difesa personale e Close Combat, quindi l’offerta è più ampia della sola disciplina base.'
      },
      {
        label: 'Target',
        value: 'Bambini · ragazzi · adulti',
        body: 'La pagina Judo cita corsi per bambini, ragazzi e adulti, con lavoro tecnico e attenzione anche al lato educativo della pratica.'
      },
      {
        label: 'Contatti',
        value: '392 8111970 · 392 3684001',
        body: 'Il sito ufficiale riporta due numeri di riferimento, oltre alla mail associativa e alla sede di Via Donatello 1 a Varese.'
      }
    ],
    presentation:
      'A.S.D. Arashi 21100 è una scuola di judo e arti marziali a Varese che il sito ufficiale presenta come percorso tecnico ed educativo per bambini, ragazzi e adulti, con una proposta che unisce judo, fit boxe, close combat e difesa personale.',
    highlights: [
      'La home ufficiale definisce Arashi 21100 come ASD Judo & Arti Marziali. Questo chiarisce subito che non si tratta di una palestra fitness generica, ma di una realtà focalizzata su discipline marziali strutturate.',
      'Nella pagina Judo il club descrive il lavoro come combinazione di tecnica, stretching, potenziamento, disciplina, sicurezza e combattimento. La scheda diventa utile per chi cerca una scuola con un’impostazione più tecnica che ricreativa.',
      'Il sito evidenzia anche corsi per bambini, con attenzione a valori come rispetto, amicizia, onore e disciplina. È un elemento forte per famiglie o genitori che vogliono capire il taglio educativo della scuola.',
      'Oltre al judo, il menu ufficiale include Fit Boxe, Close Combat, Difesa personale e corsi spray al peperoncino. Questo amplia molto il profilo della struttura rispetto al vecchio dato generico del catalogo.'
    ],
    faqItems: [
      {
        question: 'Che tipo di centro è A.S.D. Arashi 21100 secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta Arashi 21100 come ASD Judo & Arti Marziali a Varese, con il judo come disciplina centrale e un’offerta che include anche fit boxe, close combat e difesa personale.'
      },
      {
        question: 'Arashi 21100 propone corsi anche per bambini?',
        answer:
          'Sì. La pagina Judo indica esplicitamente corsi per bambini, oltre a gruppi per ragazzi e adulti, con un approccio che insiste anche sui valori educativi della disciplina.'
      },
      {
        question: 'Quali attività compaiono sul sito ufficiale di Arashi 21100?',
        answer:
          'Nel sito ufficiale compaiono Judo, Fit Boxe, Close Combat, Difesa personale e corsi dedicati allo spray al peperoncino, oltre alle informazioni associative e ai contatti.'
      },
      {
        question: 'Dove si trova Arashi 21100 e quali contatti ufficiali riporta?',
        answer:
          'Il sito indica la sede in Via Donatello 1 a Varese e riporta la mail arashi21100@gmail.com, oltre ai numeri 392 8111970 e 392 3684001.'
      }
    ]
  },
  'Spartan Gym Busto Arsizio': {
    sourceUrl: 'https://spartangymbustoarsizio.it/',
    seoTitle: 'Spartan Gym Busto Arsizio: palestra, prezzi e orari',
    seoDescription:
      'Scopri Spartan Gym Busto Arsizio: palestra fitness e performance, abbonamenti da 37€ al mese, personal training, parcheggio privato e orari completi.',
    website: 'https://spartangymbustoarsizio.it/',
    infoCards: [
      {
        label: 'Abbonamenti',
        value: 'Base da 37€/mese',
        body: 'Il sito ufficiale pubblica formule base da 37 euro al mese annuale e opzioni mensili, trimestrali e semestrali.'
      },
      {
        label: 'Allenamenti',
        value: 'Trainer e programmi inclusi',
        body: 'È presente anche una linea di abbonamenti con allenamenti seguiti e programmi inclusi, con annuale da 45 euro al mese.'
      },
      {
        label: 'Extra',
        value: 'Ingresso singolo 12€ · PT 25€/h',
        body: 'La pagina ufficiale mostra anche tariffa ingresso singolo e personal training, utile per chi vuole capire subito la flessibilità commerciale.'
      },
      {
        label: 'Comodità',
        value: 'Parcheggio privato adiacente',
        body: 'Il sito evidenzia un parcheggio privato accessibile agli iscritti tramite badge, con ingresso da Via Ugo Foscolo.'
      }
    ],
    presentation:
      'Spartan Gym Busto Arsizio è una palestra fitness e performance a Busto Arsizio che il sito ufficiale presenta come struttura focalizzata su allenamento, programmi seguiti e formule chiare, con orari ampi, personal training e parcheggio privato adiacente.',
    highlights: [
      'Il sito ufficiale di Spartan Gym Busto Arsizio si presenta in modo molto diretto come palestra fitness e performance. Per chi cerca una struttura concreta e orientata all’allenamento, il posizionamento è leggibile subito.',
      'Uno dei segnali più forti lato SEO e conversione è la trasparenza sui prezzi: il sito mostra abbonamenti base e formule con trainer e programmi inclusi, con annuale base da 37 euro al mese e annuale guidato da 45 euro al mese.',
      'La scheda ufficiale riporta anche ingresso singolo a 12 euro e personal training a 25 euro l’ora. Questo aiuta molto chi sta confrontando Busto Arsizio non solo per branding, ma per accessibilità economica e flessibilità.',
      'La presenza di parcheggio privato adiacente, accessibile tramite badge, è un dettaglio pratico importante. In molte ricerche locali su palestra a Busto Arsizio, questo tipo di informazione può spostare il click.'
    ],
    faqItems: [
      {
        question: 'Quanto costa Spartan Gym Busto Arsizio secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale mostra abbonamenti base da 37 euro al mese nella formula annuale, oltre a formule mensili, trimestrali e semestrali e a una linea con trainer e programmi inclusi da 45 euro al mese annuale.'
      },
      {
        question: 'Spartan Gym Busto Arsizio offre personal training?',
        answer:
          'Sì. Il sito ufficiale indica anche personal training a 25 euro l’ora, oltre agli abbonamenti con programmi di allenamento inclusi.'
      },
      {
        question: 'Ci sono formule flessibili per provare Spartan Gym Busto Arsizio?',
        answer:
          'Sì. La pagina ufficiale riporta anche ingresso singolo a 12 euro, utile per chi vuole provare la struttura prima di scegliere un abbonamento.'
      },
      {
        question: 'Spartan Gym Busto Arsizio ha parcheggio?',
        answer:
          'Sì. Il sito ufficiale evidenzia un parcheggio privato adiacente alla struttura, accessibile agli iscritti tramite badge.'
      }
    ]
  },
  'Tempo Pilates': {
    sourceUrl: 'https://www.treatwell.it/salone/tempo-pilates/',
    seoTitle: 'Tempo Pilates Busto Arsizio: Reformer, orari e contatti',
    seoDescription:
      'Scheda di Tempo Pilates a Busto Arsizio: studio specializzato in Reformer Pilates, team, accessibilità, orari e riferimenti ufficiali.',
    website: 'https://www.treatwell.it/salone/tempo-pilates/',
    infoCards: [
      {
        label: 'Specialità',
        value: 'Reformer Pilates',
        body: 'La scheda Treatwell indica esplicitamente lo studio come specializzato in Reformer Pilates.'
      },
      {
        label: 'Team',
        value: 'Valentina',
        body: 'Nella sezione dedicata al team compare Valentina, indicata come riferimento dello studio.'
      },
      {
        label: 'Ambiente',
        value: 'Curato e professionale',
        body: 'Tra i punti forti riportati dalla scheda compaiono ambiente curato e approccio professionale.'
      },
      {
        label: 'Accesso',
        value: 'Comodo con bus e treno',
        body: 'Treatwell segnala vicinanza a fermata autobus e stazione ferroviaria, utile per chi si muove in zona Busto Arsizio.'
      }
    ],
    presentation:
      'Tempo Pilates è uno studio Pilates a Busto Arsizio che la scheda Treatwell presenta come spazio specializzato dove ritrovare il ritmo giusto per corpo e mente, con focus sul Reformer Pilates e un’impostazione curata e professionale.',
    highlights: [
      'La scheda Treatwell di Tempo Pilates lo descrive come studio specializzato, non come palestra generalista. Questo aiuta subito a capire che il posizionamento è centrato sul Pilates e su un contesto più raccolto e guidato.',
      'Tra i punti forti viene citato in modo esplicito il Reformer Pilates. È l’informazione più utile per distinguere lo studio da corsi Pilates a corpo libero o da centri fitness con offerta mista.',
      'Il team indicato nella pagina è rappresentato da Valentina, descritta come professionista che accoglie ogni cliente con gentilezza e attenzione. Per chi cerca uno studio più personale, è un segnale concreto.',
      'Treatwell segnala anche la vicinanza a fermata autobus e stazione ferroviaria. È un dettaglio pratico utile per chi sta confrontando studi Pilates a Busto Arsizio con criteri di accessibilità oltre che di metodo.'
    ],
    faqItems: [
      {
        question: 'Che tipo di studio è Tempo Pilates secondo la scheda Treatwell?',
        answer:
          'La scheda Treatwell presenta Tempo Pilates come studio specializzato a Busto Arsizio, orientato al benessere di corpo e mente e focalizzato sul metodo Pilates.'
      },
      {
        question: 'In cosa è specializzato Tempo Pilates?',
        answer:
          'Tra i punti forti indicati su Treatwell compare in modo esplicito il Reformer Pilates, che risulta la specializzazione più caratterizzante dello studio.'
      },
      {
        question: 'Chi compare come riferimento del team di Tempo Pilates?',
        answer:
          'Nella sezione team della scheda Treatwell compare Valentina, presentata come figura che accoglie i clienti con professionalità e attenzione.'
      },
      {
        question: 'Tempo Pilates è comodo da raggiungere con i mezzi?',
        answer:
          'Sì. La scheda Treatwell segnala la vicinanza a una fermata dell’autobus e a una stazione ferroviaria, oltre all’indirizzo in Via Contardo Ferrini 31 a Busto Arsizio.'
      }
    ]
  },
  'Acinque Ice Arena - Palaghiaccio di Varese': {
    sourceUrl: 'https://www.acinqueicearena.com/',
    seoTitle: 'Acinque Ice Arena Varese: palaghiaccio, pattinaggio e orari',
    seoDescription:
      'Scheda di Acinque Ice Arena - Palaghiaccio di Varese: pattinaggio, ghiaccio, fitness, nuoto, contatti e orari del centro sportivo.',
    website: 'https://www.acinqueicearena.com/',
    email: 'info@acinqueicearena.com',
    infoCards: [
      {
        label: 'Impianto',
        value: 'Centro polisportivo nel cuore di Varese',
        body: 'Il sito ufficiale lo presenta come punto di riferimento sportivo cittadino, non come singola palestra monotematica.'
      },
      {
        label: 'Aree',
        value: 'Ghiaccio · Acqua · Fitness · Padel',
        body: 'La struttura unisce pista coperta 60x30, due piscine, area fitness e campi da padel in un unico complesso.'
      },
      {
        label: 'Fitness',
        value: 'Sala attrezzi 400 m²',
        body: 'La pagina fitness cita sala attrezzi rinnovata con macchinari Technogym, cardio, isotonici e spazi funzionali seguiti da personale qualificato.'
      },
      {
        label: 'Contatti',
        value: 'info@acinqueicearena.com · 0332 1575576',
        body: 'Il sito ufficiale riporta anche contatti dedicati per ghiaccio, acqua, fitness e padel.'
      }
    ],
    presentation:
      'Acinque Ice Arena - Palaghiaccio di Varese è un centro polisportivo a Varese che il sito ufficiale presenta come punto di riferimento per ghiaccio, acqua, fitness e padel, con una struttura rinnovata pensata sia per appassionati sia per chi cerca un impianto completo in città.',
    highlights: [
      'La home ufficiale non descrive Acinque Ice Arena come semplice palestra fitness, ma come centro polisportivo rinnovato con quattro aree distinte: ghiaccio, acqua, fitness e padel. Questo cambia subito il modo corretto di leggere la scheda.',
      'Nell’area ghiaccio il sito mette in evidenza un impianto coperto 60x30 metri e pagine dedicate a pattinaggio libero, eventi e calendari. Per il nome e il posizionamento del centro, questa è la componente più identitaria della struttura.',
      'La pagina fitness parla di una sala attrezzi da 400 m² con macchinari Technogym, cardio, isotonici e spazi funzionali, oltre a programmi personalizzati seguiti da personale qualificato. Quindi il fitness è presente, ma dentro un’offerta più ampia.',
      'La sezione struttura aggiunge anche due piscine, sale corsi, due campi da padel e area ristoro. In pratica la scheda è utile soprattutto a chi cerca un centro completo a Varese, non solo una sala pesi tradizionale.'
    ],
    faqItems: [
      {
        question: 'Che tipo di struttura è Acinque Ice Arena secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta Acinque Ice Arena come centro polisportivo a Varese con aree dedicate a ghiaccio, acqua, fitness e padel.'
      },
      {
        question: 'Perché questa scheda non va letta come semplice palestra fitness?',
        answer:
          'Perché il sito ufficiale descrive il complesso come palaghiaccio 2.0 e centro sportivo completo. Il fitness è una delle aree presenti, ma non esaurisce l’identità della struttura.'
      },
      {
        question: 'Che cosa viene citato per l’area fitness di Acinque Ice Arena?',
        answer:
          'La pagina fitness parla di una sala attrezzi rinnovata da 400 m² con macchinari Technogym, area funzionale e programmi personalizzati seguiti da trainer qualificati.'
      },
      {
        question: 'Quali contatti ufficiali sono indicati per Acinque Ice Arena?',
        answer:
          'Il sito ufficiale riporta il numero 0332 1575576, la mail generale info@acinqueicearena.com e contatti separati per ghiaccio, acqua, fitness e padel.'
      }
    ]
  },
  'Studio Dr. Massimo Sartorello - Chinesiologo clinico - Personal Trainer a Saronno': {
    sourceUrl: 'https://www.massimosartorello.studio/',
    seoTitle: 'Massimo Sartorello Saronno: chinesiologo clinico e personal trainer',
    seoDescription:
      'Studio Dr. Massimo Sartorello a Saronno: chinesiologia clinica, personal training, nutrizione, Welcome Session da 45€ e approccio su misura.',
    website: 'https://www.massimosartorello.studio/',
    infoCards: [
      {
        label: 'Profilo',
        value: 'Chinesiologo clinico e Personal Trainer',
        body: 'Il sito ufficiale presenta Massimo Sartorello come professionista con approccio clinico, non come palestra tradizionale o studio generalista.'
      },
      {
        label: 'Metodo',
        value: 'Movimento + nutrizione + prevenzione',
        body: 'La home insiste sull’integrazione tra chinesiologia, nutrizione clinica e sportiva e lavoro sul benessere nel lungo periodo.'
      },
      {
        label: 'Prima sessione',
        value: 'Welcome Session 45€',
        body: 'La FAQ spiega che la prima sessione dura 75 minuti tra check-up, test e allenamento personalizzato; se inizi un percorso entro 72 ore, l’importo viene scalato.'
      },
      {
        label: 'Sedute',
        value: '50 min + 5/10 min finali',
        body: 'La FAQ ufficiale indica 50 minuti effettivi di coaching, più breve chiusura per feedback e aggiornamento del programma.'
      }
    ],
    presentation:
      'Lo studio del Dr. Massimo Sartorello a Saronno è presentato dal sito ufficiale come spazio privato dedicato a chinesiologia clinica, personal training e nutrizione, con un approccio costruito su valutazione iniziale, programma su misura e lavoro integrato sulla salute fisica.',
    highlights: [
      'La home non comunica una palestra commerciale, ma uno studio privato dove movimento clinico, postura, ricomposizione corporea e salute metabolica vengono trattati in modo integrato. Questo è il punto giusto da capire subito leggendo la scheda.',
      'La pagina about mette in evidenza doppia laurea magistrale, esperienza pluriennale e un profilo che unisce chinesiologia clinica, allenamento adattato e nutrizione umana. Quindi il valore dichiarato non è il volume di corsi, ma la competenza specialistica.',
      'La sezione personal training descrive percorsi per dimagrimento, forza, postura, benessere psicofisico, allenamento adattato e schede personalizzate. È una proposta più vicina a consulenza e lavoro individuale che a frequenza libera da palestra tradizionale.',
      'La FAQ ufficiale chiarisce anche la struttura commerciale: Welcome Session da 45€, nessun costo nascosto, percorsi costruiti in base a persone, frequenza e durata. Questo rende la scheda più utile per chi vuole capire metodo e impostazione prima del contatto.'
    ],
    faqItems: [
      {
        question: 'Che tipo di struttura è lo studio di Massimo Sartorello secondo il sito ufficiale?',
        answer:
          'Il sito ufficiale presenta lo studio come spazio privato a Saronno dedicato a chinesiologia clinica, personal training e nutrizione, con approccio individuale e non da palestra commerciale.'
      },
      {
        question: 'Come funziona la prima sessione con Massimo Sartorello?',
        answer:
          'La FAQ ufficiale parla di una Welcome Session da 75 minuti con check-up, test di mobilità e forza e allenamento personalizzato al costo di 45 euro; se inizi un percorso entro 72 ore, l’importo viene scalato dal pacchetto.'
      },
      {
        question: 'Quanto dura una seduta standard nello studio di Saronno?',
        answer:
          'La FAQ indica 50 minuti effettivi di coaching, seguiti da 5-10 minuti per feedback e aggiornamento del programma.'
      },
      {
        question: 'Quali obiettivi vengono messi in evidenza nel sito di Massimo Sartorello?',
        answer:
          'Le pagine ufficiali citano dimagrimento, postura, forza, massa muscolare, benessere psicofisico, recupero dopo infortuni e percorsi integrati con nutrizione clinica e sportiva.'
      }
    ]
  }
};

export function officialGymOverride(gym) {
  const name = fixGymText(gym?.name || '');
  return OFFICIAL_GYM_OVERRIDES[name] || null;
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
  const hasIndexingSignal = hasCoordinates || hasContactSignal || hasUsableHours;

  return Boolean(name && address && disciplines.length > 0 && hasIndexingSignal);
}





