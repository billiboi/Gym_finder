import { clean, firstValue, hasCoordinates, hasUsableHours } from './gym-normalizer.js';

// Essential fields: without all of these a description can't reference a real,
// identifiable gym at all - listings missing any of them are never eligible for
// generation regardless of how many enrichment fields they have.
const ESSENTIAL_FIELD_CHECKS = [
  (gym) => Boolean(clean(firstValue(gym, ['nome', 'name']))),
  (gym) => Boolean(clean(firstValue(gym, ['citta', 'city']))),
  (gym) => {
    const disciplines = Array.isArray(gym?.disciplines) ? gym.disciplines : [];
    return disciplines.length > 0 || Boolean(clean(firstValue(gym, ['discipline'])));
  }
];

// The four fields the approved threshold gates on: essentials present + at
// least GATING_ENRICHMENT_THRESHOLD of these, so a generated description has
// enough specific, verifiable facts to draw on (target: 3-4 concrete claims).
const GATING_ENRICHMENT_CHECKS = {
  sito: (gym) => Boolean(clean(firstValue(gym, ['sito', 'website']))),
  telefono: (gym) => Boolean(clean(firstValue(gym, ['telefono', 'phone']))),
  orari: (gym) => hasUsableHours(firstValue(gym, ['orari', 'hours_info'])),
  prezzo: (gym) => Boolean(clean(firstValue(gym, ['price_info'])))
};

const GATING_ENRICHMENT_THRESHOLD = 3;

// Additional signals folded into the 0-100 score for admin sorting/prioritization,
// but not counted toward the pass/fail gate above.
const BONUS_ENRICHMENT_CHECKS = {
  indirizzo: (gym) => Boolean(clean(firstValue(gym, ['indirizzo', 'address']))),
  coordinate: hasCoordinates,
  immagine: (gym) => Boolean(clean(firstValue(gym, ['image_url']))),
  social: (gym) => Array.isArray(gym?.social_links) && gym.social_links.length > 0
};

export function hasEssentialDescriptionFields(gym) {
  return ESSENTIAL_FIELD_CHECKS.every((check) => check(gym));
}

export function descriptionGatingFieldsPresent(gym) {
  return Object.entries(GATING_ENRICHMENT_CHECKS)
    .filter(([, check]) => check(gym))
    .map(([name]) => name);
}

export function meetsDescriptionThreshold(gym) {
  return (
    hasEssentialDescriptionFields(gym) &&
    descriptionGatingFieldsPresent(gym).length >= GATING_ENRICHMENT_THRESHOLD
  );
}

export function computeDescriptionReadinessScore(gym) {
  if (!hasEssentialDescriptionFields(gym)) return 0;

  const allChecks = [...Object.values(GATING_ENRICHMENT_CHECKS), ...Object.values(BONUS_ENRICHMENT_CHECKS)];
  const passed = allChecks.filter((check) => check(gym)).length;

  return Math.max(0, Math.min(100, Math.round((passed / allChecks.length) * 100)));
}
