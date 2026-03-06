import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const uploadsDir = path.join(process.cwd(), 'static', 'uploads');
const dataFilePath = path.join(dataDir, 'gyms.json');

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadsDir, { recursive: true });

  try {
    await readFile(dataFilePath, 'utf-8');
  } catch {
    await writeFile(dataFilePath, '[]', 'utf-8');
  }
}

export async function readGyms() {
  await ensureStorage();
  const raw = await readFile(dataFilePath, 'utf-8');
  const gyms = JSON.parse(raw);
  return Array.isArray(gyms) ? gyms : [];
}

export async function writeGyms(gyms) {
  await ensureStorage();
  await writeFile(dataFilePath, JSON.stringify(gyms, null, 2), 'utf-8');
}

export function getUploadsDir() {
  return uploadsDir;
}
