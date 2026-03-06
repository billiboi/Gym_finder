import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/gyms.json','utf8'));
const bySource = data.reduce((a,g)=>{const k=g.source||'none';a[k]=(a[k]||0)+1;return a;},{});
const noImage = data.filter(g=>!g.image_url).length;
const nonItalianHours = data.filter(g=>typeof g.hours_info==='string' && /\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/.test(g.hours_info)).length;
console.log('Totale',data.length);
console.log(bySource);
console.log('Senza immagini',noImage);
console.log('Orari con sigle inglesi residue',nonItalianHours);
