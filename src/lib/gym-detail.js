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

export function disciplineImageDataUri(discipline) {
  const styleMap = {
    Boxe: { bg: '#7f1d1d', fg: '#fee2e2', icon: 'BOX' },
    Kickboxe: { bg: '#9a3412', fg: '#ffedd5', icon: 'KBX' },
    'Muay Thai': { bg: '#7c2d12', fg: '#ffedd5', icon: 'MT' },
    K1: { bg: '#991b1b', fg: '#fee2e2', icon: 'K1' },
    MMA: { bg: '#1e293b', fg: '#e2e8f0', icon: 'MMA' },
    Judo: { bg: '#0f172a', fg: '#e2e8f0', icon: 'JUD' },
    JiuJitsu: { bg: '#0b3b2e', fg: '#dcfce7', icon: 'BJJ' },
    'JiuJitsu Brasiliano': { bg: '#14532d', fg: '#dcfce7', icon: 'BJJ' },
    Karate: { bg: '#374151', fg: '#f3f4f6', icon: 'KAR' },
    Taekwondo: { bg: '#0f766e', fg: '#ccfbf1', icon: 'TKD' },
    Aikido: { bg: '#1d4ed8', fg: '#dbeafe', icon: 'AIK' },
    'Kung Fu': { bg: '#7c2d12', fg: '#ffedd5', icon: 'KF' },
    'Wing Chun': { bg: '#4c1d95', fg: '#ede9fe', icon: 'WC' },
    'Tai Chi': { bg: '#134e4a', fg: '#ccfbf1', icon: 'TC' },
    Scherma: { bg: '#475569', fg: '#f1f5f9', icon: 'SCH' },
    Chanbara: { bg: '#312e81', fg: '#e0e7ff', icon: 'CHN' },
    'Difesa Personale': { bg: '#334155', fg: '#e2e8f0', icon: 'SELF' },
    CrossFit: { bg: '#1e3a8a', fg: '#dbeafe', icon: 'CF' },
    Pilates: { bg: '#6d28d9', fg: '#ede9fe', icon: 'PIL' },
    Yoga: { bg: '#0f766e', fg: '#ccfbf1', icon: 'YOG' },
    Nuoto: { bg: '#075985', fg: '#e0f2fe', icon: 'SWM' },
    Calisthenics: { bg: '#4b5563', fg: '#f3f4f6', icon: 'CAL' },
    Functional: { bg: '#334155', fg: '#e2e8f0', icon: 'FUN' },
    Bodybuilding: { bg: '#111827', fg: '#f9fafb', icon: 'BB' },
    Fitness: { bg: '#1f2937', fg: '#f3f4f6', icon: 'FIT' }
  };

  const style = styleMap[discipline] || styleMap.Fitness;
  const title = String(discipline || 'Fitness')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="${style.bg}"/><circle cx="1040" cy="120" r="220" fill="rgba(255,255,255,0.08)"/><circle cx="180" cy="560" r="240" fill="rgba(255,255,255,0.06)"/><text x="80" y="300" fill="${style.fg}" font-size="58" font-family="Arial, sans-serif" font-weight="700">${title}</text><text x="80" y="390" fill="${style.fg}" font-size="112">${style.icon}</text><text x="80" y="455" fill="${style.fg}" font-size="34" opacity="0.8">Gym Finder</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function imageForGym(gym) {
  if (gym?.image_url && String(gym.image_url).startsWith('/uploads/')) {
    return gym.image_url;
  }
  return disciplineImageDataUri(primaryDisciplineForGym(gym));
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
