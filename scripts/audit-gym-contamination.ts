import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getSafePublicDescription, similarityScore } from '../src/lib/gym-description.js';
import { normalizeDisciplineLabel } from '../src/lib/disciplines.js';

type Gym = Record<string, any>;
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Issue = {
  id: string;
  slug: string;
  legacy_slug: string;
  nome: string;
  citta: string;
  indirizzo: string;
  issue_type: string;
  severity: Severity;
  campo_sospetto: string;
  valore_sospetto: string;
  motivo: string;
  suggerimento_fix: string;
  safe_public_description: string;
  can_auto_fix: boolean;
  needs_review: boolean;
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const includeArchived = args.get('--include-archived') !== '0';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/audit-gym-contamination-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/audit-gym-contamination-${stamp}.csv`;

const KNOWN_CASES = [
  'ptroom-varese',
  'ptroom-varese-csv-499',
  'ptroom-varese-csv-497',
  'ptroom-gallarate',
  'ptroom-gallarate-csv-496',
  'first-studio-personal-training-giubiasco',
  'roar-training',
  'roar-training-csv-517',
  'flyer-gym-a-s-d',
  'urban-fitness-varese',
  'urban-fitness-varese-csv-633',
  'varese-motorsport',
  'forus-luino-le-betulle',
  'curling-club-chiasso',
  'old-school-fighting-lugano',
  'emotion-fitness-and-wellness'
];

const EXTRA_CITIES = [
  'Busto Arsizio',
  'Gallarate',
  'Varese',
  'Giubiasco',
  'Chiasso',
  'Locarno',
  'Lugano',
  'Rozzano',
  'Bellinzona',
  'Mendrisio',
  'Massagno',
  'Losone',
  'Luino',
  'Saronno',
  'Busto Garolfo',
  'Cardano al Campo',
  'Cassano Magnago'
];

const PUBLIC_TEXT_FIELDS = [
  'descrizione',
  'description',
  'presentazione',
  'descrizione_owner',
  'descrizione_editoriale',
  'descrizione_generata',
  'descrizione_pubblica',
  'safe_public_description',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'meta_title',
  'meta_description',
  'verifiche_rapide',
  'fonte_ufficiale',
  'source_name',
  'official_data',
  'prezzo',
  'promozione',
  'commercial_info',
  'price_info'
];

const QUICK_CHECK_FIELDS = [
  'editorial_highlights',
  'editorial_faq_items',
  'verifiche_rapide',
  'official_data'
];

const META_FIELDS = ['meta_title', 'meta_description'];
const COMMERCIAL_FIELDS = ['prezzo', 'promozione', 'commercial_info', 'price_info'];
const SOURCE_URL_FIELDS = ['source_url', 'official_source_url', 'fonte_ufficiale', 'price_source_url'];

function parseEnvValue(value: string) {
  const trimmed = String(value || '').trim();
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

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function ensureStagingTarget(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  if (envName !== 'staging' || targetEnv === 'production' || url.includes('prod')) {
    throw new Error('Audit bloccato: usa solo .env.staging.local / SUPABASE_ENV=staging per questa fase.');
  }
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function stringify(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item && typeof item === 'object' ? Object.values(item).map(stringify).join(' ') : stringify(item)))
      .join(' ');
  }
  if (value && typeof value === 'object') return Object.values(value).map(stringify).join(' ');
  return clean(value);
}

function hostForUrl(value: unknown) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function slugPart(value: unknown) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '');
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

function canonicalSlug(gym: Gym) {
  return clean(gym._canonical_slug || gym.slug) || slugPart(nameOf(gym)) || clean(gym.id);
}

function legacySlug(gym: Gym) {
  return clean(gym._legacy_slug) || `${slugPart(nameOf(gym)) || 'palestra'}-${clean(gym.id)}`;
}

function activeGym(gym: Gym) {
  return !(gym.deleted_at || gym.weekly_hours?._deleted_at);
}

function primaryDiscipline(gym: Gym) {
  const raw = Array.isArray(gym.disciplines) && gym.disciplines.length
    ? gym.disciplines[0]
    : gym.discipline || gym.disciplina_principale || 'Fitness';
  return normalizeDisciplineLabel(clean(raw)) || 'Fitness';
}

function publicTextFor(gym: Gym, fields = PUBLIC_TEXT_FIELDS) {
  return fields.map((field) => stringify(gym[field])).filter(Boolean).join(' ');
}

function issueBase(gym: Gym) {
  return {
    id: clean(gym.id),
    slug: canonicalSlug(gym),
    legacy_slug: legacySlug(gym),
    nome: nameOf(gym),
    citta: cityOf(gym),
    indirizzo: addressOf(gym),
    safe_public_description: getSafePublicDescription(gym),
    can_auto_fix: true,
    needs_review: true
  };
}

function addIssue(issues: Issue[], gym: Gym, issue: Omit<Issue, keyof ReturnType<typeof issueBase>>) {
  issues.push({ ...issueBase(gym), ...issue });
}

function candidateFields(gym: Gym) {
  return PUBLIC_TEXT_FIELDS
    .map((field) => ({ field, value: stringify(gym[field]) }))
    .filter((item) => item.value);
}

function commercialVerified(gym: Gym) {
  return Boolean(gym.price_verified || gym.weekly_hours?._price_verified || gym.is_verified || gym.verified);
}

function isLikelyGenericBrand(name: string) {
  const normalized = fold(name);
  return !normalized || ['palestra', 'fitness', 'club', 'gym', 'studio', 'centro'].includes(normalized);
}

function analyzeGym(gym: Gym, context: { cities: string[]; names: string[]; addresses: string[] }) {
  const issues: Issue[] = [];
  const ownCity = fold(cityOf(gym));
  const ownName = fold(nameOf(gym));
  const ownAddress = fold(addressOf(gym));
  const fields = candidateFields(gym);
  const textAll = fold(fields.map((item) => item.value).join(' '));
  const safeDescription = getSafePublicDescription(gym);

  if (/^\d{4,5}$/.test(cityOf(gym))) {
    addIssue(issues, gym, {
      issue_type: 'city_is_numeric_code',
      severity: 'high',
      campo_sospetto: 'citta',
      valore_sospetto: cityOf(gym),
      motivo: 'Il campo città sembra un CAP o codice numerico.',
      suggerimento_fix: 'Correggere città in admin o marcare la scheda per revisione manuale.',
      safe_public_description: safeDescription,
      can_auto_fix: false,
      needs_review: true
    });
  }

  for (const city of context.cities) {
    const normalizedCity = fold(city);
    if (!normalizedCity || normalizedCity === ownCity || normalizedCity.length < 4) continue;
    if (ownName.includes(normalizedCity) || ownAddress.includes(normalizedCity)) continue;

    for (const { field, value } of fields) {
      if (fold(value).includes(normalizedCity)) {
        addIssue(issues, gym, {
          issue_type: QUICK_CHECK_FIELDS.includes(field) ? 'quick_check_city_mismatch' : META_FIELDS.includes(field) ? 'meta_city_mismatch' : 'city_mismatch',
          severity: QUICK_CHECK_FIELDS.includes(field) || META_FIELDS.includes(field) ? 'critical' : 'high',
          campo_sospetto: field,
          valore_sospetto: city,
          motivo: `Il campo cita "${city}", ma la città della scheda è "${cityOf(gym) || 'non indicata'}".`,
          suggerimento_fix: 'Usare descrizione sicura e nascondere verifiche/dati editoriali sospetti dal pubblico.',
          safe_public_description: safeDescription,
          can_auto_fix: true,
          needs_review: true
        });
      }
    }
  }

  for (const address of context.addresses) {
    const normalizedAddress = fold(address);
    if (!normalizedAddress || normalizedAddress.length < 12 || normalizedAddress === ownAddress) continue;
    if (textAll.includes(normalizedAddress)) {
      addIssue(issues, gym, {
        issue_type: 'address_mismatch',
        severity: 'high',
        campo_sospetto: 'testi_pubblici',
        valore_sospetto: address,
        motivo: `I testi pubblici citano un indirizzo diverso: "${address}".`,
        suggerimento_fix: 'Nascondere il campo pubblico sospetto e mantenere il dato originale solo per revisione admin.',
        safe_public_description: safeDescription,
        can_auto_fix: true,
        needs_review: true
      });
    }
  }

  for (const name of context.names) {
    const normalizedName = fold(name);
    if (!normalizedName || normalizedName === ownName || normalizedName.length < 8 || isLikelyGenericBrand(name)) continue;
    if (textAll.includes(normalizedName)) {
      addIssue(issues, gym, {
        issue_type: 'brand_mismatch',
        severity: 'critical',
        campo_sospetto: 'testi_pubblici',
        valore_sospetto: name,
        motivo: `I testi pubblici citano un altro brand/scheda: "${name}".`,
        suggerimento_fix: 'Usare fallback sicuro e marcare la scheda come needs_review.',
        safe_public_description: safeDescription,
        can_auto_fix: true,
        needs_review: true
      });
    }
  }

  if (/\bsede di\s+[a-zàèéìòù' -]{3,}/i.test(publicTextFor(gym))) {
    const match = publicTextFor(gym).match(/\bsede di\s+([a-zàèéìòù' -]{3,40})/i)?.[1] || '';
    if (match && ownCity && !fold(match).includes(ownCity)) {
      addIssue(issues, gym, {
        issue_type: 'branch_mismatch',
        severity: 'high',
        campo_sospetto: 'testi_pubblici',
        valore_sospetto: match,
        motivo: 'Il testo usa una formula di sede/branch che non coincide chiaramente con la città della scheda.',
        suggerimento_fix: 'Sostituire lato pubblico con descrizione sicura finché la sede non è confermata.',
        safe_public_description: safeDescription,
        can_auto_fix: true,
        needs_review: true
      });
    }
  }

  const websiteHost = hostForUrl(gym.sito || gym.website);
  for (const field of SOURCE_URL_FIELDS) {
    const sourceHost = hostForUrl(gym[field]);
    if (websiteHost && sourceHost && sourceHost !== websiteHost) {
      addIssue(issues, gym, {
        issue_type: 'source_domain_mismatch',
        severity: 'high',
        campo_sospetto: field,
        valore_sospetto: sourceHost,
        motivo: `Il dominio fonte "${sourceHost}" non coincide con il sito scheda "${websiteHost}".`,
        suggerimento_fix: 'Nascondere fonte ufficiale/prezzi dal pubblico e verificare in admin.',
        safe_public_description: safeDescription,
        can_auto_fix: true,
        needs_review: true
      });
    }
  }

  const commercialText = COMMERCIAL_FIELDS.map((field) => stringify(gym[field])).filter(Boolean).join(' ');
  if (commercialText && /\b(gratis|promo|promozione|offerta|sconto|chf|eur|euro|€|\d+\s*(?:chf|eur|euro|€))\b/i.test(commercialText) && !commercialVerified(gym)) {
    addIssue(issues, gym, {
      issue_type: 'unverified_commercial_data',
      severity: 'medium',
      campo_sospetto: 'commercial_info',
      valore_sospetto: commercialText.slice(0, 180),
      motivo: 'Il testo contiene prezzo/promozione senza flag di verifica commerciale.',
      suggerimento_fix: 'Nascondere il dato commerciale dal pubblico finché non è verificato.',
      safe_public_description: safeDescription,
      can_auto_fix: true,
      needs_review: true
    });
  }

  if (gym.needs_review || gym.descrizione_needs_review || gym.weekly_hours?._needs_review) {
    addIssue(issues, gym, {
      issue_type: 'already_flagged_needs_review',
      severity: 'low',
      campo_sospetto: 'needs_review',
      valore_sospetto: clean(gym.review_reason || gym.weekly_hours?._public_data_quarantine || 'needs_review=true'),
      motivo: 'La scheda risulta già marcata come da revisionare.',
      suggerimento_fix: 'Mantenere fallback pubblico e completare revisione admin.',
      safe_public_description: safeDescription,
      can_auto_fix: true,
      needs_review: true
    });
  }

  return issues;
}

function descriptionForSimilarity(gym: Gym) {
  return clean(gym.descrizione_pubblica || gym.descrizione_generata || gym.descrizione_editoriale || gym.descrizione || gym.description || gym.editorial_summary);
}

function addDuplicateIssues(gyms: Gym[], issues: Issue[]) {
  const descriptions = gyms
    .filter(activeGym)
    .map((gym) => ({ gym, text: descriptionForSimilarity(gym) }))
    .filter((item) => item.text.length >= 120);

  for (let i = 0; i < descriptions.length; i += 1) {
    for (let j = i + 1; j < descriptions.length; j += 1) {
      const left = descriptions[i];
      const right = descriptions[j];
      if (left.gym.id === right.gym.id) continue;
      if (nameOf(left.gym) === nameOf(right.gym) && cityOf(left.gym) === cityOf(right.gym)) continue;
      const score = similarityScore(left.text, right.text);
      if (left.text === right.text || score >= 0.85) {
        for (const item of [left, right]) {
          addIssue(issues, item.gym, {
            issue_type: left.text === right.text ? 'duplicate_description' : 'near_duplicate_description',
            severity: 'medium',
            campo_sospetto: 'descrizione',
            valore_sospetto: `${Math.round(score * 100)}% similarità`,
            motivo: 'Descrizione uguale o quasi uguale a un’altra scheda con nome/città diversi.',
            suggerimento_fix: 'Usare descrizione sicura o rigenerare una descrizione specifica per sede.',
            safe_public_description: getSafePublicDescription(item.gym),
            can_auto_fix: true,
            needs_review: true
          });
        }
      }
    }
  }
}

function buildLegacyRedirectReport(gyms: Gym[]) {
  const rows = gyms
    .map((gym) => {
      const oldSlug = legacySlug(gym);
      const newSlug = canonicalSlug(gym);
      const archived = !activeGym(gym);
      return {
        id: clean(gym.id),
        nome: nameOf(gym),
        legacy_slug: oldSlug,
        legacy_url: `/palestre/${oldSlug}`,
        canonical_slug: newSlug,
        canonical_url: `/palestre/${newSlug}`,
        current_status: 'not_checked_preview_only',
        expected_status: archived ? 410 : oldSlug !== newSlug ? 301 : 200,
        action_needed: oldSlug.includes('-csv-') && !archived && oldSlug !== newSlug ? 'ensure_301' : archived ? 'ensure_410' : 'none'
      };
    })
    .filter((row) => row.legacy_slug.includes('-csv-'));

  for (const known of KNOWN_CASES.filter((slug) => slug.includes('-csv-'))) {
    if (!rows.some((row) => row.legacy_slug === known)) {
      rows.push({
        id: '',
        nome: '',
        legacy_slug: known,
        legacy_url: `/palestre/${known}`,
        canonical_slug: '',
        canonical_url: '',
        current_status: 'not_checked_preview_only',
        expected_status: 301,
        action_needed: 'manual_lookup_missing_legacy_slug'
      });
    }
  }

  return rows.sort((a, b) => a.legacy_slug.localeCompare(b.legacy_slug, 'it'));
}

function knownCaseChecks(gyms: Gym[], issues: Issue[], legacyRows: any[]) {
  return KNOWN_CASES.map((slug) => {
    const gym = gyms.find((item) => canonicalSlug(item) === slug || legacySlug(item) === slug || slugPart(nameOf(item)) === slug);
    const relatedIssues = gym ? issues.filter((issue) => issue.id === clean(gym.id)) : [];
    const legacy = legacyRows.find((row) => row.legacy_slug === slug);
    return {
      slug,
      found: Boolean(gym || legacy),
      id: gym ? clean(gym.id) : legacy?.id || '',
      nome: gym ? nameOf(gym) : legacy?.nome || '',
      issue_count: relatedIssues.length,
      max_severity: maxSeverity(relatedIssues),
      legacy_status_expected: legacy?.expected_status || null,
      note: gym ? 'checked_record' : legacy ? 'checked_legacy_only' : 'not_found'
    };
  });
}

function maxSeverity(issues: Issue[]) {
  const order: Severity[] = ['critical', 'high', 'medium', 'low'];
  return order.find((severity) => issues.some((issue) => issue.severity === severity)) || 'low';
}

function severitySummary(issues: Issue[]) {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function dedupeIssues(issues: Issue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = [issue.id, issue.issue_type, issue.campo_sospetto, issue.valore_sospetto].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Issue[]) {
  const headers = [
    'id',
    'slug',
    'legacy_slug',
    'nome',
    'citta',
    'indirizzo',
    'issue_type',
    'severity',
    'campo_sospetto',
    'valore_sospetto',
    'motivo',
    'suggerimento_fix',
    'safe_public_description',
    'can_auto_fix',
    'needs_review'
  ];
  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof Issue])).join(';'))].join('\n');
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=2000`, {
    headers: headers(key)
  });
  if (!response.ok) throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

