import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/gyms.json','utf8'));
const imported = data.filter((g) => g.source === 'openstreetmap');
console.log('Totale dataset:', data.length);
console.log('Record OSM importati:', imported.length);
console.log('Esempi:');
for (const g of imported.slice(0, 12)) {
  console.log('-', g.name, '|', g.city, '|', g.discipline);
}
