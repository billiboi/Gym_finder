import { isIndexableGym } from '$lib/gym-detail';
import { SEO_LOCATIONS } from '$lib/seo-locations';
import { readGyms } from '$lib/server/gym-store';

function slugifyLocationName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function load() {
  const gyms = (await readGyms()).filter((gym) => isIndexableGym(gym));
  const counts = new Map();

  for (const gym of gyms) {
    const city = String(gym?.city || '').trim();
    if (!city) continue;
    counts.set(city, (counts.get(city) || 0) + 1);
  }

  const seoLocationMap = new Map(SEO_LOCATIONS.map((location) => [location.name, location]));

  const featuredLocations = SEO_LOCATIONS
    .map((location) => ({
      name: location.name,
      slug: location.slug,
      title: location.title,
      description: location.description,
      count: counts.get(location.name) || 0,
      featured: true
    }))
    .filter((location) => location.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));

  const extraLocations = [...counts.entries()]
    .filter(([name]) => !seoLocationMap.has(name))
    .map(([name, count]) => ({
      name,
      slug: slugifyLocationName(name),
      title: `Palestre a ${name}`,
      description: `Esplora le schede pubbliche che nel catalogo risultano collegate a ${name}.`,
      count,
      featured: false
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'it'));

  return {
    featuredLocations,
    extraLocations,
    totalLocations: featuredLocations.length + extraLocations.length
  };
}
