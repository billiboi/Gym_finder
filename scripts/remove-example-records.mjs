import { readFileSync, writeFileSync } from 'node:fs';
const path = 'data/gyms.json';
const data = JSON.parse(readFileSync(path,'utf8'));
const before = data.length;
const filtered = data.filter((g) => typeof g.source === 'string' && g.source.trim() !== '');
writeFileSync(path, JSON.stringify(filtered, null, 2), 'utf8');
console.log('Rimossi', before - filtered.length, 'record esempio/non sorgente. Totale:', filtered.length);
