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

const OFFICIAL_GYM_OVERRIDES = {
  'FitActive Mendrisio': {
    sourceUrl: 'https://www.fitactive.it/i-club/Mendrisio.php',
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
  'NonStop Gym Lugano (The CLUB GetFIT)': {
    sourceUrl: 'https://www.nonstopgym.com/nostri-club/lugano/',
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





