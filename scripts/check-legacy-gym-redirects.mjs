import { readFile } from 'node:fs/promises';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=') || '1'];
}));

const csvFile = args.get('--csv') || '';
const baseUrl = String(args.get('--base-url') || '').replace(/\/$/, '');

if (!csvFile || !baseUrl) {
  throw new Error('Use --csv=<legacy-redirects.csv> --base-url=<https://example.com>.');
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

function readRows(csvText) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function absoluteUrl(value) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return `${baseUrl}${value}`;
  return `${baseUrl}/palestre/${value}`;
}

function isActiveLegacyRow(row) {
  const status = String(row.status || '').trim();
  const deletedAt = String(row.deleted_at || row.deletedat || row._deleted_at || '').trim();
  const oldValue = row.old_url || row.legacy_url || row.old_slug || row.legacy_slug || '';
  return !deletedAt && status !== '410' && oldValue.includes('csv-');
}

const rows = readRows(await readFile(csvFile, 'utf8')).filter(isActiveLegacyRow);
const failures = [];

for (const row of rows) {
  const from = absoluteUrl(row.old_url || row.legacy_url || row.old_slug || row.legacy_slug);
  const to = absoluteUrl(row.new_url || row.clean_url || row.canonical_url || row.new_slug || row.clean_slug || row.canonical_slug);
  if (!from || !to || from === to) continue;

  const response = await fetch(from, { method: 'GET', redirect: 'manual' });
  const location = response.headers.get('location') || '';
  const resolvedLocation = location ? new URL(location, baseUrl).toString() : '';
  if (response.status !== 301 || resolvedLocation !== to) {
    failures.push({ from, expected: to, status: response.status, location: resolvedLocation });
  }
}

if (failures.length) {
  console.error(`[legacy-gym-redirects] FAIL checked=${rows.length} failures=${failures.length}`);
  for (const failure of failures.slice(0, 20)) {
    console.error(`${failure.status} ${failure.from} -> ${failure.location || '(none)'} expected ${failure.expected}`);
  }
  process.exit(1);
}

console.log(`[legacy-gym-redirects] OK checked=${rows.length}`);
