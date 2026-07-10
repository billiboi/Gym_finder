import { gymStoreStatus } from '$lib/server/gym-store';
import { gymCandidatesStoreStatus } from '$lib/server/gym-candidates-store';

export function load() {
  return {
    gymStore: gymStoreStatus(),
    candidatesStore: gymCandidatesStoreStatus()
  };
}
