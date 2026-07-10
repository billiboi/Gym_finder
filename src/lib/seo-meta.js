import { SITE_NAME } from '$lib/site';
import { todayHoursLabel } from '$lib/hours';

const HOME_TITLE = 'Trova Palestre Vicino a Te | Confronta Orari e Prezzi';
const HOME_DESCRIPTION =
  'Trova la palestra giusta vicino a te: confronta orari, prezzi, discipline e contatti. Fitness, boxe, yoga, pilates e arti marziali in Italia e Ticino.';

function cleanSeoText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimAtWord(value, maxLength) {
  const text = cleanSeoText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).replace(/\s+\S*$/, '').trim()}...`;
}

function disciplineFallback(value) {
  return cleanSeoText(value) || 'palestra';
}

export function buildHomepageSeoMeta() {
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION
  };
}

export function buildDisciplineSeoMeta(disciplineName) {
  const discipline = disciplineFallback(disciplineName);
  return {
    title: trimAtWord(`Palestre di ${discipline} vicino a te | Orari, contatti e corsi`, 68),
    description: trimAtWord(
      `Trova corsi di ${discipline} vicino a te. Confronta palestre, orari, contatti, sedi e discipline disponibili.`,
      155
    )
  };
}

export function buildLocationSeoMeta(cityName, topDisciplines = []) {
  const city = cleanSeoText(cityName);
  const place = city || 'questa zona';
  const disciplineText = topDisciplines.length ? topDisciplines.slice(0, 3).join(', ') : 'fitness, boxe, yoga';

  return {
    title: trimAtWord(`Palestre a ${place} | Fitness, Boxe, Yoga, orari e contatti`, 68),
    description: trimAtWord(
      `Scopri palestre a ${place}: ${disciplineText}, arti marziali e corsi disponibili. Trova orari, contatti e sedi vicino a te.`,
      155
    )
  };
}

export function buildGymSeoMeta({
  name,
  city,
  discipline,
  disciplines = [],
  description,
  hoursInfo,
  price
} = {}) {
  const gymName = cleanSeoText(name) || 'Palestra';
  const cityText = cleanSeoText(city);
  const disciplineText = disciplineFallback(discipline);
  const disciplineList = Array.isArray(disciplines) ? disciplines.map(cleanSeoText).filter(Boolean) : [];
  const priceText = cleanSeoText(price);
  const citySegment = cityText ? ` a ${cityText}` : '';

  const base = `${gymName}${citySegment}`;
  const titleCandidates = [
    priceText ? `${base}: orari, prezzi e contatti` : null,
    `${base}: orari e contatti`,
    trimAtWord(base, 52)
  ].filter(Boolean);
  const contentTitle = titleCandidates.find((candidate) => candidate.length <= 52) || titleCandidates[titleCandidates.length - 1];
  const title = appendSiteName(contentTitle);

  if (description) {
    return { title, description: trimAtWord(description, 155) };
  }

  const disciplineSummary = disciplineList.length ? disciplineList.slice(0, 3).join(', ') : disciplineText;
  const hoursLabel = todayHoursLabel(hoursInfo);
  const sentenceParts = [`${gymName}${citySegment}: ${disciplineSummary}.`];
  if (hoursLabel) sentenceParts.push(`${hoursLabel}.`);
  if (priceText) sentenceParts.push(`${priceText}.`);
  sentenceParts.push('Orari, contatti e mappa.');

  return {
    title,
    description: trimAtWord(sentenceParts.join(' '), 155)
  };
}

export function appendSiteName(title) {
  const text = cleanSeoText(title);
  if (!text || text.includes(SITE_NAME)) return text;
  return trimAtWord(`${text} | ${SITE_NAME}`, 72);
}
