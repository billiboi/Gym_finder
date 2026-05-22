export function normalizeItalianCopy(value) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  if (!text) return text;

  const protectedValues = [];
  const protect = (match) => {
    const token = `__ITALIAN_COPY_TOKEN_${protectedValues.length}__`;
    protectedValues.push(match);
    return token;
  };

  text = text.replace(/\bhttps?:\/\/[^\s<>"']+/gi, protect);
  text = text.replace(/\bwww\.[^\s<>"']+/gi, protect);
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, protect);

  const replacements = [
    [/\bl informazione\b/gi, (match) => (match[0] === 'L' ? 'L’informazione' : 'l’informazione')],
    [/\blunedi'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'lunedì'],
    [/\bmartedi'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'martedì'],
    [/\bmercoledi'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'mercoledì'],
    [/\bgiovedi'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'giovedì'],
    [/\bvenerdi'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'venerdì'],
    [/\bpossibilita'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'possibilità'],
    [/\battivita'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'attività'],
    [/\bqualita'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'qualità'],
    [/\bcitta'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'città'],
    [/\blocalita'(?=$|[^A-Za-zÀ-ÿ0-9])/gi, 'località'],
    [/\be'(?=$|[^A-Za-zÀ-ÿ0-9])/g, 'è'],
    [/\bE'(?=$|[^A-Za-zÀ-ÿ0-9])/g, 'È'],
    [/\bpiu\b/gi, (match) => (match === match.toUpperCase() ? 'PIÙ' : 'più')],
    [/\bpuo\b/gi, (match) => (match === match.toUpperCase() ? 'PUÒ' : 'può')]
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  protectedValues.forEach((original, index) => {
    text = text.replace(`__ITALIAN_COPY_TOKEN_${index}__`, original);
  });

  return text;
}

export function formatCount(count, singular, plural) {
  const numericCount = Number(count) || 0;
  return `${numericCount} ${numericCount === 1 ? singular : plural}`;
}
