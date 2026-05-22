function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function isCapLike(value) {
  return /^\d{4,5}$/.test(clean(value));
}

export function isSuspiciousZoneName(value) {
  const zone = clean(value);
  if (!zone) return true;
  if (isCapLike(zone)) return true;
  if (/^\d/.test(zone)) return true;
  if (/[\\/|]/.test(zone)) return true;
  if (zone.length > 42) return true;
  return false;
}

function cleanAddressCandidate(value) {
  return clean(value)
    .replace(/\b\d{4,5}\b/g, ' ')
    .replace(/\b(italia|svizzera|suisse|schweiz|ch|va|ti|co|mi)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,.-]+|[,.-]+$/g, '')
    .trim();
}

export function cityFromAddress(address) {
  const raw = clean(address);
  if (!raw) return '';

  const parts = raw
    .split(',')
    .map(cleanAddressCandidate)
    .filter((part) => part && !isSuspiciousZoneName(part));

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (!/[a-zA-ZÀ-ÿ]/.test(part)) continue;
    if (/^(via|viale|piazza|corso|largo|strada|vicolo|contrada|salita|rue|route|avenue|place|strasse)\b/i.test(part)) {
      continue;
    }
    return part;
  }

  const capMatch = raw.match(/\b\d{4,5}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{2,})\b/);
  if (capMatch) {
    return cleanAddressCandidate(capMatch[1]);
  }

  return '';
}

export function publicCityForGym(gym) {
  const city = clean(gym?.city || gym?.citta);
  if (city && !isSuspiciousZoneName(city)) return city;
  return cityFromAddress(gym?.address || gym?.indirizzo);
}
