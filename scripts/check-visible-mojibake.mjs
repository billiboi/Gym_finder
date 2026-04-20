import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = [
  path.join(repoRoot, 'src', 'routes'),
  path.join(repoRoot, 'src', 'lib', 'components')
];

const suspiciousPatterns = [
  /Ã/u,
  /Â/u,
  /\uFFFD/u,
  /gi\?/iu,
  /pi\?/iu,
  /localit\?/iu,
  /citt\?/iu,
  /cos\?/iu,
  /perch\?/iu
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(svelte|js|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const matches = [];
for (const root of scanRoots) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    if (suspiciousPatterns.some((pattern) => pattern.test(content))) {
      matches.push(path.relative(repoRoot, file));
    }
  }
}

if (matches.length) {
  console.error('\n[mojibake-check] Found suspicious visible-text encoding issues:');
  for (const match of matches) console.error(`- ${match}`);
  process.exit(1);
}

console.log('[mojibake-check] OK');
