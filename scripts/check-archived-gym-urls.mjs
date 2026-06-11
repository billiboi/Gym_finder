import { readFile } from 'node:fs/promises';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=') || '1'];
}));

const csvFile = args.get('--csv') || '';
const baseUrl = String(args.get('--base-url') || '').replace(/\/$/, '');

if (!csvFile || !baseUrl) {
  throw new Error('Use --csv=<archived-gyms.csv> --base-url=<https://example.com>.');
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

function rowUrl(row) {
  const explicit = row.url || row.old_url || row.legacy_url || row.clean_url || row.new_url || '';
  if (explicit.startsWith('http')) return explicit;
  if (explicit.startsWith('/')) return `${baseUrl}${explicit}`;

  const slug = row.slug || row.old_slug || row.legacy_slug || row.clean_slug || row.new_slug || '';
  return slug ? `${baseUrl}/palestre/${slug}` : '';
}

function isArchivedRow(row) {
  const status = String(row.status || '').trim();
  const deletedAt = String(row.deleted_at || row.deletedat || row._deleted_at || '').trim();
  const archived = String(row.archived || row.is_archived || '').trim().toLowerCase();
  return Boolean(deletedAt || status === '410' || ['1', 'true', 'yes', 'si', 'archived', 'deleted'].includes(archived));
}

const rows = readRows(await readFile(csvFile, 'utf8')).filter(isArchivedRow);
const failures = [];

for (const row of rows) {
  const url = rowUrl(row);
  if (!url) continue;
  const response = await fetch(url, { method: 'GET', redirect: 'manual' });
  if (![404, 410].includes(response.status)) failures.push({ url, status: response.status });
}

if (failures.length) {
  console.error(`[archived-gym-urls] FAIL checked=${rows.length} failures=${failures.length}`);
  for (const failure of failures.slice(0, 20)) console.error(`${failure.status} ${failure.url}`);
  process.exit(1);
}

console.log(`[archived-gym-urls] OK checked=${rows.length}`);
