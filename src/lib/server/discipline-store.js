import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const staticDir = path.join(process.cwd(), 'static');
const dataFilePath = path.join(dataDir, 'disciplines.json');
const staticFilePath = path.join(staticDir, 'disciplines.json');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const RUNTIME_CACHE_KEY = '__gymfinder_runtime_disciplines__';

function getRuntimeDisciplines() {
  const cache = globalThis[RUNTIME_CACHE_KEY];
  if (!Array.isArray(cache)) return null;
  return normalizeDisciplines(cache);
}

function setRuntimeDisciplines(list) {
  globalThis[RUNTIME_CACHE_KEY] = normalizeDisciplines(list);
}

function normalizeDisciplines(list) {
  const set = new Set(
    (Array.isArray(list) ? list : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  );
  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(staticDir, { recursive: true });

  try {
    await readFile(dataFilePath, 'utf-8');
  } catch {
    await writeFile(dataFilePath, '[]', 'utf-8');
  }
}

async function readDisciplinesFromFile(filePath) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return normalizeDisciplines(parsed);
  } catch {
    return [];
  }
}

export async function readDisciplines() {
  const runtime = getRuntimeDisciplines();
  if (runtime && runtime.length) return runtime;

  if (!isReadOnlyRuntime) {
    await ensureStorage();
  }

  const fromData = await readDisciplinesFromFile(dataFilePath);
  if (fromData.length) return fromData;

  const fromStatic = await readDisciplinesFromFile(staticFilePath);
  return fromStatic;
}

export async function writeDisciplines(list) {
  const normalized = normalizeDisciplines(list);

  if (isReadOnlyRuntime) {
    setRuntimeDisciplines(normalized);
    return;
  }

  await ensureStorage();
  const payload = JSON.stringify(normalized, null, 2);
  await writeFile(dataFilePath, payload, 'utf-8');
  await writeFile(staticFilePath, payload, 'utf-8');
}
