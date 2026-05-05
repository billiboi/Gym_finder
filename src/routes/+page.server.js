import { dedupeDisciplines } from '$lib/disciplines';
import { isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';

export async function load() {
  const gyms = (await readGyms()).filter((gym) => !isArchivedGym(gym));
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
