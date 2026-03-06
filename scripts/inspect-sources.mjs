import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/gyms.json','utf8'));
const bySource = data.reduce((acc,g)=>{const k=g.source||'example';acc[k]=(acc[k]||0)+1;return acc;},{});
console.log('Totale',data.length);
console.log(bySource);
