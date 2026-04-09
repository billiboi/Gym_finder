export const SITE_NAME = 'Palestre in Zona';
export const SITE_URL = 'https://www.palestreinzona.it';
export const SITE_DESCRIPTION =
  'Palestre in Zona ti aiuta a trovare palestre vicine con filtri per disciplina, posizione e distanza.';

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, SITE_URL).toString();
}

