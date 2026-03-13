import { json } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';
import { readDisciplines } from '$lib/server/discipline-store';

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

function disciplinesFromField(value) {
  return String(value || '')
    .split('|')
    .map((d) => d.trim())
    .filter(Boolean);
}

function disciplinesFromGyms(gyms) {
  const set = new Set();

  gyms.forEach((gym) => {
    if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
      gym.disciplines.map((d) => String(d).trim()).filter(Boolean).forEach((d) => set.add(d));
      return;
    }

    disciplinesFromField(gym.discipline).forEach((d) => set.add(d));
  });

  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}

function parseDisciplines(csvText) {
  const lines = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const commaCount = splitCsvLine(headerLine, ',').length;
  const semicolonCount = splitCsvLine(headerLine, ';').length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const header = splitCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());
  const idx = header.findIndex((h) => ['discipline', 'martial arts', 'tipologia'].includes(h));
  if (idx < 0) return [];

  const set = new Set();

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i], delimiter);
    const raw = String(cols[idx] || '');
    raw
      .split('|')
      .map((d) => d.trim())
      .filter(Boolean)
      .forEach((d) => set.add(d));
  }

  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}

function mergeDisciplines(...lists) {
  const set = new Set();
  lists
    .flat()
    .map((d) => String(d || '').trim())
    .filter(Boolean)
    .forEach((d) => set.add(d));
  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}

export async function GET({ fetch }) {
  try {
    const stored = await readDisciplines();
    const gyms = await readGyms();
    if (Array.isArray(gyms) && gyms.length > 0) {
      return json(mergeDisciplines(stored, disciplinesFromGyms(gyms)));
    }

    const csvResponse = await fetch('/palestre.csv');
    if (!csvResponse.ok) return json(stored);

    const csvText = await csvResponse.text();
    return json(mergeDisciplines(stored, parseDisciplines(csvText)));
  } catch {
    return json([]);
  }
}
