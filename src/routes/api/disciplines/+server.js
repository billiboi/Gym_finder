import { json } from '@sveltejs/kit';
import { normalizeDisciplineLabel, publicDisciplineFilterOptions } from '$lib/disciplines';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_READ_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const SUPABASE_GYMS_TABLE = process.env.SUPABASE_GYMS_TABLE || 'gyms';
const hasSupabaseRead = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);
const DISCIPLINE_SELECT = ['discipline', 'disciplines', 'deleted_at'];

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_READ_KEY,
    Authorization: `Bearer ${SUPABASE_READ_KEY}`
  };
}

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
    .map((d) => normalizeDisciplineLabel(d))
    .filter(Boolean);
}

function disciplinesFromGyms(gyms) {
  const set = new Set();

  gyms.forEach((gym) => {
    if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
      gym.disciplines
        .map((d) => normalizeDisciplineLabel(d))
        .filter(Boolean)
        .forEach((d) => set.add(d));
      return;
    }

    disciplinesFromField(gym.discipline).forEach((d) => set.add(d));
  });

  return publicDisciplineFilterOptions(set);
}

async function readDisciplineRows() {
  if (!hasSupabaseRead) return null;

  const params = [
    `select=${encodeURIComponent(DISCIPLINE_SELECT.join(','))}`,
    'deleted_at=is.null',
    'limit=5000'
  ];
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_GYMS_TABLE}?${params.join('&')}`, {
    method: 'GET',
    headers: supabaseHeaders()
  });

  if (!response.ok) return null;

  const data = await response.json();
  return Array.isArray(data) ? data : [];
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
      .forEach((d) => set.add(normalizeDisciplineLabel(d)));
  }

  return publicDisciplineFilterOptions(set);
}

export async function GET({ fetch }) {
  try {
    const gyms = await readDisciplineRows();
    if (Array.isArray(gyms) && gyms.length > 0) {
      return json(disciplinesFromGyms(gyms), {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800'
        }
      });
    }

    const csvResponse = await fetch('/palestre.csv');
    if (!csvResponse.ok) return json([]);

    const csvText = await csvResponse.text();
    return json(parseDisciplines(csvText), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800'
      }
    });
  } catch {
    return json([], {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      }
    });
  }
}