export async function runContaminationAudit() {
  await loadEnvFile(path.resolve(envFile));
  const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
  if (!key) throw new Error('Missing Supabase read key for staging audit.');
  ensureStagingTarget(supabaseUrl);

  const allRows = await readGyms(supabaseUrl, key);
  const rows = includeArchived ? allRows : allRows.filter(activeGym);
  const context = {
    cities: [...new Set([...EXTRA_CITIES, ...rows.map(cityOf)].map(clean).filter(Boolean))],
    names: [...new Set(rows.map(nameOf).map(clean).filter(Boolean))],
    addresses: [...new Set(rows.map(addressOf).map(clean).filter((value) => value.length >= 8))]
  };

  let issues = rows.flatMap((gym) => analyzeGym(gym, context));
  addDuplicateIssues(rows, issues);
  issues = dedupeIssues(issues).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity] || a.nome.localeCompare(b.nome, 'it');
  });

  const legacyRedirects = buildLegacyRedirectReport(allRows);
  const issueGymIds = new Set(issues.map((issue) => issue.id));
  const summary = severitySummary(issues);
  const payload = {
    generated_at: new Date().toISOString(),
    source: { env_file: envFile, table, target: 'staging' },
    total_records: allRows.length,
    scanned_records: rows.length,
    active_records: allRows.filter(activeGym).length,
    archived_records: allRows.filter((gym) => !activeGym(gym)).length,
    suspicious_gyms: issueGymIds.size,
    severity_summary: summary,
    top_30: issues.slice(0, 30),
    issues,
    legacy_redirects: legacyRedirects,
    known_case_checks: knownCaseChecks(allRows, issues, legacyRedirects)
  };

  await mkdir(path.dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(csvOut, `${toCsv(issues)}\n`, 'utf8');

  return { payload, jsonOut, csvOut };
}

if (import.meta.main) {
  const { payload } = await runContaminationAudit();
  console.log(
    `[audit-gym-contamination] scanned=${payload.scanned_records} suspicious=${payload.suspicious_gyms} ` +
      `critical=${payload.severity_summary.critical} high=${payload.severity_summary.high} ` +
      `medium=${payload.severity_summary.medium} low=${payload.severity_summary.low}`
  );
  console.log(`[audit-gym-contamination] json=${jsonOut}`);
  console.log(`[audit-gym-contamination] csv=${csvOut}`);
}
