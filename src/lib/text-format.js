export function normalizeItalianCopy(value) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  if (!text) return text;

  const replacements = [
    [/\bl informazione\b/gi, (match) => (match[0] === 'L' ? 'L’informazione' : 'l’informazione')],
    [/\blunedi'\b/gi, 'lunedì'],
    [/\bmartedi'\b/gi, 'martedì'],
    [/\bmercoledi'\b/gi, 'mercoledì'],
    [/\bgiovedi'\b/gi, 'giovedì'],
    [/\bvenerdi'\b/gi, 'venerdì'],
    [/\bpossibilita'\b/gi, 'possibilità'],
    [/\battivita'\b/gi, 'attività'],
    [/\bqualita'\b/gi, 'qualità'],
    [/\bcitta'\b/gi, 'città'],
    [/\blocalita'\b/gi, 'località'],
    [/\be'\b/g, 'è'],
    [/\bE'\b/g, 'È'],
    [/\bpiu\b/gi, (match) => (match === match.toUpperCase() ? 'PIÙ' : 'più')],
    [/\bpuo\b/gi, (match) => (match === match.toUpperCase() ? 'PUÒ' : 'può')]
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

export function formatCount(count, singular, plural) {
  const numericCount = Number(count) || 0;
  return `${numericCount} ${numericCount === 1 ? singular : plural}`;
}
