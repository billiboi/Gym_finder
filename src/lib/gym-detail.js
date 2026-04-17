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
    presentation:
      'FitActive Mendrisio e una palestra fitness a Mendrisio che, secondo la pagina ufficiale del club, punta su allenamento illimitato, attrezzature cardio e isotoniche di qualita e una proposta pensata per chi vuole una struttura moderna e semplice da usare ogni giorno.',
    highlights: [
      'La pagina ufficiale del club presenta FitActive Mendrisio come una palestra fitness a Mendrisio con accesso illimitato e formula da 49,90 CHF al mese, un messaggio forte per chi sta confrontando prezzo e posizionamento nella zona.',
      'Tra i punti messi in evidenza dal club ci sono attrezzature cardio e isotoniche, utili per chi cerca una sala fitness orientata all allenamento completo piu che a una sola attivita specifica.',
      'Nel materiale ufficiale compaiono anche corsi di gruppo, lampade abbronzanti, bevande energetiche, pedane vibranti e poltrone relax: dettagli che aiutano a capire subito il taglio commerciale e i servizi accessori della struttura.',
      'Per questa sede sono pubblicati anche contatti diretti, email ufficiale e orari di prevendita, quindi la scheda puo rispondere bene sia a chi vuole allenarsi sia a chi vuole chiedere informazioni prima di iscriversi.'
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
          'Si. La pagina ufficiale del club riporta il numero +41 76 424 68 50, l email mendrisio@fitactive.ch e i profili Facebook e Instagram della sede.'
      },
      {
        question: 'Quali orari sono indicati per la prevendita di FitActive Mendrisio?',
        answer:
          'Secondo la pagina ufficiale del club, gli orari di prevendita sono Lun-Ven 10:00-20:00 e Sab 10:00-18:00.'
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


