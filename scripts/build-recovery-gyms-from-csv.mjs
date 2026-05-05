import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split('=');
      return [key, rest.join('=')];
    })
);

const sourceFile = args.get('source') || 'data/palestre.csv';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = args.get('out') || `data/recovery-from-csv-${timestamp}.json`;
const limit = args.has('limit') ? Number(args.get('limit')) : null;

if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
  throw new Error('Parametro --limit non valido. Usa un intero positivo oppure ometti il limite.');
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += char;
  }

  out.push(cur);
  return out;
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  const number = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function requireHeader(headerIndex, name) {
  if (!(name in headerIndex)) {
    throw new Error(`Colonna obbligatoria mancante nel CSV: "${name}".`);
  }
}

const raw = (await readFile(sourceFile, 'utf8')).replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');

if (lines.length < 2) {
  throw new Error(`CSV vuoto o senza righe dati: ${sourceFile}`);
}

const headers = splitCsvLine(lines[0]).map((header) => normalizeSpace(header).toLowerCase());
const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));

for (const header of ['nome palestra', 'discipline', 'indirizzo']) {
  requireHeader(headerIndex, header);
}

const sourceRows = limit ? lines.slice(1, limit + 1) : lines.slice(1);
const rows = sourceRows.map((line, index) => {
  const columns = splitCsvLine(line);
  const disciplineText = normalizeSpace(columns[headerIndex.discipline] || columns[headerIndex.disciplines]);
  const disciplines = disciplineText
    .split('|')
    .map((discipline) => normalizeSpace(discipline))
    .filter(Boolean);

  return {
    id: `csv-recovery-${index + 1}`,
    name: normalizeSpace(columns[headerIndex['nome palestra']]),
    discipline: disciplines[0] || 'Fitness',
    disciplines: disciplines.length ? disciplines : ['Fitness'],
    address: normalizeSpace(columns[headerIndex.indirizzo]),
    city: '',
    phone: normalizeSpace(columns[headerIndex.telefono]),
    hours_info: normalizeSpace(columns[headerIndex['orari di apertura']]) || 'Orari da verificare',
    website: normalizeSpace(columns[headerIndex['pagina web']]),
    description: '',
    latitude: toNumber(columns[headerIndex.lat]),
    longitude: toNumber(columns[headerIndex.long]),
    image_url: '',
    weekly_hours: {
      _verified: false,
      _recovery_source: path.basename(sourceFile)
    }
  };
});

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(rows, null, 2)}\n`);

console.log(`[build-recovery-gyms-from-csv] source=${sourceFile} rows=${rows.length} out=${outFile}`);
console.log('[build-recovery-gyms-from-csv] File locale creato. Nessuna scrittura su Supabase eseguita.');
