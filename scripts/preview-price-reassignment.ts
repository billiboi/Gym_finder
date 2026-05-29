import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Gym = Record<string, any>;
type Action = 'keep' | 'move_to_target' | 'clear_or_review' | 'manual_review';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/price-reassignment-preview-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/price-reassignment-preview-${stamp}.csv`;

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

function hostsMatch(left: string, right: string) {
  return Boolean(left && right && (left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)));
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

function reviewReasonBlocksPrice(reason: unknown) {
  return /brand_mismatch|city_mismatch|source_domain_mismatch|address_mismatch|branch_mismatch|quick_check_city_mismatch/i.test(
    clean(reason)
  );
}

function domainEvidence(gym: Gym) {
  return [gym.website, gym.sito, gym.official_source_url, gym.source_url]
    .map(hostForUrl)
    .filter(Boolean);
}

function priceSourceIsOwn(gym: Gym) {
  const priceHost = hostForUrl(gym.price_source_url);
  return Boolean(priceHost && domainEvidence(gym).some((host) => hostsMatch(priceHost, host)));
}

function tokens(value: unknown) {
  return fold(value)
    .split(/[^a-z0-9]+/g)
    .filter((part) => part.length >= 4 && !['palestra', 'fitness', 'centro', 'studio', 'club', 'sport'].includes(part));
}

function scoreCandidate(source: Gym, target: Gym) {
  if (source.id === target.id) return 0;
  const priceHost = hostForUrl(source.price_source_url);
  if (!priceHost) return 0;

  let score = 0;
  const targetHosts = domainEvidence(target);
  if (targetHosts.some((host) => hostsMatch(priceHost, host))) score += 70;

  const sourceUrlText = fold(source.price_source_url);
  const targetNameTokens = tokens(nameOf(target));
  const sourcePriceText = fold(source.price_info);
  score += Math.min(15, targetNameTokens.filter((token) => sourceUrlText.includes(token) || sourcePriceText.includes(token)).length * 5);

  const targetCity = fold(cityOf(target));
  if (targetCity && (sourceUrlText.includes(targetCity) || sourcePriceText.includes(targetCity))) score += 10;

  const targetAddressTokens = tokens(addressOf(target));
  score += Math.min(5, targetAddressTokens.filter((token) => sourceUrlText.includes(token) || sourcePriceText.includes(token)).length * 2);

  return score;
}

function classifyPrice(source: Gym, candidates: Gym[]) {
  const hasPrice = Boolean(clean(source.price_info));
  const hasPriceSource = Boolean(hostForUrl(source.price_source_url));
  const ownSource = priceSourceIsOwn(source);
  const blockedReason = reviewReasonBlocksPrice(source.review_reason);

  if (!hasPrice) {
    return { action: 'manual_review' as Action, risk: 'medium', reason: 'Nessun prezzo da valutare.', target: null as Gym | null };
  }

  if (hasPriceSource && ownSource && !blockedReason) {
    return { action: 'keep' as Action, risk: 'low', reason: 'Fonte prezzo coerente con sito/fonte della scheda.', target: null as Gym | null };
  }

  const ranked = candidates
    .map((target) => ({ target, score: scoreCandidate(source, target) }))
    .filter((item) => item.score >= 70)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 1 || (ranked[0] && ranked[0].score >= 85 && ranked[0].score - (ranked[1]?.score || 0) >= 20)) {
    return {
      action: 'move_to_target' as Action,
      risk: ranked[0].score >= 85 ? 'medium' : 'high',
      reason: `Fonte prezzo piu coerente con un'altra scheda del catalogo (score ${ranked[0].score}).`,
      target: ranked[0].target
    };
  }

  if (ranked.length > 1) {
    return {
      action: 'manual_review' as Action,
      risk: 'high',
      reason: `Piu destinazioni possibili per la stessa fonte prezzo (${ranked.length} candidate).`,
      target: ranked[0].target
    };
  }

  return {
    action: 'clear_or_review' as Action,
    risk: 'high',
    reason: hasPriceSource
      ? 'Fonte prezzo non riconducibile a questa scheda ne a una destinazione univoca nel catalogo.'
      : 'Prezzo senza URL fonte valido.',
    target: null as Gym | null
  };
}

function csvCell(value: unknown) {
  const text = clean(value).replace(/"/g, '""');
  return /[",;\n\r]/.test(text) ? `"${text}"` : text;
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
const priced = active.filter((gym) => clean(gym.price_info));

const preview = priced.map((gym) => {
  const result = classifyPrice(gym, active);
  return {
    source_id: clean(gym.id),
    source_slug: clean(gym.slug || gym._canonical_slug),
    source_nome: nameOf(gym),
    source_citta: cityOf(gym),
    source_indirizzo: addressOf(gym),
    price_info: clean(gym.price_info),
    price_source_url: clean(gym.price_source_url),
    official_source_url: clean(gym.official_source_url || gym.source_url),
    website: clean(gym.website || gym.sito),
    review_reason: clean(gym.review_reason),
    action: result.action,
    risk: result.risk,
    reason: result.reason,
    target_id: result.target ? clean(result.target.id) : '',
    target_nome: result.target ? nameOf(result.target) : '',
    target_citta: result.target ? cityOf(result.target) : '',
    target_indirizzo: result.target ? addressOf(result.target) : '',
    target_website: result.target ? clean(result.target.website || result.target.sito) : '',
    target_official_source_url: result.target ? clean(result.target.official_source_url || result.target.source_url) : ''
  };
});

const summary = preview.reduce(
  (acc, row) => {
    acc[row.action] += 1;
    acc.risk[row.risk] = (acc.risk[row.risk] || 0) + 1;
    return acc;
  },
  { keep: 0, move_to_target: 0, clear_or_review: 0, manual_review: 0, risk: {} as Record<string, number> }
);

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(
  jsonOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      env_file: envFile,
      table,
      total_rows: rows.length,
      active_rows: active.length,
      priced_rows: priced.length,
      summary,
      rows: preview
    },
    null,
    2
  )
);

const headersRow = [
  'source_id',
  'source_slug',
  'source_nome',
  'source_citta',
  'source_indirizzo',
  'price_info',
  'price_source_url',
  'official_source_url',
  'website',
  'review_reason',
  'action',
  'risk',
  'reason',
  'target_id',
  'target_nome',
  'target_citta',
  'target_indirizzo',
  'target_website',
  'target_official_source_url'
];

await writeFile(
  csvOut,
  [headersRow.join(';'), ...preview.map((row) => headersRow.map((key) => csvCell(row[key as keyof typeof row])).join(';'))].join('\n')
);

console.log(
  JSON.stringify(
    {
      jsonOut,
      csvOut,
      priced_rows: priced.length,
      summary,
      move_examples: preview
        .filter((row) => row.action === 'move_to_target')
        .slice(0, 10)
        .map((row) => ({
          from: `${row.source_id} ${row.source_nome}`,
          to: `${row.target_id} ${row.target_nome}`,
          price_source_url: row.price_source_url,
          risk: row.risk
        }))
    },
    null,
    2
  )
);
