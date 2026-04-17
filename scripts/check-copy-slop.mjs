import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = [
  path.join(repoRoot, 'src', 'routes'),
  path.join(repoRoot, 'src', 'lib')
];

const bannedPhrases = [
  'scheda palestra',
  'allenati anche quando sei fuori zona',
  'perche questa pagina e utile',
  'decisione rapida',
  'continua la ricerca senza ripartire da zero',
  'questa pagina raccoglie'
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (fullPath.includes(`${path.sep}src${path.sep}routes${path.sep}admin${path.sep}`)) continue;
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(svelte|js|mjs)$/.test(entry.name)) continue;
    files.push(fullPath);
  }
  return files;
}

function toAsciiLower(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const matches = [];
for (const root of scanRoots) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    const normalized = toAsciiLower(content);
    for (const phrase of bannedPhrases) {
      if (normalized.includes(phrase)) {
        matches.push(`${path.relative(repoRoot, file)} -> "${phrase}"`);
      }
    }
  }
}

if (matches.length) {
  console.error('\n[copy-check] Found generic copy patterns that should be rewritten:');
  for (const match of matches) console.error(`- ${match}`);
  process.exit(1);
}

console.log('[copy-check] OK');
