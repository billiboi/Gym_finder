import { json } from '@sveltejs/kit';
import { readStaticGyms } from '$lib/server/static-gyms';

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
    const gyms = readStaticGyms();
    const disciplines = [...new Set(gyms.flatMap((gym) => toDisciplineList(gym)))].sort((a, b) =>
      a.localeCompare(b, 'it')
    );
    return json(disciplines);
  } catch {
    return json([]);
  }
}

