import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const stockDir = path.join(repoRoot, 'static', 'images', 'stock');

const allowedPrefixes = [
  'boxe',
  'kickboxe',
  'muay-thai',
  'mma',
  'grappling',
  'judo',
  'karate',
  'taekwondo',
  'aikido',
  'scherma',
  'kung-fu',
  'kungfu',
  'fitness',
  'wellness',
  'nuoto',
  'functional',
  'difesa-personale',
  'basket',
  'calcio',
  'pattinaggio',
  // Temporary compatibility alias already supported in the app.
  'difesapersonale'
];

function fail(message, details = []) {
  console.error(`\n[stock-check] ${message}`);
  for (const line of details) console.error(`- ${line}`);
  process.exit(1);
}

function getUntrackedStockFiles() {
  const output = execFileSync('git', ['status', '--porcelain', '--', 'static/images/stock'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), file: line.slice(3).trim() }))
    .filter((entry) => entry.status === '??' && entry.file.endsWith('.webp'))
    .map((entry) => entry.file);
}

function getInvalidBasenames() {
  return readdirSync(stockDir)
    .filter((name) => name.endsWith('.webp'))
    .filter((name) => !allowedPrefixes.some((prefix) => name === `${prefix}.webp` || name === `${prefix}-2.webp` || name === `${prefix}-3.webp`));
}

const untracked = getUntrackedStockFiles();
if (untracked.length) {
  fail('Found untracked stock images. Commit or remove them before deploy.', untracked);
}

const invalid = getInvalidBasenames();
if (invalid.length) {
  fail('Found stock images with unsupported basenames.', invalid);
}

console.log('[stock-check] OK');

