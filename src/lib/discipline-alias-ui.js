function normalizeAliasKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|/]+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function aliasNoticesForInput(value, aliasSuggestions = []) {
  const aliases = new Map(
    (aliasSuggestions || []).map((suggestion) => [
      normalizeAliasKey(suggestion.alias),
      {
        input: suggestion.alias,
        canonical: suggestion.discipline_name,
        canonical_slug: suggestion.discipline_slug
      }
    ])
  );

  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = aliases.get(normalizeAliasKey(item));
      if (!match) return null;
      if (normalizeAliasKey(item) === normalizeAliasKey(match.canonical)) return null;
      return { ...match, input: item };
    })
    .filter(Boolean);
}

export function firstAliasNotice(value, aliasSuggestions = []) {
  return aliasNoticesForInput(value, aliasSuggestions)[0] || null;
}
