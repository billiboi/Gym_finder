import { json } from '@sveltejs/kit';
import { PUBLIC_DISCIPLINE_FILTER_OPTIONS } from '$lib/disciplines';

export async function GET() {
  return json(PUBLIC_DISCIPLINE_FILTER_OPTIONS, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800'
    }
  });
}
