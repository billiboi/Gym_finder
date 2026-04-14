const EXACT_LABELS = new Map([
  ['mma', 'MMA'],
  ['k1', 'K1'],
  ['bjj', 'Jujitsu Brasiliano'],
  ['jiujitsu', 'Jujitsu'],
  ['jujitsu', 'Jujitsu'],
  ['jiu jitsu', 'Jujitsu'],
  ['ju jitsu', 'Jujitsu'],
  ['jiu-jitsu', 'Jujitsu'],
  ['ju-jitsu', 'Jujitsu'],
  ['jiujitsu brasiliano', 'Jujitsu Brasiliano'],
  ['jujitsu brasiliano', 'Jujitsu Brasiliano'],
  ['brazilian jiu jitsu', 'Jujitsu Brasiliano'],
  ['kick boxing', 'Kickboxe'],
  ['kickboxing', 'Kickboxe'],
  ['kickboxe', 'Kickboxe'],
  ['muay thai', 'Muay Thai'],
  ['tai chi', 'Tai Chi'],
  ['wing chun', 'Wing Chun'],
  ['win chun', 'Wing Chun'],
  ['win chung', 'Wing Chun'],
  ['kungfu', 'Kung Fu'],
  ['kung fu', 'Kung Fu'],
  ['crossfit', 'CrossFit'],
  ['body building', 'Bodybuilding'],
  ['bodybuilding', 'Bodybuilding'],
  ['self defense', 'Difesa Personale'],
  ['difesa personale', 'Difesa Personale'],
  ['difesa personae', 'Difesa Personale'],
  ['arti marziali', 'Arti Marziali'],
  ['functional', 'Functional'],
  ['calisthenics', 'Calisthenics'],
  ['pilates', 'Pilates'],
  ['fitness', 'Fitness'],
  ['yoga', 'Yoga'],
  ['nuoto', 'Nuoto'],
  ['wrestling', 'Grappling'],
  ['lotta', 'Grappling'],
  ['grappling', 'Grappling'],
  ['basket', 'Basket'],
  ['basketball', 'Basket'],
  ['calcio', 'Calcio'],
  ['football', 'Calcio'],
  ['soccer', 'Calcio'],
  ['pattinaggio', 'Pattinaggio'],
  ['skating', 'Pattinaggio'],
  ['scherma', 'Scherma'],
  ['fencing', 'Scherma'],
  ['chanbara', 'Chanbara'],
  ['taekwondo', 'Taekwondo'],
  ['aikido', 'Aikido'],
  ['judo', 'Judo'],
  ['jodo', 'Judo'],
  ['karate', 'Karate'],
  ['kyokushin', 'Karate'],
  ['shito ryu', 'Karate'],
  ['wa rei ryu', 'Karate'],
  ['boxe', 'Boxe'],
  ['boxing', 'Boxe'],
  ['ginnastica artistica', 'Ginnastica Artistica'],
  ['ginnastica ritimica', 'Ginnastica Ritmica'],
  ['ginnastica ritmica', 'Ginnastica Ritmica'],
  ['hip hop', 'Hip Hop'],
  ['goshindo', 'Goshindo'],
  ['golf', 'Golf'],
  ['hockey', 'Hockey'],
  ['laido', 'Iaido'],
  ['iaido', 'Iaido']
]);

const EXCLUDED_DISCIPLINES = new Set([
  'hip hop',
  'tango',
  'balli caraibici',
  'caraibico',
  'caraibici',
  'salsa',
  'bachata',
  'kizomba',
  'zumba',
  'danza',
  'danza classica',
  'danza moderna',
  'danza contemporanea',
  'danza sportiva',
  'breakdance'
]);

function fixMojibake(value) {
  let text = String(value || '').trim();
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

function foldDiscipline(value) {
  return fixMojibake(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|/]+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeDisciplineLabel(value) {
  const fixed = fixMojibake(value);
  if (!fixed) return '';

  const folded = foldDiscipline(fixed);
  if (!folded) return '';

  if (EXCLUDED_DISCIPLINES.has(folded)) return '';

  const exact = EXACT_LABELS.get(folded);
  if (exact) return exact;

  if (/(^|\s)jiu ?jitsu brasiliano($|\s)/i.test(folded) || /(^|\s)bjj($|\s)/i.test(folded)) {
    return 'Jujitsu Brasiliano';
  }
  if (/(^|\s)jiu ?jitsu($|\s)|(^|\s)ju ?jitsu($|\s)/i.test(folded)) {
    return 'Jujitsu';
  }
  if (/(^|\s)wrestling($|\s)|(^|\s)lotta($|\s)|(^|\s)grappling($|\s)/i.test(folded)) {
    return 'Grappling';
  }
  if (/(^|\s)kick ?boxing?($|\s)|(^|\s)kickboxe($|\s)/i.test(folded)) {
    return 'Kickboxe';
  }
  if (/(^|\s)muay ?thai($|\s)/i.test(folded)) {
    return 'Muay Thai';
  }
  if (/(^|\s)mma($|\s)|mixed martial arts/i.test(folded)) {
    return 'MMA';
  }
  if (/(^|\s)boxing($|\s)|(^|\s)boxe($|\s)/i.test(folded)) {
    return 'Boxe';
  }
  if (/(^|\s)kyokushin($|\s)|(^|\s)shito ryu($|\s)|(^|\s)wa rei ryu($|\s)|(^|\s)karate($|\s)/i.test(folded)) {
    return 'Karate';
  }
  if (/(^|\s)wing chun($|\s)|(^|\s)win chun($|\s)|(^|\s)win chung($|\s)/i.test(folded)) {
    return 'Wing Chun';
  }
  if (/(^|\s)kung fu($|\s)|(^|\s)choy($|\s)/i.test(folded)) {
    return 'Kung Fu';
  }

  return titleCase(folded);
}

export function dedupeDisciplines(values) {
  const map = new Map();

  for (const value of values || []) {
    const normalized = normalizeDisciplineLabel(value);
    if (!normalized) continue;

    const key = foldDiscipline(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }

  return [...map.values()].sort((a, b) => a.localeCompare(b, 'it'));
}
