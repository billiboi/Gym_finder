export function publicClientGym(gym) {
  return {
    id: gym.id,
    name: gym.name,
    discipline: gym.discipline,
    disciplines: gym.disciplines,
    address: gym.address,
    city: gym.city,
    phone: gym.phone,
    hours_info: gym.hours_info,
    website: gym.website,
    latitude: gym.latitude,
    longitude: gym.longitude,
    price_info: gym.price_info,
    price: gym.price,
    monthly_price: gym.monthly_price,
    monthlyPrice: gym.monthlyPrice,
    image_url: gym.image_url,
    verified: gym.verified,
    is_verified: gym.is_verified,
    is_premium: gym.is_premium,
    is_open_now: gym.is_open_now,
    distance_km: gym.distance_km
  };
}
