import { readGyms } from '$lib/server/gym-store';
import { readClaimRequests } from '$lib/server/claim-request-store';

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
  const requests = await readClaimRequests();
  const qualityStats = {
    noPhone: gyms.filter((gym) => !String(gym.phone || '').trim()).length,
    noWebsite: gyms.filter((gym) => !String(gym.website || '').trim()).length,
    noContact: gyms.filter((gym) => !String(gym.phone || '').trim() && !String(gym.website || '').trim()).length,
    hoursToVerify: gyms.filter(
      (gym) => !String(gym.hours_info || '').trim() || /orari da verificare/i.test(String(gym.hours_info || ''))
    ).length
  };
  const requestStats = {
    new: requests.filter((request) => (request.status || 'new') === 'new').length,
    reviewed: requests.filter((request) => request.status === 'reviewed').length,
    resolved: requests.filter((request) => request.status === 'resolved').length,
    open: requests.filter((request) => (request.status || 'new') !== 'resolved').length
  };

  return {
    qualityStats,
    requestStats,
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
