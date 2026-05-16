const DISCIPLINE_DEFINITIONS = [
  {
    name: 'Fitness',
    slug: 'fitness',
    description: 'Palestre generaliste, sala attrezzi e attivita fitness non specialistiche.',
    aliases: ['Fitnes', 'Fitness ! Bodybuilding', 'Palestra', 'Sport']
  },
  {
    name: 'Personal Training',
    slug: 'personal-training',
    description: 'Percorsi individuali o semi-individuali con trainer qualificato.',
    aliases: ['Personal Trainer', 'PT', 'Allenamento personale']
  },
  {
    name: 'Functional Training',
    slug: 'functional-training',
    description: 'Allenamento funzionale, circuiti e preparazione fisica generale.',
    aliases: ['Functional', 'Ginnastica Funzionale', 'Allenamento funzionale', 'Functional Fitness']
  },
  {
    name: 'GAG',
    slug: 'gag',
    description: 'Corsi gambe, addominali e glutei.',
    aliases: ['G.a.g', 'G.A.G.', 'Gambe Addominali Glutei']
  },
  {
    name: 'HIIT',
    slug: 'hiit',
    description: 'Allenamento intervallato ad alta intensita.',
    aliases: ['Hiit', 'High Intensity Interval Training']
  },
  {
    name: 'TRX',
    slug: 'trx',
    description: 'Allenamento in sospensione con TRX o attrezzi analoghi.',
    aliases: ['Trx', 'Suspension Training']
  },
  {
    name: 'EMS Training',
    slug: 'ems-training',
    description: 'Allenamento con elettrostimolazione muscolare.',
    aliases: ['Ems', 'EMS', 'Elettrostimolazione']
  },
  {
    name: 'Cross Training',
    slug: 'cross-training',
    description: 'Allenamento incrociato non affiliato CrossFit.',
    aliases: ['Crosstraining', 'Cross-Training', 'Cross training']
  },
  {
    name: 'CrossFit',
    slug: 'crossfit',
    description: 'Box e palestre affiliate o dichiaratamente focalizzate su CrossFit.',
    aliases: ['Cross Fit']
  },
  {
    name: 'Bodybuilding',
    slug: 'bodybuilding',
    description: 'Allenamento orientato a ipertrofia, pesi liberi e macchine isotoniche.',
    aliases: ['Body Building']
  },
  {
    name: 'Calisthenics',
    slug: 'calisthenics',
    description: 'Allenamento a corpo libero, skill e forza relativa.',
    aliases: ['Calistenics', 'Street Workout']
  },
  {
    name: 'Yoga',
    slug: 'yoga',
    description: 'Corsi e centri yoga, inclusi stili tradizionali e contemporanei.',
    aliases: ['Kundalini Yoga', 'Hatha Yoga', 'Vinyasa Yoga']
  },
  {
    name: 'Pilates',
    slug: 'pilates',
    description: 'Pilates matwork, reformer e percorsi posturali collegati.',
    aliases: ['Pilates Reformer', 'Mat Pilates']
  },
  {
    name: 'Nuoto',
    slug: 'nuoto',
    description: 'Piscine, corsi di nuoto e attivita acquatiche.',
    aliases: ['Swimming', 'Swim']
  },
  {
    name: 'Boxe',
    slug: 'boxe',
    description: 'Palestre e corsi di pugilato.',
    aliases: ['Boxing', 'Pugilato']
  },
  {
    name: 'Kickboxing',
    slug: 'kickboxing',
    description: 'Sport da combattimento con tecniche di pugno e calcio.',
    aliases: ['Kickboxe', 'Kick Boxing', 'Kick-boxing']
  },
  {
    name: 'Muay Thai',
    slug: 'muay-thai',
    description: 'Boxe thailandese e discipline da striking collegate.',
    aliases: ['Thai Boxe', 'Thaiboxe']
  },
  {
    name: 'K1',
    slug: 'k1',
    description: 'Disciplina da ring con regolamento K1.',
    aliases: ['K-1']
  },
  {
    name: 'MMA',
    slug: 'mma',
    description: 'Mixed Martial Arts, combattimento misto e preparazione collegata.',
    aliases: ['Mixed Martial Arts']
  },
  {
    name: 'Brazilian Jiu Jitsu',
    slug: 'brazilian-jiu-jitsu',
    description: 'Brazilian Jiu Jitsu e grappling con kimono o no-gi.',
    aliases: ['BJJ', 'Brazilian Jiujitsu', 'Brazilian Jujitsu', 'Jujitsu Brasiliano', 'Jiu Jitsu Brasiliano', 'Ju Jitsu Brasiliano']
  },
  {
    name: 'Jujitsu',
    slug: 'jujitsu',
    description: 'Jujitsu tradizionale e sistemi affini non specificamente brasiliani.',
    aliases: ['Jiujitsu', 'Jiu Jitsu', 'Ju Jitsu', 'Jiu-Jitsu', 'Ju-Jitsu']
  },
  {
    name: 'Grappling',
    slug: 'grappling',
    description: 'Lotta, submission grappling e discipline di controllo a terra.',
    aliases: ['Wrestling', 'Lotta', 'Submission Grappling']
  },
  {
    name: 'Judo',
    slug: 'judo',
    description: 'Dojo e corsi di judo.',
    aliases: ['Jodo']
  },
  {
    name: 'Karate',
    slug: 'karate',
    description: 'Dojo e scuole di karate, inclusi stili specifici.',
    aliases: ['Kyokushin', 'Shito Ryu', 'Wa Rei Ryu']
  },
  {
    name: 'Taekwondo',
    slug: 'taekwondo',
    description: 'Corsi e societa di taekwondo.',
    aliases: []
  },
  {
    name: 'Aikido',
    slug: 'aikido',
    description: 'Dojo e corsi di aikido.',
    aliases: []
  },
  {
    name: 'Krav Maga',
    slug: 'krav-maga',
    description: 'Sistema di difesa personale Krav Maga.',
    aliases: ['Kravmagà', 'Kravmaga']
  },
  {
    name: 'Difesa Personale',
    slug: 'difesa-personale',
    description: 'Corsi di autodifesa e sicurezza personale.',
    aliases: ['Self Defense', 'Autodifesa', 'Difesa Personae']
  },
  {
    name: 'Arti Marziali',
    slug: 'arti-marziali',
    description: 'Categoria generale da usare solo quando la disciplina specifica non e chiara.',
    aliases: ['Martial Arts']
  },
  {
    name: 'Kung Fu',
    slug: 'kung-fu',
    description: 'Scuole di kung fu e arti marziali cinesi.',
    aliases: ['Kungfu', 'Choy Lay Fut', 'Choy Lee Fut']
  },
  {
    name: 'Wing Chun',
    slug: 'wing-chun',
    description: 'Scuole di Wing Chun.',
    aliases: ['Win Chun', 'Win Chung', 'Ving Tsun']
  },
  {
    name: 'Tai Chi',
    slug: 'tai-chi',
    description: 'Tai Chi, Taiji Quan e pratiche affini.',
    aliases: ['Taiji', 'Taiji Quan', 'Tai Chi Chuan']
  },
  {
    name: 'Scherma',
    slug: 'scherma',
    description: 'Scherma sportiva e corsi collegati.',
    aliases: ['Fencing']
  },
  {
    name: 'Chanbara',
    slug: 'chanbara',
    description: 'Sport chanbara e discipline con armi imbottite.',
    aliases: []
  },
  {
    name: 'Iaido',
    slug: 'iaido',
    description: 'Arte marziale giapponese focalizzata sull estrazione della spada.',
    aliases: ['Iado', 'Laido']
  },
  {
    name: 'Ginnastica Artistica',
    slug: 'ginnastica-artistica',
    description: 'Corsi e societa di ginnastica artistica.',
    aliases: []
  },
  {
    name: 'Ginnastica Ritmica',
    slug: 'ginnastica-ritmica',
    description: 'Corsi e societa di ginnastica ritmica.',
    aliases: ['Ginnastica Ritimica']
  },
  {
    name: 'Basket',
    slug: 'basket',
    description: 'Basket e pallacanestro.',
    aliases: ['Basketball']
  },
  {
    name: 'Calcio',
    slug: 'calcio',
    description: 'Calcio, scuole calcio e preparazione collegata.',
    aliases: ['Football', 'Soccer']
  },
  {
    name: 'Padel',
    slug: 'padel',
    description: 'Centri e campi da padel.',
    aliases: []
  },
  {
    name: 'Pattinaggio',
    slug: 'pattinaggio',
    description: 'Pattinaggio e skating.',
    aliases: ['Skating', 'Roller']
  },
  {
    name: 'Golf',
    slug: 'golf',
    description: 'Golf club e corsi collegati.',
    aliases: []
  },
  {
    name: 'Hockey',
    slug: 'hockey',
    description: 'Hockey e attivita collegate.',
    aliases: []
  },
  {
    name: 'Goshindo',
    slug: 'goshindo',
    description: 'Scuole e corsi di Goshindo.',
    aliases: []
  }
];

