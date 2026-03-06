import { json } from '@sveltejs/kit';

export async function GET() {
  return json({ ok: true, service: 'gym-finder-api' });
}