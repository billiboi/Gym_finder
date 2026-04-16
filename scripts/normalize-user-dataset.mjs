import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'gyms.json');

const DISCIPLINE_IMAGES = {
  Boxe: 'https://images.unsplash.com/photo-1517438984742-1262db08379e?auto=format&fit=crop&w=1200&q=80',
  Judo: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=80',
  Jujitsu: 'https://images.unsplash.com/photo-1591117207239-788bf8de6c3b?auto=format&fit=crop&w=1200&q=80',
  'Jujitsu Brasiliano': 'https://images.unsplash.com/photo-1591117207239-788bf8de6c3b?auto=format&fit=crop&w=1200&q=80',
  Karate: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=1200&q=80',
  Kickboxe: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&w=1200&q=80',
  'Muay Thai': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=1200&q=80',
  K1: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=1200&q=80',
  MMA: 'https://images.unsplash.com/photo-1517344368193-41552b6ad3f5?auto=format&fit=crop&w=1200&q=80',
  CrossFit: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
  Pilates: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80',
  Yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  Nuoto: 'https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=1200&q=80',
  Calisthenics: 'https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=1200&q=80',
  Functional: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
  Bodybuilding: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
  Fitness: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80'
};

const DAY_MAP = {
  Mo: 'Lun',
  Tu: 'Mar',
  We: 'Mer',
  Th: 'Gio',
  Fr: 'Ven',
  Sa: 'Sab',
  Su: 'Dom'
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function italianHours(input) {
  const value = clean(input);
  if (!value) return 'Orari da verificare';

  if (/^orari da verificare$/i.test(value)) return 'Orari da verificare';
  if (/^24\/7$/i.test(value)) return 'Aperto 24 ore su 24, 7 giorni su 7';

  let out = value;

  out = out.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (m) => DAY_MAP[m] || m);
  out = out.replace(/\boff\b/gi, 'chiuso');
  out = out.replace(/\s*;\s*/g, ' | ');
  out = out.replace(/\s*,\s*/g, ', ');
  out = out.replace(/\s+/g, ' ').trim();

  out = out.replace(/Lun-Fri/g, 'Lun-Ven');
  out = out.replace(/Lun-Fr/g, 'Lun-Ven');
  out = out.replace(/Mar-Th/g, 'Mar-Gio');

  return out;
}

async function run() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  const gyms = JSON.parse(raw);

  const before = gyms.length;
  const filtered = gyms.filter((g) => g.source !== 'example');

  let imagesUpdated = 0;
  let hoursUpdated = 0;

  const normalized = filtered.map((g) => {
    const discipline = clean(g.discipline) || 'Fitness';
    const image = clean(g.image_url);
    const mappedImage = DISCIPLINE_IMAGES[discipline] || DISCIPLINE_IMAGES.Fitness;

    const nextHours = italianHours(g.hours_info);
    if (nextHours !== g.hours_info) hoursUpdated += 1;

    const nextImage = image || mappedImage;
    if (nextImage !== g.image_url) imagesUpdated += 1;

    return {
      ...g,
      discipline,
      image_url: nextImage,
      hours_info: nextHours
    };
  });

  await writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), 'utf-8');

  console.log(`Pulizia finale completata.`);
  console.log(`- Record iniziali: ${before}`);
  console.log(`- Record finali: ${normalized.length}`);
  console.log(`- Palestre esempio rimosse: ${before - normalized.length}`);
  console.log(`- Immagini contestualizzate: ${imagesUpdated}`);
  console.log(`- Orari convertiti in italiano: ${hoursUpdated}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
