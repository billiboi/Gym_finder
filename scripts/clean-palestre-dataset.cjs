const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourcePath = path.join(root, 'static', 'palestre.csv');
const outputPaths = [
  path.join(root, 'static', 'palestre.csv'),
  path.join(root, 'data', 'palestre.csv')
];
const backupPaths = [
  path.join(root, 'data', 'palestre_backup_1027.csv'),
  path.join(root, 'data', 'palestre_backup_1027_data.csv')
];
const jsonPath = path.join(root, 'data', 'gyms.json');

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isPersonLike(name) {
  const cleaned = normalizeSpace(String(name || '').replace(/[^A-Za-zÀ-ÿ' -]/g, ' '));
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  const lower = cleaned.toLowerCase();
  if (/(fitness|gym|club|studio|lab|training|wellness|dojo|academy|crossfit|pilates|yoga|box|mma|judo|karate|team|body|sport|center|centre|school|arti marziali)/.test(lower)) {
    return false;
  }
  return parts.every((part) => /^[A-ZÀ-Ý][a-zà-ÿ'’-]+$/.test(part));
}

function shouldExclude(record) {
  const text = `${record.name} ${record.website}`.toLowerCase();
  const badTerms = [
    'scuola',
    'istituto',
    'oratorio',
    'calcio',
    'football',
    'basket',
    'rugby',
    'hockey',
    'golf',
    'tennis',
    'padel',
    'softair',
    'airsoft',
    'campo sportivo',
    'campo di calcio',
    'campo di calcetto',
    'stadio',
    'atletica',
    'run ',
    'running club',
    'stand up paddle',
    'costruzione piscine',
    'acquapark',
    'boulder',
    'arrampicata',
    'shop',
    'abbigliamento',
    'accessori moto',
    'cinofilo',
    'hotel',
    'resort',
    'bowling',
    '11teamsports',
    'moda',
    'coach italia',
    'danza',
    'dance',
    'zumba',
    'caraib',
    'tango',
    'bachata',
    'kizomba',
    'hip hop',
    'public fitness',
    'öffentliche fitnessgeräte',
    'parco fitness',
    'parco calistenico',
    'fitness all\'aperto',
    'palestra esterna',
    'open air'
  ];

  if (badTerms.some((term) => text.includes(term))) return true;

  if (isPersonLike(record.name) && !/(studio|lab|fitness|gym|training|pilates|yoga|wellness)/i.test(record.name)) {
    return true;
  }

  if (/personal trainer|life coach|coach nutriz|massag|holistic/.test(text) && !/(studio|gym|fitness|training lab|personal studio)/.test(text)) {
    return true;
  }

  if (/associazione|polisportiva|uisp/.test(text) && !/(dojo|martial|judo|karate|mma|box|kick|muay|kung|aikido|taekwondo|fitness|gym|club|training)/.test(text)) {
    return true;
  }

  if (record.primaryDiscipline === 'Fitness' && /centro sportivo|sport club|sporting|polisport|club house/.test(text) && !/(fitness|gym|wellness|club fitness)/.test(text)) {
    return true;
  }

  if (record.primaryDiscipline === 'Fitness' && /acqua|swim|piscina/.test(text) && !/fitness/.test(text)) {
    return true;
  }

  if (
    record.primaryDiscipline === 'Fitness' &&
    !record.phone &&
    !record.website &&
    !/(fitness|gym|palestra|club|training|wellness|fit|body|crossfit|functional|pilates|yoga|dojo|academy|studio|lab)/.test(text)
  ) {
    return true;
  }

  return false;
}

function inferDisciplines(record) {
  const text = `${record.name} ${record.website}`.toLowerCase();
  const has = (...parts) => parts.some((part) => text.includes(part));
  const out = [];

  if (has('mma', 'mixed martial')) out.push('MMA');
  if (has('muay thai')) out.push('Muay Thai');
  if (has('k1', 'k-1')) out.push('K1');
  if (has('kickbox', 'kick box')) out.push('Kickboxe');
  if (has('boxing', 'boxe', 'pugil', ' box ')) out.push('Boxe');
  if (has('brazilian jiu', 'bjj')) out.push('Jujitsu Brasiliano');
  if (has('ju-jitsu', 'jujitsu', 'jiu jitsu', 'jiujitsu')) out.push('Jujitsu');
  if (has('judo')) out.push('Judo');
  if (has('karate', 'kyokushin', 'shotokan', 'shito ryu', 'goju ryu', 'wado ryu')) out.push('Karate');
  if (has('aikido')) out.push('Aikido');
  if (has('taekwondo', 'tkd')) out.push('Taekwondo');
  if (has('kempo', 'kenpo', 'difesa personale', 'self defense')) out.push('Difesa Personale');
  if (has('wing chun', 'win chun', 'wing tsun')) out.push('Wing Chun');
  if (has('tai chi')) out.push('Tai Chi');
  if (has('kung fu', 'kungfu', 'choy lay fut', 'shaolin')) out.push('Kung Fu');
  if (has('chanbara')) out.push('Chanbara');
  if (has('scherma', 'fencing')) out.push('Scherma');
  if (has('crossfit', 'hyrox')) out.push('CrossFit');
  if (has('pilates')) out.push('Pilates');
  if (has('yoga')) out.push('Yoga');
  if (has('nuoto', 'swim', 'piscina')) out.push('Nuoto');
  if (has('calisthenics', 'calistenic')) out.push('Calisthenics');
  if (has('functional', 'funzional')) out.push('Functional');
  if (has('bodybuilding')) out.push('Bodybuilding');
  if (has('fitness', 'gym', 'palestra', 'wellness', 'club', 'training', 'personal trainer', 'personal training', 'ems')) {
    out.push('Fitness');
  }

  return [...new Set(out)];
}

function parseRecord(columns, headerIndex) {
  return {
    name: normalizeSpace(columns[headerIndex['nome palestra']]),
    disciplineRaw: normalizeSpace(columns[headerIndex.discipline]),
    address: normalizeSpace(columns[headerIndex.indirizzo]),
    phone: normalizeSpace(columns[headerIndex.telefono]),
    hours: normalizeSpace(columns[headerIndex['orari di apertura']]),
    website: normalizeSpace(columns[headerIndex['pagina web']]),
    lat: normalizeSpace(columns[headerIndex.lat]),
    long: normalizeSpace(columns[headerIndex.long])
  };
}

function chooseDisciplines(record) {
  const existing = record.disciplineRaw
    .split('|')
    .map((item) => normalizeSpace(item))
    .filter(Boolean);

  const inferred = inferDisciplines(record);
  const specificExisting = existing.filter((item) => item && item !== 'Fitness');
  const specificInferred = inferred.filter((item) => item && item !== 'Fitness');

  if (specificInferred.length > 0) {
    return [...new Set(specificInferred)];
  }

  if (specificExisting.length > 0) {
    return [...new Set(specificExisting)];
  }

  if (inferred.length > 0) {
    return [...new Set(inferred)];
  }

  return existing.length > 0 ? existing : ['Fitness'];
}

const raw = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
const header = splitCsvLine(lines[0]).map((item) => item.trim().toLowerCase());
const headerIndex = Object.fromEntries(header.map((item, index) => [item, index]));

if (!headerIndex['nome palestra'] && headerIndex['nome palestra'] !== 0) {
  throw new Error('Header CSV non valido.');
}

for (const backupPath of backupPaths) {
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, raw, 'utf8');
  }
}

const kept = [];
let excluded = 0;
let refined = 0;

for (let i = 1; i < lines.length; i += 1) {
  const columns = splitCsvLine(lines[i]);
  const record = parseRecord(columns, headerIndex);
  record.primaryDiscipline = record.disciplineRaw.split('|')[0]?.trim() || 'Fitness';

  if (!record.name || shouldExclude(record)) {
    excluded += 1;
    continue;
  }

  const disciplines = chooseDisciplines(record);
  if (disciplines.join(' | ') !== record.disciplineRaw) {
    refined += 1;
  }

  kept.push([
    record.name,
    disciplines.join(' | '),
    record.address,
    record.phone,
    record.hours || 'Orari da verificare',
    record.website,
    record.lat,
    record.long
  ]);
}

const output = [
  ['nome palestra', 'discipline', 'indirizzo', 'telefono', 'orari di apertura', 'pagina web', 'lat', 'long'],
  ...kept
]
  .map((row) => row.map(csvEscape).join(','))
  .join('\n');

for (const outputPath of outputPaths) {
  fs.writeFileSync(outputPath, output, 'utf8');
}

const gymsJson = kept.map((row, index) => ({
  id: `csv-${index + 1}`,
  name: row[0],
  discipline: row[1].split('|').map((item) => item.trim()).filter(Boolean)[0] || 'Fitness',
  disciplines: row[1].split('|').map((item) => item.trim()).filter(Boolean),
  address: row[2],
  city: '',
  phone: row[3],
  hours_info: row[4],
  website: row[5],
  latitude: row[6] ? Number(row[6]) : null,
  longitude: row[7] ? Number(row[7]) : null,
  image_url: '',
  weekly_hours: {}
}));

fs.writeFileSync(jsonPath, JSON.stringify(gymsJson, null, 2), 'utf8');

console.log(
  JSON.stringify(
    {
      before: lines.length - 1,
      after: kept.length,
      excluded,
      refined
    },
    null,
    2
  )
);
