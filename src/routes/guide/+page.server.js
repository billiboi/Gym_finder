import { EDITORIAL_GUIDES, guidesByCluster } from '$lib/editorial';

export const config = {
  isr: {
    expiration: 21600
  }
};

export async function load() {
  return {
    guides: EDITORIAL_GUIDES,
    clusters: guidesByCluster()
  };
}
