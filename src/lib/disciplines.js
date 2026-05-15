import {
  canonicalDisciplineName,
  foldDisciplineKey,
  normalizeDisciplinesWithAliases
} from '$lib/discipline-taxonomy';

function fixMojibake(value) {
  let text = String(value || '').trim();
  if (!text) return '';

  const replacements = [
    ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬', 'ÃƒÆ’Ã¢â€šÂ¬'], ['ÃƒÆ’Ã†â€™Ãƒâ€¹Ã¢â‚¬Â ', 'ÃƒÆ’Ã‹â€ '], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°', 'ÃƒÆ’Ã¢â‚¬Â°'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬â„¢', 'ÃƒÆ’Ã…â€™'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢', 'ÃƒÆ’Ã¢â‚¬â„¢'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢', 'ÃƒÆ’Ã¢â€žÂ¢'],
    ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ', 'ÃƒÆ’Ã‚Â '], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨', 'ÃƒÆ’Ã‚Â¨'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©', 'ÃƒÆ’Ã‚Â©'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬', 'ÃƒÆ’Ã‚Â¬'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â²', 'ÃƒÆ’Ã‚Â²'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹', 'ÃƒÆ’Ã‚Â¹'],
    ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶', 'ÃƒÆ’Ã‚Â¶'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤', 'ÃƒÆ’Ã‚Â¤'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¸', 'ÃƒÆ’Ã…Â¸'], ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“', 'ÃƒÆ’Ã¢â‚¬â€œ'], ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼', 'ÃƒÆ’Ã‚Â¼'], ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬Å“', 'ÃƒÆ’Ã…â€œ'],
    ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ', '-'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â', '-'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ', "'"], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢', "'"], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“', '"'], ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â', '"'],
    ['ÃƒÆ’Ã¢â‚¬Å¡', '']
  ];

  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function normalizeDisciplineLabel(value) {
  return canonicalDisciplineName(fixMojibake(value));
}

export function normalizeDisciplineField(value, fallback = ['Fitness']) {
  return normalizeDisciplinesWithAliases(
    Array.isArray(value) ? value.map((item) => fixMojibake(item)) : fixMojibake(value),
    fallback
  );
}

export function dedupeDisciplines(values) {
  const map = new Map();

  for (const value of values || []) {
    const normalized = normalizeDisciplineLabel(value);
    if (!normalized) continue;

    const key = foldDisciplineKey(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }

  return [...map.values()].sort((a, b) => a.localeCompare(b, 'it'));
}
