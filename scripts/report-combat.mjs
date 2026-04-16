import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/gyms.json','utf8'));
const wanted = ['Boxe','Judo','Jujitsu','Jujitsu Brasiliano','Karate','Kickboxe','Muay Thai','K1','MMA'];
const combat = data.filter(g => wanted.includes(g.discipline));
console.log('Totale dataset:', data.length);
console.log('Totale combat:', combat.length);
const byDisc = Object.fromEntries(wanted.map(d => [d, combat.filter(c => c.discipline===d).length]));
console.log(byDisc);
console.log('Ultimi inseriti:', data.filter(g => g.source==='nominatim-combat').map(g => `${g.name} (${g.discipline}) - ${g.city}`).join(' | '));
