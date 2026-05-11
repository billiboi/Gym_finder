import { readGyms } from '$lib/server/gym-store';
import { readClaimRequests } from '$lib/server/claim-request-store';
import { isArchivedGym } from '$lib/admin/gyms';

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
  const activeGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const requests = await readClaimRequests();
  const qualityStats = {
    noPhone: activeGyms.filter((gym) => !String(gym.phone || '').trim()).length,
    noWebsite: activeGyms.filter((gym) => !String(gym.website || '').trim()).length,
    noContact: activeGyms.filter((gym) => !String(gym.phone || '').trim() && !String(gym.website || '').trim()).length,
    hoursToVerify: activeGyms.filter(
      (gym) => !String(gym.hours_info || '').trim() || /orari da verificare/i.test(String(gym.hours_info || ''))
    ).length
  };
  const requestStats = {
    pending: requests.filter((request) => (request.status || 'pending') === 'pending').length,
    inReview: requests.filter((request) => request.status === 'in_review').length,
    approved: requests.filter((request) => request.status === 'approved').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
    resolved: requests.filter((request) => request.status === 'resolved').length,
    open: requests.filter((request) => ['pending', 'in_review'].includes(request.status || 'pending')).length
  };

  return {
    qualityStats,
    requestStats,
    gyms: activeGyms
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
