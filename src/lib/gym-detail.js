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

export function placeholderImageForDiscipline(discipline) {
  const normalized = normalizeDisciplineLabel(discipline) || 'Fitness';
  const map = {
    Boxe: '/images/placeholders/boxe.svg',
    Kickboxe: '/images/placeholders/kickboxe.svg',
    'Muay Thai': '/images/placeholders/muay-thai.svg',
    K1: '/images/placeholders/kickboxe.svg',
    MMA: '/images/placeholders/mma.svg',
    Judo: '/images/placeholders/judo.svg',
    JiuJitsu: '/images/placeholders/grappling.svg',
    'JiuJitsu Brasiliano': '/images/placeholders/grappling.svg',
    Karate: '/images/placeholders/karate.svg',
    Taekwondo: '/images/placeholders/karate.svg',
    Aikido: '/images/placeholders/karate.svg',
    'Kung Fu': '/images/placeholders/kung-fu.svg',
    'Wing Chun': '/images/placeholders/kung-fu.svg',
    'Tai Chi': '/images/placeholders/kung-fu.svg',
    Scherma: '/images/placeholders/karate.svg',
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
    JiuJitsu: '/images/stock/grappling',
    'JiuJitsu Brasiliano': '/images/stock/grappling',
    Karate: '/images/stock/karate',
    Taekwondo: '/images/stock/karate',
    Aikido: '/images/stock/karate',
    'Kung Fu': '/images/stock/kung-fu',
    'Wing Chun': '/images/stock/kung-fu',
    'Tai Chi': '/images/stock/kung-fu',
    Scherma: '/images/stock/karate',
    Chanbara: '/images/stock/karate',
    'Difesa Personale': '/images/stock/difesa-personale',
    'Arti Marziali': '/images/stock/mma',
    CrossFit: '/images/stock/functional',
    Pilates: '/images/stock/wellness',
    Yoga: '/images/stock/wellness',
    Nuoto: '/images/stock/nuoto',
    Calisthenics: '/images/stock/functional',
    Functional: '/images/stock/functional',
    Bodybuilding: '/images/stock/fitness',
    Fitness: '/images/stock/fitness'
  };

  return map[normalized] || '/images/stock/fitness';
}

export function stockImageCandidatesForDiscipline(discipline) {
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
