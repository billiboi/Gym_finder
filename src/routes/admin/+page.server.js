import { isArchivedGym } from '$lib/admin/gyms';
import { buildDuplicateGroups } from '$lib/admin/gym-duplicates';
import { readClaimRequestsList } from '$lib/server/claim-request-store';
import { readAdminGymCandidatesList } from '$lib/server/gym-candidates-store';
import { readActiveGymQualityIssueCount, readGyms, readPublicGymCount } from '$lib/server/gym-store';

function clean(value) {
  return String(value ?? '').trim();
}

export async function load() {
  const [activeGymCount, qualityIssueCount, candidatesList, claimList, gyms] = await Promise.all([
    readPublicGymCount(),
    readActiveGymQualityIssueCount(),
    readAdminGymCandidatesList({ limit: 500, status: 'pending' }),
    readClaimRequestsList({ limit: 100 }),
    readGyms()
  ]);

  const openRequests = claimList.items.filter((request) => ['pending', 'in_review'].includes(request.status || 'pending'));
  const oldestOpenRequests = [...openRequests]
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .slice(0, 3);

  const recentCandidates = candidatesList.items.slice(0, 5);

  const visibleGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const duplicateGroups = buildDuplicateGroups(visibleGyms).slice(0, 3);

  return {
    stats: {
      activeGyms: activeGymCount,
      candidatesPending: candidatesList.items.length,
      requestsOpen: openRequests.length,
      qualityIssues: qualityIssueCount
    },
    candidatesError: candidatesList.error || '',
    requestsError: claimList.error || '',
    recentCandidates: recentCandidates.map((candidate) => ({
      id: candidate.id,
      nome: candidate.nome,
      citta: candidate.citta,
      source: candidate.source
    })),
    oldestOpenRequests: oldestOpenRequests.map((request) => ({
      id: request.id,
      gym_name: clean(request.gym_name) || 'Richiesta senza palestra',
      status: request.status || 'pending',
      created_at: request.created_at
    })),
    duplicateGroups: duplicateGroups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.gyms.length,
      names: group.gyms.slice(0, 3).map((gym) => gym.name)
    }))
  };
}
