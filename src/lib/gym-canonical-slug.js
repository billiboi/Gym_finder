import { repairMojibake } from './text-repair.js';

// Single source of truth for gym slug canonicalization. Every place that
// generates or matches a /palestre/[slug] URL (sitemap, detail route,
// legacy redirect report) must compute slugs through this module so the
// same gym always resolves to the same canonical and legacy slug.

export function slugPart(value) {
  return (
    repairMojibake(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || ''
  );
}

export function baseGymSlug(gym) {
  return slugPart(gym?.name || gym?.nome) || 'palestra';
}

function citySlugForGym(gym) {
  return slugPart(gym?.city || gym?.citta);
}

function streetSlugForGym(gym) {
  return slugPart(String(gym?.address || gym?.indirizzo || '').split(',')[0]);
}

function joinSlugParts(parts) {
  return parts.filter(Boolean).join('-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '') || 'palestra';
}

function canonicalSlugCandidates(gym, base, duplicateGroup) {
  if (!duplicateGroup) return [base];

  const city = citySlugForGym(gym);
  const street = streetSlugForGym(gym);
  const cityPart = city && !base.includes(city) ? city : '';

  return [
    joinSlugParts([base, cityPart]),
    joinSlugParts([base, cityPart, street]),
    joinSlugParts([base, street])
  ].filter((value, index, list) => value && list.indexOf(value) === index);
}

// Computes `_canonical_slug` and `_legacy_slug` for every gym in the given
// list. Must be called on the full active catalog (not a page or a partial
// search result) so duplicate-name disambiguation is consistent everywhere.
export function withCanonicalGymSlugs(gyms) {
  const normalized = gyms.map((gym) => ({ ...gym }));
  const groups = new Map();

  for (const gym of normalized) {
    const base = baseGymSlug(gym);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(gym);
  }

  const used = new Set();

  for (const [base, group] of groups) {
    const duplicateGroup = group.length > 1;

    group.forEach((gym, index) => {
      const candidates = canonicalSlugCandidates(gym, base, duplicateGroup);
      let slug = candidates.find((candidate) => !used.has(candidate));

      if (!slug) {
        const fallbackBase = candidates[candidates.length - 1] || base;
        let suffix = index + 1;
        do {
          slug = `${fallbackBase}-${suffix}`;
          suffix += 1;
        } while (used.has(slug));
      }

      used.add(slug);
      gym._canonical_slug = slug;
      gym._legacy_slug = gym?.id ? `${base}-${String(gym.id).trim()}` : base;
    });
  }

  return normalized;
}

// Best-effort match for legacy `-csv-NNN` (or numeric id) URLs whose id no
// longer exists in the catalog (the duplicate row was merged/archived).
// Only returns a match when exactly one active gym's base name matches the
// slug with the id suffix stripped off — ambiguous cases return null so we
// never guess a redirect target.
export function findOrphanedLegacySlugMatch(slug, canonicalGyms) {
  const stripped = String(slug || '').replace(/-(?:csv-[a-z0-9-]+|\d+)$/i, '');
  if (!stripped || stripped === slug) return null;

  const matches = canonicalGyms.filter((gym) => baseGymSlug(gym) === stripped);
  return matches.length === 1 ? matches[0] : null;
}

// Matches old full-format slugs (name-city-street, from before duplicate-name
// disambiguation could drop the street when the city alone was enough) against
// today's shorter canonical slug, on a hyphen boundary. Returns every gym whose
// canonical slug is a prefix of `slug` -- the caller decides what to do with
// zero (no match), one (safe redirect target), or 2+ (ambiguous, do not guess).
export function findCanonicalPrefixMatches(slug, canonicalGyms) {
  const target = String(slug || '');
  if (!target) return [];

  const matches = canonicalGyms.filter(
    (gym) => gym._canonical_slug && (target === gym._canonical_slug || target.startsWith(`${gym._canonical_slug}-`))
  );
  if (matches.length <= 1) return matches;

  const maxLen = Math.max(...matches.map((gym) => gym._canonical_slug.length));
  return matches.filter((gym) => gym._canonical_slug.length === maxLen);
}
