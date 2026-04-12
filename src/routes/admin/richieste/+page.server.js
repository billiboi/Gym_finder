import { readClaimRequests } from '$lib/server/claim-request-store';

export async function load() {
  const requests = await readClaimRequests();

  return {
    requests
  };
}
