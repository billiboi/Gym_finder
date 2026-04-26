import { readFile, writeFile } from 'node:fs/promises';

const FILES = ['data/gyms.json', 'data/palestre.csv', 'static/palestre.csv'];
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function cleanText(value) {
  return value
    .replace(CONTROL_CHARS, ' - ')
    .replace(/[ \t]+-[ \t]+/g, ' - ');
}

let changed = 0;

for (const file of FILES) {
  const before = await readFile(file, 'utf8');
  const after = cleanText(before);

  if (after !== before) {
    await writeFile(file, after, 'utf8');
    changed += 1;
    console.log(`[data-clean] cleaned ${file}`);
  }
}

if (changed === 0) {
  console.log('[data-clean] no control characters found');
}
