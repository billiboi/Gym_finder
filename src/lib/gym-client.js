import { sanitizePublicGymData } from '$lib/public-data-sanitizer';
import { pickPublicDescription, shortPublicDescription } from '$lib/gym-description';
import { normalizeItalianCopy } from '$lib/text-format';

const COPY_FIELDS = [
  'description',
  'public_description',
  'descrizione',
  'descrizione_owner',
  'descrizione_editoriale',
  'descrizione_generata',
  'descrizione_pubblica',
  'editorial_summary',
  'hours_info',
  'price_info'
];

function normalizeCopyValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCopyValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeCopyValue(entryValue)])
    );
  }

  return typeof value === 'string' ? normalizeItalianCopy(value) : value;
}

function normalizePublicGymCopy(gym) {
  const normalized = { ...gym };

  for (const field of COPY_FIELDS) {
    if (field in normalized) normalized[field] = normalizeCopyValue(normalized[field]);
  }

  normalized.editorial_highlights = normalizeCopyValue(normalized.editorial_highlights);
  normalized.editorial_faq_items = normalizeCopyValue(normalized.editorial_faq_items);

  return normalized;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hostFor(value) {
  const url = clean(value);
  if (!/^https?:\/\//i.test(url)) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function commercialInfoIsSafe(gym) {
  const sourceHost = hostFor(gym?.source_url || gym?.official_source_url || gym?.price_source_url);
  const websiteHost = hostFor(gym?.website || gym?.sito);
  const sourceMatchesWebsite =
    sourceHost &&
    websiteHost &&
    (sourceHost === websiteHost || sourceHost.endsWith(`.${websiteHost}`) || websiteHost.endsWith(`.${sourceHost}`));

  return Boolean(gym?.verified_commercial_info && clean(gym?.commercial_info_last_checked_at) && sourceMatchesWebsite);
}

function listingDescription(gym) {
  const disciplines = Array.isArray(gym?.disciplines) ? gym.disciplines.filter(Boolean) : [];
  const city = clean(gym?.city);
  const name = clean(gym?.name) || 'Questa struttura';

  if (disciplines.length >= 4) {
    return normalizeItalianCopy(
      `${name} è una struttura sportiva${city ? ` a ${city}` : ''} con attività fitness, corsi e discipline collegate.`
    );
  }

  return shortPublicDescription(gym);
}

export function publicClientGym(gym) {
  const safeGym = normalizePublicGymCopy(sanitizePublicGymData(gym));
  const pickedDescription = pickPublicDescription(safeGym);
  const hasSafeCommercialInfo = commercialInfoIsSafe(safeGym);

  return {
    id: safeGym.id,
    _canonical_slug: safeGym._canonical_slug,
    name: safeGym.name,
    discipline: safeGym.discipline,
    disciplines: safeGym.disciplines,
    address: safeGym.address,
    city: safeGym.city,
    phone: safeGym.phone,
    hours_info: safeGym.hours_info,
    website: safeGym.website,
    description: pickedDescription.text,
    public_description: pickedDescription.text,
    public_description_short: listingDescription(safeGym),
    description_source: pickedDescription.source,
    description_quality_score: pickedDescription.qualityScore,
    description_needs_review: pickedDescription.needsReview,
    needs_review: safeGym.needs_review,
    review_reason: safeGym.review_reason,
    latitude: safeGym.latitude,
    longitude: safeGym.longitude,
    price_info: hasSafeCommercialInfo ? safeGym.price_info : '',
    price: hasSafeCommercialInfo ? safeGym.price : '',
    monthly_price: hasSafeCommercialInfo ? safeGym.monthly_price : '',
    monthlyPrice: hasSafeCommercialInfo ? safeGym.monthlyPrice : '',
    verified_commercial_info: Boolean(safeGym.verified_commercial_info),
    commercial_info_last_checked_at: safeGym.commercial_info_last_checked_at,
    source_url: safeGym.source_url,
    official_source_url: safeGym.official_source_url,
    price_source_url: safeGym.price_source_url,
    image_url: safeGym.image_url,
    verified: safeGym.verified,
    is_verified: safeGym.is_verified,
    is_premium: safeGym.is_premium,
    is_open_now: safeGym.is_open_now,
    distance_km: safeGym.distance_km
  };
}
