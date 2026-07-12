import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { getUploadsDir } from '$lib/server/gym-store';
import { normalizeDisciplineField, normalizeDisciplineSlugs } from '$lib/disciplines';

// Shared by /admin/schede (create) and /admin/gyms/[id] (update) so the two
// gym-editing surfaces never diverge on validation or image handling again.

export function clean(value) {
  return String(value ?? '').trim();
}

export function toNullableNumber(value) {
  const raw = clean(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function toDisciplines(value) {
  const list = normalizeDisciplineField(value, []).disciplines;
  return list.length ? list : [];
}

export function disciplineAliases(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).aliases;
}

export function disciplineSlugs(value, fallback = []) {
  return normalizeDisciplineSlugs(value, fallback);
}

export function isValidUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function normalizePhone(value) {
  return clean(value).replace(/[^\d+\s().-]/g, '').replace(/\s+/g, ' ');
}

export function validateGymPayload({ name, city, disciplines, website }) {
  if (!name) return 'Nome palestra obbligatorio.';
  if (!city) return 'Città/località obbligatoria.';
  if (!disciplines.length) return 'Inserisci almeno una disciplina.';
  if (!isValidUrl(website)) return 'Il sito web deve essere un URL valido con http:// o https://.';
  return '';
}

export function sanitizeFileName(value) {
  return (
    String(value || 'image')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

export function isValidImageUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  if (raw.startsWith('data:image/')) return true;

  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function storeImage(file, gymName) {
  if (!(file instanceof File) || file.size === 0) return '';

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.type)) {
    throw new Error('Formato immagine non supportato. Usa JPG, PNG, WEBP o GIF.');
  }

  const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };

  const fileName = `${sanitizeFileName(gymName)}-${Date.now()}${extMap[file.type] || '.jpg'}`;
  const targetPath = path.join(getUploadsDir(), fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);
  return `/uploads/${fileName}`;
}

export async function persistentImageFromFile(file, gymName) {
  if (!(file instanceof File) || file.size === 0) return '';

  const isVercelRuntime = process.env.VERCEL === '1';
  if (!isVercelRuntime) {
    return storeImage(file, gymName);
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.type)) {
    throw new Error('Formato immagine non supportato. Usa JPG, PNG, WEBP o GIF.');
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Immagine troppo grande. Usa un file sotto 5 MB oppure incolla un URL immagine.');
  }

  const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  const fileName = `${sanitizeFileName(gymName)}-${Date.now()}${extMap[file.type] || '.jpg'}`;
  const blob = await put(fileName, file, { access: 'public', contentType: file.type });
  return blob.url;
}
