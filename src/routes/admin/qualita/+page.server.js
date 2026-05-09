import { gymHref, slugifyGym } from '$lib/gym-detail';
import { adminGymView, hasGenericDiscipline, hoursNeedReview, isArchivedGym } from '$lib/admin/gyms';
import { readGyms } from '$lib/server/gym-store';

function clean(value) {
  return String(value ?? '').trim();
}

function hasCoordinates(gym) {
  const lat = Number(gym?.latitude ?? gym?.lat);
  const lng = Number(gym?.longitude ?? gym?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function hasDescription(gym) {
  return Boolean(clean(gym?.description || gym?.descrizione || gym?.editorial_summary));
}

function isVerified(gym) {
  return Boolean(gym?.is_verified || gym?.verified || gym?.weekly_hours?._verified);
}

function qualityFlags(gym, slugCounts) {
  const slug = clean(gym?.slug) || slugifyGym(gym);

  return {
    noPhone: !clean(gym?.phone || gym?.telefono),
    noWebsite: !clean(gym?.website || gym?.sito),
    noHours: hoursNeedReview(gym),
    noCoordinates: !hasCoordinates(gym),
    noDescription: !hasDescription(gym),
    genericDiscipline: hasGenericDiscipline(gym),
    duplicateSlug: Boolean(slug && slugCounts.get(slug) > 1),
    unverified: !isVerified(gym)
  };
}

function issueLabels(flags) {
  return [
    flags.noPhone ? 'Senza telefono' : '',
    flags.noWebsite ? 'Senza sito' : '',
    flags.noHours ? 'Senza orari' : '',
    flags.noCoordinates ? 'Senza coordinate' : '',
    flags.noDescription ? 'Descrizione mancante' : '',
    flags.genericDiscipline ? 'Disciplina generica' : '',
    flags.duplicateSlug ? 'Slug duplicato' : '',
    flags.unverified ? 'Non verificata' : ''
  ].filter(Boolean);
}

export async function load() {
  const gyms = await readGyms();
  const visibleGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const slugCounts = new Map();

  for (const gym of visibleGyms) {
    const slug = clean(gym?.slug) || slugifyGym(gym);
    if (!slug) continue;
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }

  const items = visibleGyms
    .map((gym) => {
      const view = adminGymView(gym);
      const flags = qualityFlags(gym, slugCounts);
      const issues = issueLabels(flags);

      return {
        ...view,
        publicHref: gymHref(gym),
        qualityFlags: flags,
        issueLabels: issues,
        issueCount: issues.length
      };
    })
    .sort((a, b) => {
      if (b.issueCount !== a.issueCount) return b.issueCount - a.issueCount;
      return a.name.localeCompare(b.name, 'it');
    });

  const stats = {
    all: items.length,
    noPhone: items.filter((item) => item.qualityFlags.noPhone).length,
    noWebsite: items.filter((item) => item.qualityFlags.noWebsite).length,
    noHours: items.filter((item) => item.qualityFlags.noHours).length,
    noCoordinates: items.filter((item) => item.qualityFlags.noCoordinates).length,
    noDescription: items.filter((item) => item.qualityFlags.noDescription).length,
    genericDiscipline: items.filter((item) => item.qualityFlags.genericDiscipline).length,
    duplicateSlug: items.filter((item) => item.qualityFlags.duplicateSlug).length,
    unverified: items.filter((item) => item.qualityFlags.unverified).length
  };

  return {
    gyms: items,
    stats
  };
}
