import { gymHref, slugifyGym } from '$lib/gym-detail';
import { adminGymView } from '$lib/admin/gyms';

function clean(value) {
  return String(value ?? '').trim();
}

export function fold(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateKey(gym, type) {
  const name = fold(gym?.name || gym?.nome);
  const city = fold(gym?.city || gym?.citta);
  const address = fold(gym?.address || gym?.indirizzo);
  const slug = clean(gym?.slug) || slugifyGym(gym);

  if (type === 'slug') return slug;
  if (type === 'name-city') return name && city ? `${name}|${city}` : '';
  if (type === 'name-address') return name && address ? `${name}|${address}` : '';
  return '';
}

// Shared by /admin (dashboard "today" list) and /admin/qualita (full duplicates
// panel) so the two pages never disagree on what counts as a duplicate.
export function buildDuplicateGroups(gyms) {
  const groups = new Map();

  for (const type of ['slug', 'name-city', 'name-address']) {
    for (const gym of gyms) {
      const key = duplicateKey(gym, type);
      if (!key) continue;
      const groupKey = `${type}:${key}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, type, gyms: [] });
      groups.get(groupKey).gyms.push(gym);
    }
  }

  return [...groups.values()]
    .filter((group) => group.gyms.length > 1)
    .map((group) => ({
      ...group,
      label:
        group.type === 'slug'
          ? 'Slug duplicato'
          : group.type === 'name-city'
            ? 'Nome e città uguali'
            : 'Nome e indirizzo uguali',
      gyms: group.gyms.map((gym) => ({
        ...adminGymView(gym),
        publicHref: gymHref(gym)
      }))
    }))
    .sort((a, b) => b.gyms.length - a.gyms.length || a.label.localeCompare(b.label, 'it'));
}
