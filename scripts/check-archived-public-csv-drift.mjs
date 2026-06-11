import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=') || '1'];
}));

const archivedFile = args.get('--archived') || args.get('--input') || '';
const outFile = args.get('--out') || '';
const publicFiles = (args.get('--public-files') || 'data/palestre.csv,static/palestre.csv')
  .split(',')
  .map((file) => file.trim())
  .filter(Boolean);

if (!archivedFile) {
  throw new Error('Use --archived=<archived-gyms.csv>. Optional: --public-files=data/palestre.csv,static/palestre.csv --out=path/report.csv');
}

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
  return out.map((value) => value.trim());
}

function csvEscape(value) {
  const raw = String(value ?? '');
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/\b(asd|a s d|srl|s r l|ssd|s s d|societa sportiva dilettantistica|associazione sportiva dilettantistica)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugKey(value) {
  return normalizeKey(value).replace(/\s+/g, '-');
}

function readCsvRows(csvText, sourceFile) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] || '']));
    row.__source_file = sourceFile;
    row.__row_number = String(index + 2);
    return row;
  });
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (String(value || '').trim()) return String(value).trim();
  }
  return '';
}

function gymName(row) {
  return firstValue(row, ['nome palestra', 'nome', 'name', 'gym name']);
}

function gymId(row) {
  return firstValue(row, ['id', 'gym_id', 'uuid']);
}

function gymSlug(row) {
  return firstValue(row, ['slug', '_canonical_slug', 'canonical_slug']);
}

function indexArchivedRows(rows) {
  const indexes = {
    id: new Map(),
    slug: new Map(),
    name: new Map()
  };

  for (const row of rows) {
    const id = normalizeKey(gymId(row));
    const slug = slugKey(gymSlug(row));
    const name = normalizeKey(gymName(row));

    if (id) indexes.id.set(id, row);
    if (slug) indexes.slug.set(slug, row);
    if (name) indexes.name.set(name, row);
  }

  return indexes;
}

function findArchivedMatch(row, indexes) {
  const id = normalizeKey(gymId(row));
  if (id && indexes.id.has(id)) return { archived: indexes.id.get(id), reason: 'id' };

  const slug = slugKey(gymSlug(row));
  if (slug && indexes.slug.has(slug)) return { archived: indexes.slug.get(slug), reason: 'slug' };

  const name = normalizeKey(gymName(row));
  if (name && indexes.name.has(name)) return { archived: indexes.name.get(name), reason: 'normalized_name' };

  const nameSlug = slugKey(gymName(row));
  if (nameSlug && indexes.slug.has(nameSlug)) return { archived: indexes.slug.get(nameSlug), reason: 'name_to_slug' };

  return null;
}

const archivedRows = readCsvRows(await readFile(archivedFile, 'utf8'), archivedFile);
const archivedIndexes = indexArchivedRows(archivedRows);
const matches = [];

for (const publicFile of publicFiles) {
  const rows = readCsvRows(await readFile(publicFile, 'utf8'), publicFile);

  for (const row of rows) {
    const match = findArchivedMatch(row, archivedIndexes);
    if (!match) continue;

    matches.push({
      archived_gym_id: gymId(match.archived),
      archived_gym_name: gymName(match.archived),
      matched_public_csv_file: publicFile,
      matched_csv_row: row.__row_number,
      matched_csv_name: gymName(row),
      reason: match.reason
    });
  }
}

const headers = [
  'archived_gym_id',
  'archived_gym_name',
  'matched_public_csv_file',
  'matched_csv_row',
  'matched_csv_name',
  'reason'
];
const report = [
  headers.join(','),
  ...matches.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
].join('\n') + '\n';

if (outFile) {
  await writeFile(outFile, report, 'utf8');
} else {
  process.stdout.write(report);
}

const summary = `[archived-public-csv-drift] archived=${archivedRows.length} public_files=${publicFiles.length} matches=${matches.length}${outFile ? ` report=${path.resolve(outFile)}` : ''}`;

if (matches.length) {
  console.error(summary);
  process.exit(1);
}

console.error(summary);
