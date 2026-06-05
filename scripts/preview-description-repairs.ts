import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scoreDescription, similarityScore } from '../src/lib/gym-description.js';

type QueueRow = Record<string, any>;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const inputFile = args.get('--file') || args.get('--queue-file') || '';
const priorityFilter = args.get('--priority') || 'P0';
const limitArg = Number(args.get('--limit') || '0');
const jsonOut = args.get('--json-out') || `data/descriptions-repair-preview-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/descriptions-repair-preview-${stamp}.csv`;

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

function isValidCity(value: unknown) {
  const city = clean(value);
  return Boolean(city && !/^\d{4,5}$/.test(city) && !/^localit/i.test(city));
}

function safeCity(row: QueueRow) {
  return isValidCity(row.citta) ? clean(row.citta) : 'località da verificare';
}

function safeAddress(row: QueueRow) {
  const address = clean(row.indirizzo);
  if (!address || /^svizzera$/i.test(address)) return '';
  return address;
}

function hasCityConflict(row: QueueRow) {
  return /altra citt|incoerente con citt/i.test(`${row.problemi_rilevati || ''} ${row.motivo || ''}`);
}

function hasNameConflict(row: QueueRow) {
  return /altra palestra|potenzialmente contaminata/i.test(`${row.problemi_rilevati || ''} ${row.motivo || ''}`);
}

function extractedConflicts(row: QueueRow) {
  const motivo = clean(row.motivo);
  return {
    otherCity: clean(motivo.match(/cita altra citt[^:]*:\s*([^|]+)/i)?.[1]),
    otherGym: clean(motivo.match(/cita altra palestra:\s*([^|]+)/i)?.[1])
  };
}

function textContainsFolded(text: unknown, fragment: unknown) {
  const needle = fold(fragment);
  return Boolean(needle && fold(text).includes(needle));
}

function requiresRegistryReview(row: QueueRow) {
  const conflicts = extractedConflicts(row);
  return Boolean(
    (conflicts.otherCity &&
      (textContainsFolded(row.nome, conflicts.otherCity) || textContainsFolded(row.indirizzo, conflicts.otherCity))) ||
      (conflicts.otherGym && textContainsFolded(row.nome, conflicts.otherGym))
  );
}

function isChain(row: QueueRow) {
  return /nome duplicato|catena|sede/i.test(`${row.problemi_rilevati || ''} ${row.motivo || ''}`);
}

function gymForScore(row: QueueRow) {
  return {
    id: clean(row.id),
    slug: clean(row.slug),
    nome: clean(row.nome),
    citta: isValidCity(row.citta) ? clean(row.citta) : '',
    indirizzo: safeAddress(row),
    discipline: [clean(row.disciplina_principale) || 'Fitness']
  };
}

function contactClause(row: QueueRow) {
  const city = safeCity(row);
  const address = safeAddress(row);
  if (address && city !== 'località da verificare') return `a ${city}, in ${address}`;
  if (city !== 'località da verificare') return `a ${city}`;
  if (address) return `con indirizzo indicato in ${address}`;
  return 'con località da verificare';
}

function generateSafeDescription(row: QueueRow) {
  const name = clean(row.nome) || 'Questa struttura';
  const primary = clean(row.disciplina_principale) || 'Fitness';
  const place = contactClause(row);
  const seed = hashString(clean(row.slug) || clean(row.id) || name);
  const chain = isChain(row);
  const cityConflict = hasCityConflict(row);
  const nameConflict = hasNameConflict(row);
  const registryReview = requiresRegistryReview(row);

  const templates = chain
    ? [
        `${name} è una sede collegata a ${primary}, ${place}. Questa descrizione resta riferita alla singola scheda e va verificata prima della pubblicazione per evitare confusione con sedi omonime.`,
        `La scheda di ${name} identifica una sede specifica ${place}, con riferimento a ${primary}. Nome, indirizzo e località devono restare separati da altre strutture simili.`,
        `${name} compare come scheda distinta per ${primary}, ${place}. Il testo usa solo i dati presenti in questa scheda e richiede controllo manuale prima dell'uso pubblico.`
      ]
    : [
        `${name} è una struttura sportiva ${place}, con attività legate a ${primary}. La scheda raccoglie dati essenziali da verificare prima di usare la descrizione in modo pubblico.`,
        `La scheda di ${name} riguarda una struttura collegata a ${primary}, ${place}. Il testo evita dati commerciali non verificati e usa solo nome, località, indirizzo e disciplina.`,
        `${name} è registrata nel catalogo come struttura per ${primary}, ${place}. Le informazioni disponibili servono a controllare posizione e dati principali della singola scheda.`
      ];

  const riskReasons = [
    registryReview ? 'review_anagrafica_richiesta' : '',
    cityConflict ? 'conflitto_citta_da_revisionare' : '',
    nameConflict ? 'possibile_contaminazione_nome_da_revisionare' : '',
    chain ? 'catena_o_nome_duplicato_da_revisionare' : ''
  ].filter(Boolean);

  return {
    description: templates[seed % templates.length],
    repair_reason: riskReasons.join('|') || 'descrizione_sicura_da_review',
    needs_review: true
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, any>[]) {
  const headers = [
    'id',
    'slug',
    'nome',
    'citta',
    'indirizzo',
    'disciplina_principale',
    'priorita',
    'risk_score',
    'descrizione_attuale',
    'descrizione_proposta',
    'motivo_generazione',
    'problemi_rilevati',
    'needs_review',
    'duplicate_risk',
    'quality_score_before',
    'quality_score_after',
    'repair_status',
    'azione_consigliata'
  ];
  return [headers.join(';'), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))].join('\n');
}

