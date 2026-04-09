import { dedupeDisciplines } from '$lib/disciplines';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const gyms = await readGyms();
  const disciplines = dedupeDisciplines(
    gyms.flatMap((gym) =>
      Array.isArray(gym?.disciplines) && gym.disciplines.length
        ? gym.disciplines
        : String(gym?.discipline || '')
            .split('|')
            .map((value) => value.trim())
            .filter(Boolean)
    )
  );

  return {
    initialGyms: gyms,
    initialDisciplines: disciplines
  };
}

