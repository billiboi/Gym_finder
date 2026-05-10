import { EDITORIAL_GUIDES, guidesByCluster } from '$lib/editorial';

export async function load() {
  return {
    guides: EDITORIAL_GUIDES,
    clusters: guidesByCluster()
  };
}