async function findLatestQueueFile() {
  const dir = 'data';
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(dir);
  const candidates = files
    .filter((file) => /^descriptions-review-queue-.*\.json$/.test(file))
    .sort()
    .reverse();
  if (!candidates.length) throw new Error('Nessuna coda descriptions-review-queue trovata in data/. Usa --file=<file>.');
  return path.join(dir, candidates[0]);
}

function duplicateRisk(description: string, row: QueueRow, rows: QueueRow[]) {
  let maxScore = 0;
  let matchId = '';
  for (const other of rows) {
    if (clean(other.id) === clean(row.id)) continue;
    const otherDescription = clean(other.descrizione_attuale);
    if (!otherDescription || otherDescription.length < 80) continue;
    const score = similarityScore(description, otherDescription);
    if (score > maxScore) {
      maxScore = score;
      matchId = clean(other.id);
    }
  }
  if (maxScore >= 0.85) return `similarita_${maxScore.toFixed(2)}_con_${matchId}`;
  return '';
}

const queueFile = inputFile || (await findLatestQueueFile());
const queuePayload = JSON.parse(await readFile(queueFile, 'utf8'));
const queueRows: QueueRow[] = Array.isArray(queuePayload.queue) ? queuePayload.queue : [];
const selected = queueRows.filter((row) => clean(row.priorita).startsWith(priorityFilter));
const limited = limitArg > 0 ? selected.slice(0, Math.min(limitArg, selected.length)) : selected;
const context = {
  names: [...new Set(queueRows.map((row) => clean(row.nome)).filter(Boolean))],
  cities: [...new Set(queueRows.map((row) => clean(row.citta)).filter(isValidCity))]
};

const previewRows = limited.map((row) => {
  const generated = generateSafeDescription(row);
  const gym = gymForScore(row);
  const before = clean(row.descrizione_attuale);
  const after = clean(generated.description);
  return {
    id: clean(row.id),
    slug: clean(row.slug),
    nome: clean(row.nome),
    citta: clean(row.citta),
    indirizzo: clean(row.indirizzo),
    disciplina_principale: clean(row.disciplina_principale),
    priorita: clean(row.priorita),
    risk_score: Number(row.risk_score || 0),
    descrizione_attuale: before,
    descrizione_proposta: after,
    motivo_generazione: generated.repair_reason,
    problemi_rilevati: clean(row.problemi_rilevati),
    needs_review: generated.needs_review,
    duplicate_risk: duplicateRisk(after, row, queueRows),
    quality_score_before: scoreDescription(gym, before, context),
    quality_score_after: scoreDescription(gym, after, context),
    repair_status: requiresRegistryReview(row) ? 'review_anagrafica_prima_della_descrizione' : 'descrizione_riparabile_in_review',
    azione_consigliata: requiresRegistryReview(row)
      ? 'Verificare nome, città e indirizzo della scheda prima di approvare una descrizione.'
      : 'Review manuale della descrizione proposta prima di apply; non pubblicare automaticamente.'
  };
});

await mkdir(path.dirname(jsonOut), { recursive: true });
const summary = {
  generated_at: new Date().toISOString(),
  source_queue: queueFile,
  mode: 'dry_run_only',
  database_modified: false,
  frontend_modified: false,
  production_touched: false,
  priority_filter: priorityFilter,
  selected_rows: selected.length,
  preview_rows: previewRows.length,
  needs_review_rows: previewRows.filter((row) => row.needs_review).length,
  duplicate_risk_rows: previewRows.filter((row) => row.duplicate_risk).length,
  registry_review_rows: previewRows.filter((row) => row.repair_status === 'review_anagrafica_prima_della_descrizione').length,
  description_repairable_rows: previewRows.filter((row) => row.repair_status === 'descrizione_riparabile_in_review').length,
  average_quality_before:
    previewRows.reduce((sum, row) => sum + Number(row.quality_score_before || 0), 0) / (previewRows.length || 1),
  average_quality_after:
    previewRows.reduce((sum, row) => sum + Number(row.quality_score_after || 0), 0) / (previewRows.length || 1),
  top_20: previewRows.slice(0, 20),
  rows: previewRows
};

await writeFile(jsonOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await writeFile(csvOut, `${toCsv(previewRows)}\n`, 'utf8');

console.log(`[descriptions:repair:dry] queue=${queueFile}`);
console.log(`[descriptions:repair:dry] selected=${selected.length} preview=${previewRows.length} needs_review=${summary.needs_review_rows} duplicate_risk=${summary.duplicate_risk_rows}`);
console.log(`[descriptions:repair:dry] json=${jsonOut}`);
console.log(`[descriptions:repair:dry] csv=${csvOut}`);