export const EXCLUDED_DISCIPLINE_ALIASES = new Set([
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

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function fixDisciplineText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function foldDisciplineKey(value) {
  return fixDisciplineText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|/]+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function slugifyDiscipline(value) {
  return foldDisciplineKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const DISCIPLINE_MASTER = DISCIPLINE_DEFINITIONS.map((definition, index) => ({
  id: definition.slug,
  ordine: index + 1,
  ...definition
}));

const aliasIndex = new Map();
const slugIndex = new Map();

for (const discipline of DISCIPLINE_MASTER) {
  const canonicalFolded = foldDisciplineKey(discipline.name);
  aliasIndex.set(canonicalFolded, {
    name: discipline.name,
    slug: discipline.slug,
    matchedAlias: '',
    isKnown: true
  });
  slugIndex.set(discipline.slug, discipline);

  for (const alias of discipline.aliases) {
    const aliasFolded = foldDisciplineKey(alias);
    if (aliasFolded === canonicalFolded) continue;

    aliasIndex.set(aliasFolded, {
      name: discipline.name,
      slug: discipline.slug,
      matchedAlias: alias,
      isKnown: true
    });
    slugIndex.set(slugifyDiscipline(alias), discipline);
  }
}

export const DISCIPLINE_ALIAS_ROWS = DISCIPLINE_MASTER.flatMap((discipline) =>
  discipline.aliases.map((alias) => ({
    alias,
    alias_slug: slugifyDiscipline(alias),
    discipline_slug: discipline.slug,
    discipline_name: discipline.name
  }))
);

export function canonicalizeDiscipline(value) {
  const fixed = fixDisciplineText(value);
  if (!fixed) return null;

  const folded = foldDisciplineKey(fixed);
  if (!folded || EXCLUDED_DISCIPLINE_ALIASES.has(folded)) return null;

  const exact = aliasIndex.get(folded);
  if (exact) return exact;

  return {
    name: titleCase(folded),
    slug: slugifyDiscipline(folded),
    matchedAlias: '',
    isKnown: false
  };
}

export function canonicalDisciplineName(value) {
  return canonicalizeDiscipline(value)?.name || '';
}

export function normalizeDisciplinesWithAliases(values, fallback = []) {
  const source = Array.isArray(values)
    ? values
    : String(values || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
  const fallbackSource = Array.isArray(fallback)
    ? fallback
    : String(fallback || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
  const output = new Map();
  const aliases = [];

  for (const value of source) {
    const canonical = canonicalizeDiscipline(value);
    if (!canonical) continue;

    if (!output.has(canonical.slug)) {
      output.set(canonical.slug, canonical.name);
    }

    const raw = fixDisciplineText(value);
    if (canonical.matchedAlias || foldDisciplineKey(raw) !== foldDisciplineKey(canonical.name)) {
      aliases.push({
        input: raw,
        canonical: canonical.name,
        canonical_slug: canonical.slug
      });
    }
  }

  const slugs = [...output.keys()];
  const disciplines = [...output.values()];
  if (disciplines.length) {
    return { disciplines, aliases, slugs };
  }

  return normalizeDisciplinesWithAliases(fallbackSource.length ? fallbackSource : ['Fitness'], []);
}

export function getDisciplineBySlug(slug) {
  return slugIndex.get(slugifyDiscipline(slug)) || null;
}

export function isDisciplineAliasSlug(slug) {
  const normalized = slugifyDiscipline(slug);
  const discipline = slugIndex.get(normalized);
  return Boolean(discipline && discipline.slug !== normalized);
}

export function canonicalSlugForDisciplineSlug(slug) {
  return getDisciplineBySlug(slug)?.slug || '';
}
