import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDisciplineLabel } from '../src/lib/disciplines.js';
import { isUnsafePublicDescription, scoreDescription, similarityScore } from '../src/lib/gym-description.js';

type Gym = Record<string, any>;
type PreviewRow = {
  id: string;
  slug: string;
  nome: string;
  citta: string;
  indirizzo: string;
  disciplina_principale: string;
  discipline_secondarie: string;
  descrizione_attuale: string;
  descrizione_proposta: string;
  motivo_generazione: string;
  rischio: string;
  needs_review: boolean;
  duplicate_risk: string;
  quality_score_before: number;
  quality_score_after: number;
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const mode = args.get('--mode') || 'dry-run';
const envFile = args.get('--env-file') || '.env.staging.local';
const table = args.get('--table') || process.env.SUPABASE_GYMS_TABLE || 'gyms';
const previewPath = args.get('--preview') || '';
const limit = Number(args.get('--limit') || '0');
const offset = Number(args.get('--offset') || '0');
const confirmApply = args.has('--confirm-apply');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/editorial-preview-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/editorial-preview-${stamp}.csv`;
const applyLogOut = args.get('--apply-log-out') || `data/editorial-apply-log-${stamp}.json`;
const backupOut = args.get('--backup-out') || `data/editorial-apply-backup-staging-${stamp}.json`;

const MARTIAL_DISCIPLINES = new Set([
  'Aikido',
  'Arti Marziali',
  'Boxe',
  'Brazilian Jiu Jitsu',
  'Difesa Personale',
  'Grappling',
  'Judo',
  'Jujitsu',
  'Karate',
  'K1',
  'Kickboxing',
  'Krav Maga',
  'MMA',
  'Muay Thai',
  'Taekwondo',
  'Wing Chun'
]);

const FORBIDDEN_COMMERCIAL_PATTERN =
  /\b(miglior[ei]?|leader|professionisti qualificati|attrezzature moderne|prezzi convenienti|corsi per tutti i livelli|gratis|gratuit[aoie]?|promo|promozione|offerta|sconto|chf|eur|euro|€|\d+\s*(?:chf|eur|euro|€))\b/i;

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

function ensureDryRun() {
  if (!['dry-run', 'dry', 'apply'].includes(mode)) {
    throw new Error('Comando bloccato: mode supportati: dry-run, apply.');
  }
}

function ensureStagingTarget(supabaseUrl: string) {
  const envName = String(process.env.SUPABASE_ENV || '').toLowerCase();
  const targetEnv = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  const url = String(supabaseUrl || '').toLowerCase();
  const tableName = String(table || '').toLowerCase();
  const looksProduction = envName === 'production' || envName === 'prod' || targetEnv === 'production' || url.includes('prod') || tableName.includes('prod');

  if (envName !== 'staging' || looksProduction) {
    throw new Error('Dry-run bloccato: usa solo staging/preview con SUPABASE_ENV=staging. Production non consentita.');
  }
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };
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

function hashString(value: unknown) {
  let hash = 2166136261;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function activeGym(gym: Gym) {
  return !(gym?.deleted_at || gym?.weekly_hours?._deleted_at);
}

function slugPart(value: unknown) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function idOf(gym: Gym) {
  return clean(gym.id);
}

function nameOf(gym: Gym) {
  return clean(gym.nome || gym.name || 'Questa struttura');
}

function cityOf(gym: Gym) {
  return clean(gym.citta || gym.city);
}

function validCityOf(gym: Gym) {
  const city = cityOf(gym);
  if (!city || /^\d{4,5}$/.test(city)) return '';
  return city;
}

function addressOf(gym: Gym) {
  return clean(gym.indirizzo || gym.address);
}

function slugOf(gym: Gym) {
  return clean(gym.slug || gym._canonical_slug) || slugPart(nameOf(gym)) || idOf(gym);
}

function phoneOf(gym: Gym) {
  return clean(gym.telefono || gym.phone);
}

function websiteOf(gym: Gym) {
  return clean(gym.sito || gym.website);
}

function hoursOf(gym: Gym) {
  return clean(gym.orari || gym.hours_info || gym.weekly_hours?._hours_text);
}

function disciplineList(gym: Gym) {
  const raw = Array.isArray(gym.disciplines) && gym.disciplines.length
    ? gym.disciplines
    : clean(gym.discipline || gym.disciplina_principale || gym.discipline_text)
        .split('|')
        .map(clean)
        .filter(Boolean);
  const normalized = raw.map((item) => normalizeDisciplineLabel(item)).filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ['Fitness'];
}

function primaryDiscipline(gym: Gym) {
  return disciplineList(gym)[0] || 'Fitness';
}

function secondaryDisciplines(gym: Gym) {
  return disciplineList(gym).slice(1);
}

function currentDescription(gym: Gym) {
  return clean(gym.descrizione_pubblica || gym.descrizione_editoriale || gym.descrizione || gym.description || gym.presentazione || gym.editorial_summary);
}

function hasOwnerDescription(gym: Gym) {
  return Boolean(clean(gym.descrizione_owner));
}

function hasVerifiedEditorialDescription(gym: Gym) {
  const source = fold(gym.descrizione_source);
  return Boolean(clean(gym.descrizione_editoriale) && (source.includes('verificat') || gym.descrizione_last_reviewed_at || gym.descrizione_quality_score >= 80));
}

function canApplyGeneratedDescription(gym: Gym) {
  if (hasOwnerDescription(gym)) return { ok: false, reason: 'descrizione_owner_presente' };
  if (hasVerifiedEditorialDescription(gym)) return { ok: false, reason: 'descrizione_editoriale_verificata' };
  return { ok: true, reason: 'ok' };
}

function claimedOrVerified(gym: Gym) {
  return Boolean(gym.claim_approved || gym.owner_claim_approved || gym.weekly_hours?._claim_approved || gym.is_verified || gym.verified);
}

function hasFewDetails(gym: Gym) {
  const hours = hoursOf(gym);
  return !phoneOf(gym) || !websiteOf(gym) || !hours || /verificare|non disponibile|n\/d/i.test(hours);
}

function duplicateRiskForGym(gym: Gym, gyms: Gym[]) {
  const ownName = fold(nameOf(gym));
  const ownCity = fold(cityOf(gym));
  const ownAddress = fold(addressOf(gym));
  const sameName = gyms.filter((item) => idOf(item) !== idOf(gym) && fold(nameOf(item)) === ownName);
  const sameNameCity = sameName.filter((item) => fold(cityOf(item)) === ownCity);
  const sameIdentity = sameNameCity.filter((item) => fold(addressOf(item)) === ownAddress);

  if (sameIdentity.length) return 'same_name_city_address';
  if (sameNameCity.length) return 'same_name_same_city';
  if (sameName.length) return 'same_name';
  return '';
}

function shouldGenerate(gym: Gym, context: { names: string[]; cities: string[] }, gyms: Gym[]) {
  if (hasOwnerDescription(gym)) return { generate: false, reason: 'descrizione_owner_presente' };
  if (hasVerifiedEditorialDescription(gym)) return { generate: false, reason: 'descrizione_editoriale_verificata' };

  const description = currentDescription(gym);
  const duplicateRisk = similarDescriptionRisk(description, gym, gyms);
  const score = scoreDescription(gym, description, {
    names: context.names,
    cities: context.cities,
    duplicate: duplicateRisk.duplicate,
    nearDuplicate: duplicateRisk.nearDuplicate
  });

  if (!description) return { generate: true, reason: 'descrizione_mancante' };
  if (description.length < 120) return { generate: true, reason: 'descrizione_troppo_corta' };
  if (isUnsafePublicDescription(gym, description, context)) return { generate: true, reason: 'descrizione_non_sicura' };
  if (duplicateRisk.duplicate || duplicateRisk.nearDuplicate) return { generate: true, reason: 'descrizione_duplicata_o_quasi_duplicata' };
  if (score < 65) return { generate: true, reason: 'quality_score_basso' };
  return { generate: false, reason: 'descrizione_sufficiente' };
}

function similarDescriptionRisk(description: string, gym: Gym, gyms: Gym[]) {
  if (!description || description.length < 80) {
    return { duplicate: false, nearDuplicate: false, matchId: '', maxScore: 0 };
  }

  let maxScore = 0;
  let matchId = '';
  for (const other of gyms) {
    if (idOf(other) === idOf(gym)) continue;
    const otherDescription = currentDescription(other);
    if (!otherDescription || otherDescription.length < 80) continue;
    const score = similarityScore(description, otherDescription);
    if (score > maxScore) {
      maxScore = score;
      matchId = idOf(other);
    }
  }

  return {
    duplicate: maxScore >= 0.98,
    nearDuplicate: maxScore >= 0.85,
    matchId,
    maxScore
  };
}

function contactPhrase(gym: Gym) {
  const available = [
    phoneOf(gym) ? 'telefono' : '',
    websiteOf(gym) ? 'sito' : '',
    hoursOf(gym) && !/verificare|non disponibile|n\/d/i.test(hoursOf(gym)) ? 'orari' : ''
  ].filter(Boolean);

  if (!available.length) return 'i dati principali disponibili';
  if (available.length === 1) return available[0];
  return `${available.slice(0, -1).join(', ')} e ${available.at(-1)}`;
}

function dataSignals(gym: Gym) {
  const signals = [
    phoneOf(gym) ? 'telefono presente' : 'telefono da verificare',
    websiteOf(gym) ? 'sito indicato' : 'sito non indicato',
    hoursOf(gym) && !/verificare|non disponibile|n\/d/i.test(hoursOf(gym)) ? 'orari presenti' : 'orari da verificare'
  ];
  if (claimedOrVerified(gym)) signals.push('scheda verificata');
  return signals;
}

function signalSentence(gym: Gym) {
  const signals = dataSignals(gym);
  return `I dati disponibili indicano ${signals.slice(0, 2).join(' e ')}${signals[2] ? `, con ${signals[2]}` : ''}.`;
}

function generateDescription(gym: Gym, gyms: Gym[]) {
  const name = nameOf(gym);
  const city = validCityOf(gym) || 'località da verificare';
  const address = addressOf(gym);
  const primary = primaryDiscipline(gym);
  const secondaries = secondaryDisciplines(gym).slice(0, 3);
  const duplicateRisk = duplicateRiskForGym(gym, gyms);
  const isMartial = MARTIAL_DISCIPLINES.has(primary);
  const isMultidiscipline = secondaries.length > 0;
  const seed = hashString(slugOf(gym));
  const claimed = claimedOrVerified(gym);
  const verifiedNote = claimed ? ' La scheda risulta collegata a una verifica o a un claim approvato.' : '';
  const signal = signalSentence(gym);
  const addressPart = address ? ` in ${address}` : '';
  const comparison = 'Il testo usa solo dati presenti nella scheda e serve come base per confronto e verifica.';

  if (duplicateRisk) {
    const templates = [
      `${name} è la sede di ${city} collegata a ${primary}. Questa scheda è dedicata alla sede specifica${addressPart} e aiuta a distinguere indirizzo, orari e contatti rispetto ad altre strutture con nome simile.${verifiedNote}`,
      `${name} identifica una sede specifica a ${city}${addressPart}, con attività legate a ${primary}. ${signal} La descrizione resta separata dalle altre sedi con nome simile.${verifiedNote}`,
      `Per ${name}, sede di ${city}${addressPart}, la scheda raccoglie dati collegati a ${primary}. ${signal} Le informazioni aiutano a non confondere questa sede con strutture omonime.${verifiedNote}`
    ];
    return {
      reason: 'sede_o_nome_duplicato',
      duplicateRisk,
      description: templates[seed % templates.length].trim()
    };
  }

  if (isMultidiscipline && seed % 2 === 0) {
    const templates = [
      `${name} è una palestra a ${city} con attività legate a ${primary} e altre discipline come ${secondaries.join(', ')}. La scheda aiuta a verificare ${contactPhrase(gym)} e servizi disponibili.${verifiedNote}`,
      `${name} raccoglie a ${city}${addressPart} informazioni su ${primary} e discipline collegate, tra cui ${secondaries.join(', ')}. ${signal} ${comparison}`,
      `La scheda di ${name} segnala attività legate a ${primary} a ${city}, insieme a ${secondaries.join(', ')}. ${address ? `L'indirizzo indicato è ${address}. ` : ''}${signal}`
    ];
    return {
      reason: 'scheda_multidisciplina',
      duplicateRisk,
      description: templates[seed % templates.length].trim()
    };
  }

  if (isMartial) {
    const templates = [
      `${name} è una realtà sportiva a ${city} dedicata a ${primary}. La scheda raccoglie informazioni utili su corsi, indirizzo, contatti e discipline collegate.${verifiedNote}`,
      `${name} compare nella categoria ${primary} a ${city}${addressPart}. ${signal} La scheda aiuta a controllare posizione, contatti e informazioni prima di approfondire.${verifiedNote}`,
      `Per chi cerca ${primary} a ${city}, ${name} offre una scheda dedicata con indirizzo${address ? ` (${address})` : ''}, contatti e dettagli disponibili. ${comparison}${verifiedNote}`
    ];
    return {
      reason: 'arti_marziali',
      duplicateRisk,
      description: templates[seed % templates.length].trim()
    };
  }

  if (hasFewDetails(gym) || seed % 4 === 0) {
    const templates = [
      `${name} è una struttura sportiva a ${city} collegata a ${primary}. Le informazioni disponibili includono i dati principali della scheda; alcuni dettagli, come orari o contatti, potrebbero richiedere ulteriore verifica.${verifiedNote}`,
      `${name} è presente nel catalogo per ${primary} a ${city}${addressPart}. ${signal} Alcuni dettagli possono richiedere controllo manuale prima della pubblicazione definitiva.${verifiedNote}`,
      `La scheda di ${name} raccoglie i dati disponibili per una struttura collegata a ${primary} a ${city}. ${address ? `L'indirizzo indicato è ${address}. ` : ''}${signal}`
    ];
    return {
      reason: 'informazioni_parziali',
      duplicateRisk,
      description: templates[seed % templates.length].trim()
    };
  }

  const templates = [
    `${name} è una struttura sportiva a ${city}${address ? `, in ${address}` : ''}, con attività legate a ${primary}. La scheda raccoglie contatti, orari e informazioni utili per confrontarla con altre palestre della zona.${verifiedNote}`,
    `${name} è indicata a ${city}${addressPart} per attività collegate a ${primary}. ${signal} La scheda aiuta a controllare i dati principali prima di contattare la struttura.${verifiedNote}`,
    `A ${city}, ${name} è associata a ${primary}${address ? ` e all'indirizzo ${address}` : ''}. ${signal} Le informazioni sono pensate per una consultazione rapida e verificabile.${verifiedNote}`,
    `${name} ha una scheda dedicata a ${city}${addressPart} con riferimento a ${primary}. ${signal} ${comparison}${verifiedNote}`
  ];
  return {
    reason: 'scheda_completa',
    duplicateRisk,
    description: templates[seed % templates.length].trim()
  };
}

function sanitizeGeneratedDescription(description: string) {
  return clean(description)
    .replace(/\b0lite\b/g, 'Elite')
    .replace(FORBIDDEN_COMMERCIAL_PATTERN, '')
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildContext(gyms: Gym[]) {
  return {
    names: [...new Set(gyms.map(nameOf).filter(Boolean))],
    cities: [...new Set(gyms.map(cityOf).filter(Boolean))]
  };
}

function buildRows(activeGyms: Gym[]) {
  const context = buildContext(activeGyms);
  return activeGyms.flatMap((gym) => {
    const decision = shouldGenerate(gym, context, activeGyms);
    if (!decision.generate) return [];

    const current = currentDescription(gym);
    const generated = generateDescription(gym, activeGyms);
    const proposed = sanitizeGeneratedDescription(generated.description);
    const beforeRisk = similarDescriptionRisk(current, gym, activeGyms);
    const afterRisk = similarDescriptionRisk(proposed, gym, activeGyms);
    const duplicateRisk = afterRisk.nearDuplicate
      ? `similarita_${afterRisk.maxScore.toFixed(2)}_con_${afterRisk.matchId}`
      : generated.duplicateRisk;
    const beforeScore = scoreDescription(gym, current, {
      ...context,
      duplicate: beforeRisk.duplicate,
      nearDuplicate: beforeRisk.nearDuplicate
    });
    const afterScore = scoreDescription(gym, proposed, {
      ...context,
      duplicate: afterRisk.duplicate,
      nearDuplicate: afterRisk.nearDuplicate
    });
    const risky =
      afterRisk.duplicate ||
      isUnsafePublicDescription(gym, proposed, context) ||
      afterScore < 70 ||
      generated.duplicateRisk === 'same_name_same_city' ||
      !validCityOf(gym);

    return [{
      id: idOf(gym),
      slug: slugOf(gym),
      nome: nameOf(gym),
      citta: cityOf(gym),
      indirizzo: addressOf(gym),
      disciplina_principale: primaryDiscipline(gym),
      discipline_secondarie: secondaryDisciplines(gym).join(', '),
      descrizione_attuale: current,
      descrizione_proposta: proposed,
      motivo_generazione: decision.reason,
      rischio: risky ? 'review_manuale_richiesta' : 'basso',
      needs_review: risky,
      duplicate_risk: duplicateRisk,
      quality_score_before: beforeScore,
      quality_score_after: afterScore
    } satisfies PreviewRow];
  });
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: PreviewRow[]) {
  const headers = [
    'id',
    'slug',
    'nome',
    'citta',
    'indirizzo',
    'disciplina_principale',
    'discipline_secondarie',
    'descrizione_attuale',
    'descrizione_proposta',
    'motivo_generazione',
    'rischio',
    'needs_review',
    'duplicate_risk',
    'quality_score_before',
    'quality_score_after'
  ];
  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof PreviewRow])).join(';'))].join('\n');
}

async function readGyms(baseUrl: string, key: string) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=5000`, {
    method: 'GET',
    headers: headers(key)
  });

  if (!response.ok) {
    throw new Error(`Lettura Supabase non riuscita (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function patchGym(baseUrl: string, key: string, id: string, patch: Record<string, any>) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...headers(key),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    throw new Error(`Update ${id} non riuscito (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function loadPreviewRows(filePath: string) {
  if (!filePath) {
    throw new Error('Apply bloccato: specifica un file preview con --preview=data/editorial-preview-....json');
  }

  const raw = await readFile(path.resolve(filePath), 'utf8');
  const payload = JSON.parse(raw);
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (!rows.length) throw new Error(`Preview senza righe applicabili: ${filePath}`);
  return rows as PreviewRow[];
}

async function runApply(baseUrl: string, key: string, allRows: Gym[]) {
  const previewRows = await loadPreviewRows(previewPath);
  const selectedRows = previewRows.slice(offset, limit > 0 ? offset + limit : undefined);
  if (!selectedRows.length) throw new Error('Apply bloccato: selezione preview vuota.');

  const byId = new Map(allRows.map((gym) => [idOf(gym), gym]));
  const targetRows = selectedRows.map((row, index) => {
    const current = byId.get(row.id);
    const applyCheck = current ? canApplyGeneratedDescription(current) : { ok: false, reason: 'scheda_non_trovata' };
    return {
      order: offset + index + 1,
      preview: row,
      current,
      can_apply: applyCheck.ok,
      skip_reason: applyCheck.ok ? '' : applyCheck.reason
    };
  });

  await mkdir(path.dirname(backupOut), { recursive: true });
  await writeFile(
    backupOut,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: { env_file: envFile, table, target: 'staging', preview: previewPath },
        selected_count: selectedRows.length,
        backup_count: targetRows.filter((row) => row.current).length,
        records: targetRows.map((row) => row.current).filter(Boolean)
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  if (!confirmApply) {
    const plan = {
      generated_at: new Date().toISOString(),
      mode: 'apply_plan_only',
      preview: previewPath,
      offset,
      limit,
      selected_count: selectedRows.length,
      backup_file: backupOut,
      target_rows: targetRows.map((row) => ({
        order: row.order,
        id: row.preview.id,
        slug: row.preview.slug,
        nome: row.preview.nome,
        citta: row.preview.citta,
        can_apply: row.can_apply,
        skip_reason: row.skip_reason,
        descrizione_proposta: row.preview.descrizione_proposta
      }))
    };

    await writeFile(applyLogOut, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    console.log(`[editorial:apply:plan] selected=${selectedRows.length} can_apply=${targetRows.filter((row) => row.can_apply).length}`);
    console.log(`[editorial:apply:plan] backup=${backupOut}`);
    console.log(`[editorial:apply:plan] log=${applyLogOut}`);
    throw new Error('Apply non eseguito: aggiungi --confirm-apply dopo aver verificato piano e backup.');
  }

  const applied = [];
  const skipped = [];
  for (const row of targetRows) {
    if (!row.can_apply) {
      skipped.push({
        id: row.preview.id,
        slug: row.preview.slug,
        reason: row.skip_reason
      });
      continue;
    }

    const patch = {
      descrizione_generata: row.preview.descrizione_proposta,
      descrizione_source: `editorial_preview:${path.basename(previewPath)}`,
      descrizione_quality_score: row.preview.quality_score_after,
      descrizione_needs_review: row.preview.needs_review
    };
    const result = await patchGym(baseUrl, key, row.preview.id, patch);
    applied.push({
      id: row.preview.id,
      slug: row.preview.slug,
      result_count: result.length,
      patch
    });
  }

  const log = {
    generated_at: new Date().toISOString(),
    mode: 'apply',
    source: { env_file: envFile, table, target: 'staging', preview: previewPath },
    selected_count: selectedRows.length,
    backup_file: backupOut,
    applied_count: applied.length,
    skipped_count: skipped.length,
    applied,
    skipped
  };

  await writeFile(applyLogOut, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
  console.log(`[editorial:apply] selected=${selectedRows.length} applied=${applied.length} skipped=${skipped.length}`);
  console.log(`[editorial:apply] backup=${backupOut}`);
  console.log(`[editorial:apply] log=${applyLogOut}`);
}

ensureDryRun();
await loadEnvFile(path.resolve(envFile));

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
if (!readKey) throw new Error('Missing Supabase read key for staging dry-run.');
ensureStagingTarget(supabaseUrl);

const allRows = await readGyms(supabaseUrl, readKey);
const activeRows = allRows.filter(activeGym);

if (mode === 'apply') {
  await runApply(supabaseUrl, readKey, activeRows);
  process.exit(0);
}

const previewRows = buildRows(activeRows);
const needsReview = previewRows.filter((row) => row.needs_review);

const payload = {
  generated_at: new Date().toISOString(),
  source: { env_file: envFile, table, target: 'staging', mode: 'dry_run_read_only' },
  total_records: allRows.length,
  active_records: activeRows.length,
  preview_count: previewRows.length,
  needs_review_count: needsReview.length,
  groups: [...new Set(previewRows.map((row) => `${row.disciplina_principale} | ${row.citta}`).filter(Boolean))].sort(),
  rows: previewRows
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(csvOut, `${toCsv(previewRows)}\n`, 'utf8');

console.log(
  `[editorial:generate:dry] total=${payload.total_records} active=${payload.active_records} ` +
    `preview=${payload.preview_count} needs_review=${payload.needs_review_count}`
);
console.log(`[editorial:generate:dry] json=${jsonOut}`);
console.log(`[editorial:generate:dry] csv=${csvOut}`);
