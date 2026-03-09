import { readGyms } from '$lib/server/gym-store';

async function getGymsWithFallback(fetchFn) {
  const gyms = await readGyms();
  if (Array.isArray(gyms) && gyms.length > 0) return gyms;

  try {
    const res = await fetchFn('/api/gyms');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function load({ fetch }) {
  const gyms = await getGymsWithFallback(fetch);

  return {
    gyms: gyms
      .map((gym) => ({
        id: gym.id,
        name: gym.name || 'Senza nome',
        discipline: gym.discipline || (Array.isArray(gym.disciplines) ? gym.disciplines[0] : '') || 'Fitness',
        address: [gym.address, gym.city].filter(Boolean).join(', '),
        city: gym.city || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'))
  };
}
