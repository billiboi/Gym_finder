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

function countLabel(gymCount, hasMore) {
  const count = Number(gymCount) > 0 ? Math.floor(Number(gymCount)) : 0;
  if (!count) return '';
  return hasMore ? `${count}+` : `${count}`;
}

export function buildDisciplineSeoMeta(disciplineName, topCities = [], gymCount = 0, hasMore = false) {
  const discipline = disciplineFallback(disciplineName);
  const cities = Array.isArray(topCities) ? topCities.map(cleanSeoText).filter(Boolean) : [];
  const label = countLabel(gymCount, hasMore);

  const contentTitle = label
    ? trimAtWord(`Palestre di ${discipline}: ${label} schede, orari e contatti`, 52)
    : trimAtWord(`Palestre di ${discipline} vicino a te: orari e contatti`, 52);
  const title = appendSiteName(contentTitle);

  const countClause = label ? `${label} palestre` : 'Palestre';
  const cityClause = cities.length ? ` a ${cities.slice(0, 3).join(', ')}` : ' vicino a te';
  const description = trimAtWord(
    `${countClause} di ${discipline}${cityClause}: confronta orari, contatti e sedi disponibili.`,
    155
  );

  return { title, description };
}

export function buildLocationSeoMeta(cityName, topDisciplines = [], gymCount = 0, hasMore = false) {
  const city = cleanSeoText(cityName);
  const place = city || 'questa zona';
  const disciplineText = topDisciplines.length ? topDisciplines.slice(0, 3).join(', ') : 'fitness, boxe, yoga';
  const label = countLabel(gymCount, hasMore);

  const contentTitle = label
    ? trimAtWord(`Palestre a ${place}: ${label} schede, orari e contatti`, 52)
    : trimAtWord(`Palestre a ${place}: orari e contatti`, 52);
  const title = appendSiteName(contentTitle);

  const countClause = label ? `${label} palestre` : 'Palestre';
  const description = trimAtWord(
    `${countClause} a ${place}: ${disciplineText}, arti marziali e corsi disponibili. Orari, contatti e sedi.`,
    155
  );

  return { title, description };
}

export function buildDisciplineCitySeoMeta(disciplineName, cityName, gymCount = 0, hasMore = false) {
  const discipline = disciplineFallback(disciplineName);
  const city = cleanSeoText(cityName) || 'questa zona';
  const label = countLabel(gymCount, hasMore);

  const contentTitle = label
    ? trimAtWord(`${discipline} a ${city}: ${label} palestre, orari e contatti`, 52)
    : trimAtWord(`${discipline} a ${city}: orari e contatti`, 52);
  const title = appendSiteName(contentTitle);

  const countClause = label ? `${label} palestre` : 'Palestre';
  const description = trimAtWord(
    `${countClause} di ${discipline} a ${city}: confronta orari, contatti e sedi disponibili.`,
    155
  );

  return { title, description };
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
