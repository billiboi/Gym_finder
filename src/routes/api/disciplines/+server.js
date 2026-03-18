import { json } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';

function normalizeDisciplineLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();

  if (/(^|\b)(bjj|jiu[\s-]*jitsu brasiliano|brazilian jiu[\s-]*jitsu)(\b|$)/i.test(lower)) {
    return 'JiuJitsu Brasiliano';
  }

  if (/(^|\b)(jiu[\s-]*jitsu)(\b|$)/i.test(lower)) {
    return 'JiuJitsu';
  }

  if (/(^|\b)(kick[\s-]*box(e|ing)?)(\b|$)/i.test(lower)) {
    return 'Kickboxe';
  }

  if (/(^|\b)(muay[\s-]*thai)(\b|$)/i.test(lower)) {
    return 'Muay Thai';
  }

  if (/(^|\b)(k1)(\b|$)/i.test(lower)) {
    return 'K1';
  }

  if (/(^|\b)(mma|mixed martial arts)(\b|$)/i.test(lower)) {
    return 'MMA';
  }

  if (/(^|\b)(boxe|boxing)(\b|$)/i.test(lower)) {
    return 'Boxe';
  }

  if (/(^|\b)(judo)(\b|$)/i.test(lower)) {
    return 'Judo';
  }

  if (/(^|\b)(karate|kyokushin|shito[\s-]*ryu|wa[\s-]*rei[\s-]*ryu)(\b|$)/i.test(lower)) {
    return 'Karate';
  }

  if (/(^|\b)(taekwondo)(\b|$)/i.test(lower)) {
    return 'Taekwondo';
  }

  if (/(^|\b)(aikido)(\b|$)/i.test(lower)) {
    return 'Aikido';
  }

  if (/(^|\b)(wing[\s-]*chun|win[\s-]*chun|win[\s-]*chung)(\b|$)/i.test(lower)) {
    return 'Wing Chun';
  }

  if (/(^|\b)(kung[\s-]*fu|choy)(\b|$)/i.test(lower)) {
    return 'Kung Fu';
  }

  if (/(^|\b)(tai[\s-]*chi|taiji)(\b|$)/i.test(lower)) {
    return 'Tai Chi';
  }

  if (/(^|\b)(difesa personale|autodifesa|self defense)(\b|$)/i.test(lower)) {
    return 'Difesa Personale';
  }

  if (/(^|\b)(scherma|fencing)(\b|$)/i.test(lower)) {
    return 'Scherma';
  }

  if (/(^|\b)(chanbara)(\b|$)/i.test(lower)) {
    return 'Chanbara';
  }

  if (/(^|\b)(crossfit)(\b|$)/i.test(lower)) {
    return 'CrossFit';
  }

  if (/(^|\b)(pilates)(\b|$)/i.test(lower)) {
    return 'Pilates';
  }

  if (/(^|\b)(yoga)(\b|$)/i.test(lower)) {
    return 'Yoga';
  }

  if (/(^|\b)(nuoto|swim)(\b|$)/i.test(lower)) {
    return 'Nuoto';
  }

  if (/(^|\b)(calisthenics)(\b|$)/i.test(lower)) {
    return 'Calisthenics';
  }

  if (/(^|\b)(functional)(\b|$)/i.test(lower)) {
    return 'Functional';
  }

  if (/(^|\b)(bodybuilding)(\b|$)/i.test(lower)) {
    return 'Bodybuilding';
  }

  if (/(^|\b)(fitness)(\b|$)/i.test(lower)) {
    return 'Fitness';
  }

  return raw;
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

export async function GET({ fetch }) {
  try {
    const gyms = await readGyms();
    if (Array.isArray(gyms) && gyms.length > 0) {
      return json(disciplinesFromGyms(gyms));
    }

    const csvResponse = await fetch('/palestre.csv');
    if (!csvResponse.ok) return json([]);

    const csvText = await csvResponse.text();
    return json(parseDisciplines(csvText));
  } catch {
    return json([]);
  }
}
