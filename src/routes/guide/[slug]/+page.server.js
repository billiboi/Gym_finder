import { error } from '@sveltejs/kit';
import { getEditorialGuide, relatedGuidesForGuide } from '$lib/editorial';

export async function load({ params }) {
  const guide = getEditorialGuide(params.slug);

  if (!guide) {
    throw error(404, 'Guida non trovata');
  }

  return {
    guide,
    relatedGuides: relatedGuidesForGuide(guide)
  };
}
