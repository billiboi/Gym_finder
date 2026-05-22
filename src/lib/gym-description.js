import { normalizeDisciplineLabel } from './disciplines.js';

const DEFAULT_DESCRIPTION =
  'Scheda in aggiornamento: sono disponibili i dati principali per identificare la struttura, con alcuni dettagli ancora da verificare.';

const PROMOTION_PATTERN =
  /\b(gratis|gratuit[aoie]?|promo|promozione|offerta|sconto|chf|eur|euro|€|\d+\s*(?:chf|eur|euro|€))\b/i;

const GENERIC_PATTERN =
  /^(palestra|palestra fitness|centro fitness|struttura sportiva|fitness)$/i;

const MARTIAL_DISCIPLINES = new Set([
  'Aikido',
  'Arti Marziali',
  'Boxe',
  'Brazilian Jiu Jitsu',
  'Difesa Personale',
  'Grappling',
  'Judo',
  'Jujitsu',
  'Karate',
  'K1',
  'Kickboxing',
  'Krav Maga',
  'MMA',
  'Muay Thai',
  'Taekwondo',
  'Wing Chun'
]);

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stripDiacritics(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function compactTokens(value) {
  return stripDiacritics(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function containsText(haystack, needle) {
  const normalizedNeedle = stripDiacritics(needle);
  if (!normalizedNeedle) return true;
  return stripDiacritics(haystack).includes(normalizedNeedle);
}

function textContainsDifferentKnownValue(text, ownValue, knownValues = []) {
  const normalizedOwn = stripDiacritics(ownValue);
  const normalizedText = stripDiacritics(text);
  if (!normalizedText) return false;

  return knownValues.some((value) => {
    const normalizedValue = stripDiacritics(value);
    return (
      normalizedValue &&
      normalizedValue !== normalizedOwn &&
      normalizedValue.length >= 4 &&
      normalizedText.includes(normalizedValue)
    );
  });
}

function disciplineList(gym) {
  const raw = Array.isArray(gym?.disciplines) && gym.disciplines.length
    ? gym.disciplines
    : clean(gym?.discipline)
        .split('|')
        .map(clean)
        .filter(Boolean);

  const normalized = raw.map((item) => normalizeDisciplineLabel(item)).filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ['Fitness'];
}

function primaryDiscipline(gym) {
  return disciplineList(gym)[0] || 'Fitness';
}

function contextualDiscipline(gym, context = {}) {
  const currentDiscipline = normalizeDisciplineLabel(context.currentDiscipline || '');
  const disciplines = disciplineList(gym);
  if (currentDiscipline && disciplines.includes(currentDiscipline)) {
    return currentDiscipline;
  }
  return disciplines[0] || 'Fitness';
}

function safeCity(gym) {
  return clean(gym?.citta || gym?.city);
}

function safeAddress(gym) {
  return clean(gym?.indirizzo || gym?.address);
}

function safeName(gym) {
  return clean(gym?.nome || gym?.name || 'Questa struttura');
}

function isOwnerDescriptionApproved(gym) {
  return Boolean(
    gym?.descrizione_owner_approved ||
      gym?.owner_description_approved ||
      gym?.claim_approved ||
      gym?.owner_claim_approved ||
      gym?.weekly_hours?._descrizione_owner_approved ||
      gym?.weekly_hours?._claim_approved ||
      gym?.is_verified ||
      gym?.verified
  );
}

export function descriptionIssues(gym, description, context = {}) {
  const text = clean(description);
  const name = safeName(gym);
  const city = safeCity(gym);
  const allNames = context.names || [];
  const allCities = context.cities || [];
  const issues = [];

  if (!text) issues.push('missing');
  if (text && text.length < 120) issues.push('too_short');
  if (text && text.length > 900) issues.push('too_long');
  if (text && GENERIC_PATTERN.test(text)) issues.push('too_generic');
  if (text && PROMOTION_PATTERN.test(text) && !gym?.price_verified && !gym?.weekly_hours?._price_verified) {
    issues.push('unverified_commercial_data');
  }
  if (text && name && !containsText(text, name)) {
    issues.push('missing_name');
  }
  if (text && city && !containsText(text, city)) {
    issues.push('missing_city');
  }
  if (text && textContainsDifferentKnownValue(text, name, allNames)) {
    issues.push('mentions_other_gym');
  }
  if (text && textContainsDifferentKnownValue(text, city, allCities)) {
    issues.push('mentions_other_city');
  }

  return [...new Set(issues)];
}

export function isUnsafePublicDescription(gym, description, context = {}) {
  const issues = descriptionIssues(gym, description, context);
  return issues.some((issue) =>
    [
      'missing',
      'too_short',
      'too_generic',
      'unverified_commercial_data',
      'mentions_other_gym',
      'mentions_other_city'
    ].includes(issue)
  );
}

export function getSafePublicDescription(gym, context = {}) {
  const name = safeName(gym);
  const city = safeCity(gym);
  const discipline = contextualDiscipline(gym, context);
  const address = safeAddress(gym);

  if (city && address) {
    return `${name} è una struttura sportiva a ${city}, in ${address}, collegata a ${discipline || 'palestra'}. Le informazioni disponibili aiutano a verificare indirizzo, orari e contatti; alcuni dettagli specifici potrebbero richiedere ulteriore conferma.`;
  }

  if (city) {
    return `${name} è una struttura sportiva a ${city} collegata a ${discipline || 'palestra'}. Le informazioni disponibili aiutano a verificare indirizzo, orari e contatti; alcuni dettagli specifici potrebbero richiedere ulteriore conferma.`;
  }

  return `${name} è una struttura sportiva collegata a ${discipline || 'palestra'}. Le informazioni disponibili includono i dati principali della scheda; alcuni dettagli specifici potrebbero richiedere ulteriore conferma.`;
}

export function safeFallbackDescription(gym, context = {}) {
  return getSafePublicDescription(gym, context);
}

export function contextualCardDescription(gym, currentDiscipline = '', maxLength = 180) {
  const normalizedCurrent = normalizeDisciplineLabel(currentDiscipline);
  const disciplines = disciplineList(gym);
  const context = normalizedCurrent && disciplines.includes(normalizedCurrent)
    ? { currentDiscipline: normalizedCurrent }
    : {};

  if (context.currentDiscipline) {
    return trimDescription(getSafePublicDescription(gym, context), maxLength);
  }

  return shortPublicDescription(gym, maxLength);
}

export function pickPublicDescription(gym, context = {}) {
  const flaggedForReview = Boolean(
    gym?.needs_review ||
      gym?.data_quality_flags?.length ||
      gym?.weekly_hours?._needs_review ||
      gym?.weekly_hours?._public_data_quarantine
  );
  const safePublicDescription = clean(gym?.safe_public_description);

  if (flaggedForReview) {
    const fallback = safePublicDescription || safeFallbackDescription(gym, context) || DEFAULT_DESCRIPTION;
    return {
      text: fallback,
      source: 'fallback_sicuro',
      qualityScore: scoreDescription(gym, fallback, context),
      needsReview: true
    };
  }

  const explicitPublicDescription = clean(gym?.descrizione_pubblica);
  if (explicitPublicDescription && !isUnsafePublicDescription(gym, explicitPublicDescription, context)) {
    return {
      text: explicitPublicDescription,
      source: clean(gym?.descrizione_source) || 'pubblica',
      qualityScore: scoreDescription(gym, explicitPublicDescription, context),
      needsReview: Boolean(gym?.descrizione_needs_review)
    };
  }

  const generatedNeedsReview = Boolean(gym?.descrizione_needs_review);
  const candidates = [
    {
      source: 'owner',
      text: isOwnerDescriptionApproved(gym) ? clean(gym?.descrizione_owner) : ''
    },
    {
      source: 'editoriale',
      text: clean(gym?.descrizione_editoriale || gym?.editorial_summary)
    },
    {
      source: 'esistente',
      text: clean(gym?.descrizione || gym?.description || gym?.presentazione)
    },
    {
      source: 'generata',
      text: generatedNeedsReview ? '' : clean(gym?.descrizione_generata)
    }
  ];

  for (const candidate of candidates) {
    if (!candidate.text) continue;
    if (!isUnsafePublicDescription(gym, candidate.text, context)) {
      return {
        text: candidate.text,
        source: candidate.source,
        qualityScore: scoreDescription(gym, candidate.text, context),
        needsReview: false
      };
    }
  }

  const fallback = safeFallbackDescription(gym, context) || DEFAULT_DESCRIPTION;
  return {
    text: fallback,
    source: 'fallback_sicuro',
    qualityScore: scoreDescription(gym, fallback, context),
    needsReview: true
  };
}

export function shortPublicDescription(gym, maxLength = 180, context = {}) {
  const picked = pickPublicDescription(gym, context).text;
  return trimDescription(picked, maxLength);
}

function trimDescription(description, maxLength = 180) {
  const picked = description;
  const text = clean(picked).replace(PROMOTION_PATTERN, '').replace(/\s+/g, ' ').trim();
  if (!text) return DEFAULT_DESCRIPTION;
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength - 1);
  return `${slice.slice(0, slice.lastIndexOf(' ') > 80 ? slice.lastIndexOf(' ') : slice.length).trim()}…`;
}

function hashString(value) {
  let hash = 2166136261;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sameNameSiblings(gym, gyms) {
  const name = stripDiacritics(safeName(gym));
  return gyms.filter((item) => item?.id !== gym?.id && stripDiacritics(safeName(item)) === name);
}

export function duplicateRiskForGym(gym, gyms = []) {
  const siblings = sameNameSiblings(gym, gyms);
  const sameCity = siblings.filter((item) => stripDiacritics(safeCity(item)) === stripDiacritics(safeCity(gym)));

  if (sameCity.length && safeAddress(gym)) return 'same_name_same_city';
  if (siblings.length) return 'same_name';
  return '';
}

export function generateGymDescription(gym, gyms = []) {
  const name = safeName(gym);
  const city = safeCity(gym);
  const address = safeAddress(gym);
  const disciplines = disciplineList(gym);
  const primary = disciplines[0] || 'Fitness';
  const secondary = disciplines.slice(1, 4).join(', ');
  const verified = Boolean(gym?.is_verified || gym?.verified);
  const claimed = Boolean(gym?.claim_approved || gym?.owner_claim_approved || gym?.weekly_hours?._claim_approved);
  const duplicateRisk = duplicateRiskForGym(gym, gyms);
  const hasFewDetails = !clean(gym?.telefono || gym?.phone) || !clean(gym?.sito || gym?.website) || /verificare/i.test(clean(gym?.orari || gym?.hours_info));
  const isMartial = MARTIAL_DISCIPLINES.has(primary);
  const seed = hashString(gym?._canonical_slug || gym?.slug || gym?.id || name);
  let reason = 'descrizione_mancante_o_debole';
  let text = '';

  if (duplicateRisk) {
    reason = 'sede_o_catena_con_nome_simile';
    text = `${name} è la sede di ${city || 'questa zona'} collegata a ${primary}. Questa scheda è dedicata alla sede specifica${address ? ` in ${address}` : ''} e aiuta a distinguere indirizzo, orari e contatti rispetto ad altre strutture con nome simile.`;
  } else if (disciplines.length > 1 && secondary) {
    reason = 'scheda_multidisciplina';
    text = `${name} è una palestra a ${city || 'zona da verificare'} con attività legate a ${primary} e altre discipline come ${secondary}. La scheda aiuta a verificare contatti, orari e servizi disponibili${verified ? ' su una struttura già segnata come verificata' : ''}.`;
  } else if (isMartial) {
    reason = 'arti_marziali';
    text = `${name} è una realtà sportiva a ${city || 'zona da verificare'} dedicata a ${primary}. La scheda raccoglie informazioni utili su corsi, indirizzo, contatti e discipline collegate${claimed ? ' con riferimento proprietario collegato' : ''}.`;
  } else if (hasFewDetails || seed % 4 === 0) {
    reason = 'informazioni_parziali';
    text = `${name} è una struttura sportiva a ${city || 'località da verificare'} collegata a ${primary}. Le informazioni disponibili includono i dati principali della scheda; alcuni dettagli, come orari o contatti, potrebbero richiedere ulteriore verifica.`;
  } else {
    reason = 'scheda_completa';
    text = `${name} è una struttura sportiva a ${city || 'località da verificare'}${address ? `, in ${address}` : ''}, con attività legate a ${primary}. La scheda raccoglie orari, contatti e informazioni utili per confrontarla con altre palestre della zona.`;
  }

  return {
    description: clean(text),
    reason,
    duplicateRisk
  };
}

export function similarityScore(left, right) {
  const leftTokens = new Set(compactTokens(left));
  const rightTokens = new Set(compactTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

export function scoreDescription(gym, description, context = {}) {
  const text = clean(description);
  if (!text) return 0;

  const name = safeName(gym);
  const city = safeCity(gym);
  const address = safeAddress(gym);
  const primary = primaryDiscipline(gym);
  const issues = descriptionIssues(gym, text, context);
  let score = 0;

  if (containsText(text, name)) score += 20;
  if (!city || containsText(text, city)) score += 15;
  if (containsText(text, primary)) score += 10;
  if (!address || containsText(text, address)) score += 10;
  if (text.length >= 220 && text.length <= 450) score += 10;
  if (!issues.includes('unverified_commercial_data')) score += 10;
  if (!issues.includes('mentions_other_gym') && !issues.includes('mentions_other_city')) score += 10;
  if (!context.duplicate) score += 10;
  if (/[àèéìòù]/i.test(text) || /\b(è|può|più|attività|città)\b/i.test(text)) score += 5;

  if (issues.includes('mentions_other_gym')) score -= 30;
  if (issues.includes('mentions_other_city')) score -= 30;
  if (issues.includes('unverified_commercial_data')) score -= 25;
  if (issues.includes('too_short')) score -= 20;
  if (issues.includes('too_generic')) score -= 20;
  if (context.duplicate || context.nearDuplicate) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function needsGeneratedDescription(gym, context = {}) {
  const current = clean(gym?.descrizione || gym?.description || gym?.presentazione);
  if (clean(gym?.descrizione_owner) || clean(gym?.descrizione_editoriale)) return false;
  if (!current) return true;
  const score = scoreDescription(gym, current, context);
  return score < 65 || isUnsafePublicDescription(gym, current, context);
}
