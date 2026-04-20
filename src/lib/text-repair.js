const MOJIBAKE_PATTERN = /[ÃÂâï»¿�]/;

function decodeLatin1AsUtf8(value) {
  const source = String(value || '');
  const bytes = Uint8Array.from(Array.from(source, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function repairMojibake(value) {
  let text = String(value ?? '');
  if (!text) return '';

  text = text.replace(/^\uFEFF/, '');

  if (!MOJIBAKE_PATTERN.test(text)) {
    return text;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const repaired = decodeLatin1AsUtf8(text).replace(/\uFEFF/g, '').replace(/\uFFFD/g, '');
    if (!repaired || repaired === text) break;
    text = repaired;
    if (!MOJIBAKE_PATTERN.test(text)) break;
  }

  return text;
}

