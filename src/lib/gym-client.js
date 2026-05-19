import { sanitizePublicGymData } from '$lib/public-data-sanitizer';
import { pickPublicDescription, shortPublicDescription } from '$lib/gym-description';

export function publicClientGym(gym) {
  const safeGym = sanitizePublicGymData(gym);
  const pickedDescription = pickPublicDescription(safeGym);

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
    public_description_short: shortPublicDescription(safeGym),
    description_source: pickedDescription.source,
    description_quality_score: pickedDescription.qualityScore,
    description_needs_review: pickedDescription.needsReview,
    latitude: safeGym.latitude,
    longitude: safeGym.longitude,
    price_info: safeGym.price_info,
    price: safeGym.price,
    monthly_price: safeGym.monthly_price,
    monthlyPrice: safeGym.monthlyPrice,
    image_url: safeGym.image_url,
    verified: safeGym.verified,
    is_verified: safeGym.is_verified,
    is_premium: safeGym.is_premium,
    is_open_now: safeGym.is_open_now,
    distance_km: safeGym.distance_km
  };
}
