import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Gym = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/price-enrichment-candidates-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/price-enrichment-candidates-${stamp}.csv`;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseEnvValue(value: string) {
  const trimmed = clean(value);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function hostForUrl(value: unknown) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function csvCell(value: unknown) {
  const text = clean(value).replace(/"/g, '""');
  return /[",;\n\r]/.test(text) ? `"${text}"` : text;
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name);
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function addressOf(gym: Gym) {
  return clean(gym.indirizzo || gym.address);
}

function activeGym(gym: Gym) {
  return !(gym.deleted_at || gym.weekly_hours?._deleted_at);
}

function primaryDiscipline(gym: Gym) {
  if (Array.isArray(gym.disciplines) && gym.disciplines.length) return clean(gym.disciplines[0]);
  return clean(gym.discipline || gym.disciplina_principale || 'Fitness');
}

function hasOwnWebsite(gym: Gym) {
  const websiteHost = hostForUrl(gym.website || gym.sito);
  if (!websiteHost) return false;
  return !/(facebook|instagram|tiktok|linkedin|youtube|google|goo\.gl|wa\.me|linktr|superprof|ticino\.ch|luganoregion\.com)/i.test(
    websiteHost
  );
}

function likelyPricePaths(gym: Gym) {
  const website = clean(gym.website || gym.sito).replace(/\/$/, '');
  if (!website) return [];
  const paths = ['prezzi', 'tariffe', 'abbonamenti', 'costi', 'pricing', 'iscrizioni', 'quote', 'shop'];
  return paths.map((item) => `${website}/${item}`);
}

function priorityScore(gym: Gym) {
  let score = 0;
  const discipline = fold(primaryDiscipline(gym));
  if (/fitness|palestra|pilates|crossfit|yoga|nuoto|padel|judo|karate|boxe|kickboxing|personal/.test(discipline)) score += 30;
  if (hasOwnWebsite(gym)) score += 35;
  if (gym.verified || gym.is_verified || gym.weekly_hours?._verified) score += 15;
  if (!gym.needs_review) score += 10;
  if (clean(gym.phone || gym.telefono)) score += 5;
  if (clean(gym.hours_info || gym.orari)) score += 5;
  return score;
}

await loadEnvFile(path.resolve(envFile));

const supabaseUrl = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !key) throw new Error('Missing Supabase env.');

const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=5000`, {
  method: 'GET',
  headers: headers(key)
});

if (!response.ok) throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);

const rows: Gym[] = await response.json();
const active = rows.filter(activeGym);
const candidates = active
  .filter((gym) => !clean(gym.price_info) && hasOwnWebsite(gym))
  .map((gym) => ({
    id: clean(gym.id),
    slug: clean(gym.slug || gym._canonical_slug),
    nome: nameOf(gym),
    citta: cityOf(gym),
    indirizzo: addressOf(gym),
    disciplina: primaryDiscipline(gym),
    website: clean(gym.website || gym.sito),
    website_host: hostForUrl(gym.website || gym.sito),
    needs_review: Boolean(gym.needs_review),
    review_reason: clean(gym.review_reason),
    priority_score: priorityScore(gym),
    suggested_price_urls: likelyPricePaths(gym).join(' | ')
  }))
  .sort((a, b) => b.priority_score - a.priority_score || a.nome.localeCompare(b.nome, 'it'));

const summary = {
  total_rows: rows.length,
  active_rows: active.length,
  without_price_with_own_website: candidates.length,
  high_priority: candidates.filter((row) => row.priority_score >= 70).length,
  medium_priority: candidates.filter((row) => row.priority_score >= 50 && row.priority_score < 70).length,
  low_priority: candidates.filter((row) => row.priority_score < 50).length
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(
  jsonOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      env_file: envFile,
      table,
      summary,
      rows: candidates
    },
    null,
    2
  )
);

const header = [
  'id',
  'slug',
  'nome',
  'citta',
  'indirizzo',
  'disciplina',
  'website',
  'website_host',
  'needs_review',
  'review_reason',
  'priority_score',
  'suggested_price_urls'
];

await writeFile(csvOut, [header.join(';'), ...candidates.map((row) => header.map((key) => csvCell(row[key as keyof typeof row])).join(';'))].join('\n'));

console.log(
  JSON.stringify(
    {
      jsonOut,
      csvOut,
      summary,
      top_20: candidates.slice(0, 20).map((row) => ({
        id: row.id,
        nome: row.nome,
        citta: row.citta,
        disciplina: row.disciplina,
        priority_score: row.priority_score,
        website: row.website
      }))
    },
    null,
    2
  )
);
