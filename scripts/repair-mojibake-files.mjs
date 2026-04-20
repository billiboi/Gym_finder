import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { repairMojibake } from '../src/lib/text-repair.js';

const repoRoot = process.cwd();
const directTargets = [
  'data/gyms.json',
  'data/palestre.csv',
  'static/palestre.csv',
  'src/lib/server/palestre-data.js',
  'src/routes/zone/+page.svelte'
];

const walkedRoots = [
  path.join(repoRoot, 'src', 'routes'),
  path.join(repoRoot, 'src', 'lib', 'components')
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

let updated = 0;

const allTargets = [
  ...directTargets.map((relativePath) => path.join(repoRoot, relativePath)),
  ...walkedRoots.flatMap((root) => (statSync(root, { throwIfNoEntry: false })?.isDirectory() ? walk(root) : []))
];

for (const fullPath of new Set(allTargets)) {
  const relativePath = path.relative(repoRoot, fullPath);
  const original = readFileSync(fullPath, 'utf8');
  const repaired = repairMojibake(original);
  if (repaired !== original) {
    writeFileSync(fullPath, repaired, 'utf8');
    updated += 1;
    console.log(`[repair-mojibake] updated ${relativePath}`);
  }
}

if (updated === 0) {
  console.log('[repair-mojibake] no changes needed');
}
