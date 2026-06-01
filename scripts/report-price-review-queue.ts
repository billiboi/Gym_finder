import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const previewFile = args.get('--preview-file') || '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonOut = args.get('--json-out') || `data/price-review-queue-${stamp}.json`;
const csvOut = args.get('--csv-out') || `data/price-review-queue-${stamp}.csv`;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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

function recommendedDecision(row: Record<string, any>) {
  const action = clean(row.action);
  const sourceHost = hostForUrl(row.price_source_url);
  const sourceWebsiteHost = hostForUrl(row.website);
  const targetWebsiteHost = hostForUrl(row.target_website);
  const targetHostMatch = Boolean(sourceHost && targetWebsiteHost && sourceHost === targetWebsiteHost);
  const sourceHostMatch = Boolean(sourceHost && sourceWebsiteHost && sourceHost === sourceWebsiteHost);

  if (action === 'move_to_target' && targetHostMatch && !sourceHostMatch) {
    return {
      decision: 'approva_spostamento',
      priority: 'alta',
      reason: 'La fonte prezzo coincide con il sito target e non con il sito sorgente.'
    };
  }

  if (action === 'move_to_target') {
    return {
      decision: 'review_target',
      priority: 'media',
      reason: 'Target probabile, ma il match non basta per applicare automaticamente.'
    };
  }

  if (action === 'clear_or_review') {
    return {
      decision: 'rimuovi_o_ricerca_fonte',
      priority: 'alta',
      reason: 'La fonte prezzo non e riconducibile a una scheda del catalogo.'
    };
  }

  if (action === 'manual_review') {
    return {
      decision: 'review_manuale',
      priority: 'media',
      reason: 'La stessa fonte puo appartenere a piu schede o sedi.'
    };
  }

  return {
    decision: 'nessuna_azione',
    priority: 'bassa',
    reason: 'Riga gia pubblicabile o non pertinente.'
  };
}

if (!previewFile) throw new Error('Specifica --preview-file=data/price-reassignment-preview-....json');

const preview = JSON.parse(await readFile(previewFile, 'utf8'));
const rows = Array.isArray(preview.rows) ? preview.rows : [];
const queue = rows
  .filter((row) => clean(row.action) !== 'keep')
  .map((row) => {
    const decision = recommendedDecision(row);
    return {
      source_id: clean(row.source_id),
      source_nome: clean(row.source_nome),
      source_citta: clean(row.source_citta),
      source_indirizzo: clean(row.source_indirizzo),
      price_info: clean(row.price_info),
      price_source_url: clean(row.price_source_url),
      source_website: clean(row.website),
      action: clean(row.action),
      risk: clean(row.risk),
      target_id: clean(row.target_id),
      target_nome: clean(row.target_nome),
      target_citta: clean(row.target_citta),
      target_indirizzo: clean(row.target_indirizzo),
      target_website: clean(row.target_website),
      decisione_consigliata: decision.decision,
      priorita: decision.priority,
      motivo_decisione: decision.reason,
      motivo_preview: clean(row.reason)
    };
  });

const summary = queue.reduce(
  (acc, row) => {
    acc.total += 1;
    acc.by_decision[row.decisione_consigliata] = (acc.by_decision[row.decisione_consigliata] || 0) + 1;
    acc.by_action[row.action] = (acc.by_action[row.action] || 0) + 1;
    return acc;
  },
  { total: 0, by_decision: {} as Record<string, number>, by_action: {} as Record<string, number> }
);

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(
  jsonOut,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      preview_file: previewFile,
      summary,
      rows: queue
    },
    null,
    2
  )
);

const headers = [
  'source_id',
  'source_nome',
  'source_citta',
  'source_indirizzo',
  'price_info',
  'price_source_url',
  'source_website',
  'action',
  'risk',
  'target_id',
  'target_nome',
  'target_citta',
  'target_indirizzo',
  'target_website',
  'decisione_consigliata',
  'priorita',
  'motivo_decisione',
  'motivo_preview'
];

await writeFile(csvOut, [headers.join(';'), ...queue.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(';'))].join('\n'));

console.log(
  JSON.stringify(
    {
      jsonOut,
      csvOut,
      summary,
      examples: queue.slice(0, 10).map((row) => ({
        id: row.source_id,
        nome: row.source_nome,
        decisione: row.decisione_consigliata,
        target: row.target_nome,
        fonte: row.price_source_url
      }))
    },
    null,
    2
  )
);
