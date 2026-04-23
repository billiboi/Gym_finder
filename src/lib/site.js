export const SITE_NAME = 'Palestre in Zona';
export const SITE_URL = 'https://palestreinzona.it';
export const SITE_DESCRIPTION =
  'Palestre in Zona ti aiuta a trovare palestre vicine con filtri per disciplina, posizione e distanza.';
export const SITE_CONTACT_EMAIL = 'vdauria94@gmail.com';
export const SITE_CONTACT_MAILTO = `mailto:${SITE_CONTACT_EMAIL}`;

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, SITE_URL).toString();
}

function cleanJsonLdValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(cleanJsonLdValue)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, cleanJsonLdValue(item)])
      .filter(([, item]) => item !== undefined);

    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;

  return value;
}

export function serializeJsonLd(data) {
  return JSON.stringify(cleanJsonLdValue(data), null, 0);
}

export function jsonLdScript(data) {
  const safeJson = serializeJsonLd(data)
    .replace(/</g, '\\u003c')
    .replace(/<\/script/gi, '<\\/script');

  return `<script type="application/ld+json">${safeJson}</script>`;
}
