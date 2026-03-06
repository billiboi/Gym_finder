import csvRaw from '../../../data/palestre.csv?raw';

function splitCsvLine(line, delimiter = ',') {
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

    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseAddress(fullAddress) {
  const raw = String(fullAddress || '').trim();
  if (!raw) return { address: '', city: '' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      address: parts.slice(0, -1).join(', '),
      city: parts.at(-1) || ''
    };
  }

  return { address: raw, city: '' };
}

function disciplinesFromField(value) {
  return String(value || '')
    .split('|')
    .map((d) => d.trim())
    .filter(Boolean);
}

function toNumberOrNull(value) {
  const n = Number(String(value || '').trim());
  return Number.isFinite(n) ? n : null;
}

export function readStaticGyms() {
  const lines = String(csvRaw || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const commaCount = splitCsvLine(headerLine, ',').length;
  const semicolonCount = splitCsvLine(headerLine, ';').length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const header = splitCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());
  const indexBy = Object.fromEntries(header.map((h, idx) => [h, idx]));

  const aliases = {
    name: ['nome palestra', 'name', 'gym name'],
    disciplines: ['discipline', 'martial arts', 'tipologia'],
    address: ['indirizzo', 'address', 'luogo'],
    phone: ['telefono', 'phone'],
    hours: ['orari di apertura', 'open_hours', 'opening hours', 'orari'],
    website: ['pagina web', 'website', 'url', 'sito'],
    lat: ['lat', 'latitude'],
    long: ['long', 'lng', 'longitude']
  };

  function getIndex(keys) {
    for (const key of keys) {
      if (key in indexBy) return indexBy[key];
    }
    return -1;
  }

  const idx = {
    name: getIndex(aliases.name),
    disciplines: getIndex(aliases.disciplines),
    address: getIndex(aliases.address),
    phone: getIndex(aliases.phone),
    hours: getIndex(aliases.hours),
    website: getIndex(aliases.website),
    lat: getIndex(aliases.lat),
    long: getIndex(aliases.long)
  };

  if (idx.name < 0) return [];

  const gyms = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i], delimiter);
    const read = (columnIndex) => (columnIndex >= 0 ? cols[columnIndex] ?? '' : '');

    const name = String(read(idx.name)).trim();
    if (!name) continue;

    const disciplineList = disciplinesFromField(read(idx.disciplines));
    const { address, city } = parseAddress(read(idx.address));

    gyms.push({
      id: `csv-${i}`,
      name,
      disciplines: disciplineList,
      discipline: disciplineList[0] || 'Fitness',
      address,
      city,
      phone: String(read(idx.phone) || '').trim(),
      hours_info: String(read(idx.hours) || '').trim() || 'Orari da verificare',
      website: String(read(idx.website) || '').trim(),
      latitude: toNumberOrNull(read(idx.lat)),
      longitude: toNumberOrNull(read(idx.long)),
      image_url: '',
      weekly_hours: {}
    });
  }

  return gyms;
}
