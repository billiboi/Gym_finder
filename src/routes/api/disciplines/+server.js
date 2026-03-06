import { json } from '@sveltejs/kit';
import { readGyms } from '$lib/server/gym-store';

export const config = { runtime: 'nodejs20.x' };

function toDisciplineList(gym) {
  if (Array.isArray(gym.disciplines)) {
    return gym.disciplines.filter(Boolean).map((d) => String(d).trim()).filter(Boolean);
  }

  if (typeof gym.discipline === 'string' && gym.discipline.trim()) {
    return gym.discipline
      .split('|')
      .map((d) => d.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET() {
  try {
    const gyms = await readGyms();
    const disciplines = [...new Set(gyms.flatMap((gym) => toDisciplineList(gym)))].sort((a, b) =>
      a.localeCompare(b, 'it')
    );
    return json(disciplines);
  } catch {
    return json([]);
  }
}






