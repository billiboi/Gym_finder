import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const CSV_PATH = path.join(process.cwd(), 'data', 'palestre.csv');
const OUT_PATH = path.join(process.cwd(), 'data', 'palestre_formattato.csv');

const HEADERS = [
  'nome palestra',
  'discipline',
  'indirizzo',
  'telefono',
  'orari di apertura',
  'pagina web',
  'lat',
  'long'
];

const DISCIPLINE_MAP = {
  box: 'Boxe', boxing: 'Boxe', boxe: 'Boxe', judo: 'Judo', karate: 'Karate',
  jiujitsu: 'Jujitsu', 'jiu jitsu': 'Jujitsu', bjj: 'Jujitsu Brasiliano',
  'jiujitsu brasiliano': 'Jujitsu Brasiliano', kickboxe: 'Kickboxe', kickboxing: 'Kickboxe',
  'muay thai': 'Muay Thai', k1: 'K1', mma: 'MMA', nuoto: 'Nuoto', yoga: 'Yoga',
  pilates: 'Pilates', crossfit: 'CrossFit', functional: 'Functional', bodybuilding: 'Bodybuilding',
  fitness: 'Fitness', calisthenics: 'Calisthenics'
};

function splitCsvLine(line) {
  const out = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]; const next = line[i + 1];
    if (ch === '"') { if (inQuotes && next === '"') { cur += '"'; i += 1; } else inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur); return out;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function clean(value) { return String(value ?? '').replace(/Ã‰/g,'É').replace(/Ã¨/g,'è').replace(/Ã©/g,'é').replace(/Â/g,'').trim(); }
function titleWords(value) {
  return clean(value).split(' ').filter(Boolean).map((w) => {
    if (w.length <= 3 && w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}
function normalizeDisciplineField(value) {
  const list = clean(value).split('|').map((d)=>clean(d).toLowerCase()).filter(Boolean).map((d)=>DISCIPLINE_MAP[d] || titleWords(d));
  const dedup = [...new Set(list)];
  return dedup.length ? dedup.join(' | ') : 'Fitness';
}
function normalizeAddress(value) {
  const parts = clean(value).split(',').map((p)=>titleWords(p)).filter(Boolean);
  return parts.length ? parts.join(', ') : 'Indirizzo non disponibile';
}
function normalizePhone(value) { const v = clean(value); return v ? v.replace(/\s+/g,' ') : 'Non disponibile'; }
function normalizeHours(value) {
  const v = clean(value);
  if (!v || /orari da verificare/i.test(v)) return 'Orari da verificare';
  return v.replace(/Lun-Dom 00:00-24:00/gi,'Aperto 24 ore su 24').replace(/\s*\|\s*/g,' | ').replace(/\s+/g,' ');
}
function normalizeWebsite(value) { const v = clean(value); if (!v) return 'Non disponibile'; return /^https?:\/\//i.test(v) ? v : `https://${v}`; }
function normalizeCoordinate(value) { const n = Number(clean(value)); return Number.isFinite(n) ? n.toFixed(6) : ''; }
function cityFromAddress(address) { const parts = address.split(',').map((p)=>p.trim()).filter(Boolean); return parts.at(-1) || 'Zzz'; }

async function run() {
  const raw = await readFile(CSV_PATH,'utf-8');
  const lines = raw.replace(/^\uFEFF/,'').split(/\r?\n/).filter((l)=>l.trim()!=='');
  const header = splitCsvLine(lines[0]).map((h)=>clean(h).toLowerCase());
  const map = Object.fromEntries(header.map((h,i)=>[h,i]));
  for (const h of HEADERS) if (!(h in map)) throw new Error(`Header mancante: ${h}`);

  const rows = [];
  for (let i=1;i<lines.length;i+=1) {
    const cols = splitCsvLine(lines[i]); const get=(k)=>cols[map[k]] ?? '';
    const row = {
      nome: titleWords(get('nome palestra')),
      discipline: normalizeDisciplineField(get('discipline')),
      indirizzo: normalizeAddress(get('indirizzo')),
      telefono: normalizePhone(get('telefono')),
      orari: normalizeHours(get('orari di apertura')),
      pagina: normalizeWebsite(get('pagina web')),
      lat: normalizeCoordinate(get('lat')),
      long: normalizeCoordinate(get('long'))
    };
    if (!row.nome) continue;
    rows.push(row);
  }

  rows.sort((a,b)=>{ const c=cityFromAddress(a.indirizzo).localeCompare(cityFromAddress(b.indirizzo),'it'); return c!==0?c:a.nome.localeCompare(b.nome,'it'); });
  const out = [HEADERS, ...rows.map((r)=>[r.nome,r.discipline,r.indirizzo,r.telefono,r.orari,r.pagina,r.lat,r.long])]
    .map((r)=>r.map(csvEscape).join(','))
    .join('\n');

  await writeFile(OUT_PATH, out, 'utf-8');
  try {
    await copyFile(OUT_PATH, CSV_PATH);
    console.log(`CSV formattato e sincronizzato su palestre.csv (${rows.length} record)`);
  } catch {
    console.log(`CSV formattato creato in palestre_formattato.csv (${rows.length} record)`);
  }
}

run().catch((err)=>{ console.error(err.message || err); process.exit(1); });
