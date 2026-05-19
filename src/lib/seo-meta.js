import { SITE_NAME } from '$lib/site';

const HOME_TITLE = 'Trova Palestre Vicino a Te | Fitness, Boxe, Yoga e Arti Marziali';
const HOME_DESCRIPTION =
  'Scopri palestre, corsi e discipline vicino a te. Confronta orari, contatti, sedi e attività disponibili nella tua zona.';

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

export function buildGymSeoMeta({ name, city, discipline, disciplines = [], description } = {}) {
  const gymName = cleanSeoText(name) || 'Palestra';
  const cityText = cleanSeoText(city);
  const disciplineText = disciplineFallback(discipline);
  const disciplineList = Array.isArray(disciplines) ? disciplines.map(cleanSeoText).filter(Boolean) : [];
  const hasManyDisciplines = disciplineList.length >= 4;
  const martialSignals = ['Boxe', 'MMA', 'Kickboxing', 'Brazilian Jiu Jitsu', 'Judo', 'Karate', 'Krav Maga', 'Muay Thai'];
  const hasMartialCluster = disciplineList.filter((item) => martialSignals.includes(item)).length >= 2;
  const citySegment = cityText ? ` a ${cityText}` : '';
  const titleTail = hasManyDisciplines
    ? hasMartialCluster
      ? `${disciplineText} e arti marziali`
      : 'Corsi, orari e contatti'
    : `${disciplineText}, orari e contatti`;
  const title = trimAtWord(`${gymName}${citySegment} | ${titleTail}`, 68);
  const fallbackDescription = cityText
    ? `Scopri ${gymName} a ${cityText}: discipline, orari, contatti, sito ufficiale e informazioni utili per scegliere la palestra più adatta.`
    : `Scopri ${gymName}: discipline, orari, contatti, sito ufficiale e informazioni utili per scegliere la palestra più adatta.`;

  return {
    title,
    description: trimAtWord(description || fallbackDescription, 155)
  };
}

export function appendSiteName(title) {
  const text = cleanSeoText(title);
  if (!text || text.includes(SITE_NAME)) return text;
  return trimAtWord(`${text} | ${SITE_NAME}`, 72);
}
