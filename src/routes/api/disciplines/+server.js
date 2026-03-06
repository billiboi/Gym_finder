import { json } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';

export async function GET() {
  const gyms = await readGyms();
  const disciplines = [...new Set(gyms.map((gym) => gym.discipline).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'it')
  );
  return json(disciplines);
}
