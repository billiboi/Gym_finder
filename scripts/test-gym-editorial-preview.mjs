import assert from 'node:assert/strict';
import { analyzeOfficialHtmlPages } from '../src/lib/official-structured-scraper.js';
import { reconcileGymFacts } from '../src/lib/official-reconciliation.js';
import { generateGymEditorialPreview } from '../src/lib/gym-editorial-preview.js';

const publicSlopRe =
  /scheda sportiva presente|informazioni disponibili|verifica diretta|preview usa|testo prudente|la scheda|questa scheda|raccoglie|segnala|fonte ufficiale|dati non confermati|ricavati dal sito ufficiale|fallback sicuro/i;

function previewFor(gym, html, sourceUrl = 'https://example.test/') {
  const analysis = analyzeOfficialHtmlPages([{ url: sourceUrl, html, fetched_at: '2026-06-05T10:00:00.000Z' }]);
  const reconciliation = reconcileGymFacts(gym, { ...analysis.facts_json, source_url: sourceUrl, website: sourceUrl });
  return generateGymEditorialPreview(gym, reconciliation.used_facts, reconciliation.excluded_facts);
}

const baierGym = {
  nome: 'Centro Taekwondo Baier',
  citta: 'Busto Arsizio',
  indirizzo: 'Via Roma 12',
  telefono: '0331 123456',
  sito: 'https://www.centrotaekwondobaier.it/',
  disciplines: ['Taekwondo'],
  orari: 'lunedi e mercoledi 18:00-20:00'
};

const baierHtml = `
  <title>Centro Taekwondo Baier</title>
  <meta name="description" content="Scuola di Taekwondo a Busto Arsizio con corsi per bambini, ragazzi e adulti.">
  <script type="application/ld+json">{"@type":"SportsActivityLocation","name":"Centro Taekwondo Baier","address":{"streetAddress":"Via Roma 12","addressLocality":"Busto Arsizio"},"telephone":"0331 123456","email":"info@centrotaekwondobaier.it"}</script>
  <header>HOME CHI SIAMO CORSI GALLERY CONTATTI Top Menu Skip to content migliore leader esperienza unica</header>
  <h1>Centro Taekwondo Baier</h1>
  <p>Centro Taekwondo Baier nasce come scuola dedicata al Taekwondo e alla crescita tecnica degli atleti.</p>
  <p>I corsi di Taekwondo sono rivolti a bambini, ragazzi e adulti.</p>
  <a href="tel:0331123456">Telefono</a>
  <a href="mailto:info@centrotaekwondobaier.it">Email</a>
  <table><tr><td>Lunedi</td><td>18:00-20:00</td></tr><tr><td>Mercoledi</td><td>18:00-20:00</td></tr></table>
`;

const baierPreview = previewFor(baierGym, baierHtml, baierGym.sito);
assert(['A', 'B'].includes(baierPreview.livello));
assert(baierPreview.descrizione_breve.includes('Centro Taekwondo Baier'));
assert(baierPreview.faq.length >= 3);
assert(!/migliore|leader|esperienza unica|a 360 gradi|nel mondo moderno/i.test(baierPreview.descrizione_lunga));
assert(!publicSlopRe.test(baierPreview.descrizione_breve));
assert(!publicSlopRe.test(baierPreview.descrizione_lunga));
assert(baierPreview.faq.every((item) => !publicSlopRe.test(item.answer)));
assert(baierPreview.used_facts.every((fact) => fact.confidence !== 'low'));

const appOnlyPreview = generateGymEditorialPreview(
  {
    nome: 'Centro Taekwondo Baier',
    citta: 'Busto Arsizio',
    indirizzo: 'Via Roma 12',
    telefono: '0331 123456',
    sito: 'https://www.centrotaekwondobaier.it/',
    disciplines: ['Taekwondo'],
    descrizione:
      'Centro Taekwondo Baier e una scuola dedicata al Taekwondo con corsi rivolti a bambini, ragazzi e adulti. La scheda raccoglie sede e contatti utili per chi vuole informazioni.'
  },
  reconcileGymFacts(
    {
      nome: 'Centro Taekwondo Baier',
      citta: 'Busto Arsizio',
      indirizzo: 'Via Roma 12',
      telefono: '0331 123456',
      sito: 'https://www.centrotaekwondobaier.it/',
      disciplines: ['Taekwondo'],
      descrizione:
        'Centro Taekwondo Baier e una scuola dedicata al Taekwondo con corsi rivolti a bambini, ragazzi e adulti. La scheda raccoglie sede e contatti utili per chi vuole informazioni.'
    },
    {}
  )
);
assert(['A', 'B'].includes(appOnlyPreview.livello));
assert.equal(appOnlyPreview.needs_review, false);
assert(!/fonte ufficiale|scraping|ricavati dal sito ufficiale/i.test(appOnlyPreview.descrizione_breve));
assert(!publicSlopRe.test(appOnlyPreview.descrizione_breve));
assert(!publicSlopRe.test(appOnlyPreview.descrizione_lunga));

const crossfitPreview = previewFor(
  {
    nome: 'CrossFit Three F.',
    citta: 'Varese',
    indirizzo: 'Via Allenamento 3',
    sito: 'https://crossfitthreef.example/',
    disciplines: ['CrossFit', 'Fitness'],
    telefono: '0332 111222'
  },
  `
    <title>CrossFit Three F.</title>
    <meta name="description" content="Box CrossFit a Varese con classi CrossFit e allenamento funzionale.">
    <p>CrossFit Three F. propone classi CrossFit, allenamento funzionale e programmi strength.</p>
    <p>Via Allenamento 3, Varese. Orari lunedi 07:00-21:00.</p>
    <a href="tel:0332111222">Telefono</a>
  `,
  'https://crossfitthreef.example/'
);
assert(crossfitPreview.descrizione_breve.includes('CrossFit'));

const completePreview = previewFor(
  {
    nome: 'Studio Movimento',
    citta: 'Lugano',
    indirizzo: 'Via Pico 28',
    email: 'info@studio.example',
    sito: 'https://studio.example/',
    disciplines: ['Pilates', 'Yoga'],
    orari: 'lunedi 09:00-18:00'
  },
  `
    <meta name="description" content="Studio Movimento e uno spazio dedicato a Pilates e Yoga a Lugano.">
    <p>Studio Movimento e uno spazio dedicato a Pilates e Yoga a Lugano.</p>
    <p>Sede Via Pico 28 Lugano. Orari lunedi 09:00-18:00.</p>
    <a href="mailto:info@studio.example">Email</a>
  `,
  'https://studio.example/'
);
assert(['A', 'B'].includes(completePreview.livello));

const emsPreview = generateGymEditorialPreview(
  {
    nome: 'Body Work Lugano - EMS e Vacu Gym',
    citta: 'Lugano',
    indirizzo: 'Via Tesserete 65',
    telefono: '+41 76 707 75 47',
    disciplines: ['EMS Training'],
    descrizione:
      "Body Work Lugano - EMS e Vacu Gym e' una palestra a Lugano con attivita legate a EMS Training. E' un riferimento locale per chi cerca attivita di EMS Training."
  },
  reconcileGymFacts(
    {
      nome: 'Body Work Lugano - EMS e Vacu Gym',
      citta: 'Lugano',
      indirizzo: 'Via Tesserete 65',
      telefono: '+41 76 707 75 47',
      disciplines: ['EMS Training']
    },
    {}
  )
);
assert(countMatches(emsPreview.descrizione_lunga, /\bEMS\b/gi) <= 2);
assert(!emsPreview.descrizione_lunga.includes('chi cerca attivita di EMS Training'));

const poorGym = { nome: 'Palestra Essenziale', citta: 'Como', disciplines: ['Fitness'] };
const poorPreview = generateGymEditorialPreview(poorGym, reconcileGymFacts(poorGym, {}));
assert.equal(poorPreview.livello, 'C');
assert(!publicSlopRe.test(poorPreview.descrizione_lunga));

const shaolinGym = {
  nome: 'Shaolin NanYuan KungFu Switzerland',
  citta: 'Locarno',
  indirizzo: 'Via Vallemaggia 11',
  disciplines: ['Kung Fu']
};
const shaolinPreview = generateGymEditorialPreview(shaolinGym, reconcileGymFacts(shaolinGym, {}));
assert(!publicSlopRe.test(shaolinPreview.descrizione_breve));
assert(!publicSlopRe.test(shaolinPreview.descrizione_lunga));
assert(shaolinPreview.descrizione_breve.includes('scuola di Kung Fu a Locarno'));
assert(shaolinPreview.descrizione_lunga.includes('Via Vallemaggia 11'));

const conflictAnalysis = analyzeOfficialHtmlPages([
  {
    url: baierGym.sito,
    html: '<p>Centro Taekwondo Baier. Taekwondo. Via Roma 12, Busto Arsizio.</p><a href="tel:0331123456">Telefono</a>',
    fetched_at: '2026-06-05T10:00:00.000Z'
  }
]);
const conflictReconciliation = reconcileGymFacts(
  { ...baierGym, telefono: '0331 999999' },
  { ...conflictAnalysis.facts_json, source_url: baierGym.sito, website: baierGym.sito }
);
const conflictPreview = generateGymEditorialPreview({ ...baierGym, telefono: '0331 999999' }, conflictReconciliation.used_facts, conflictReconciliation.excluded_facts);
assert.equal(conflictPreview.livello, 'C');
assert(conflictPreview.excluded_facts.some((fact) => fact.field === 'telefono'));

function countMatches(text, pattern) {
  return [...String(text || '').matchAll(pattern)].length;
}

console.log(
  JSON.stringify(
    {
      baier: {
        livello: baierPreview.livello,
        quality_score: baierPreview.quality_score,
        descrizione_breve: baierPreview.descrizione_breve,
        descrizione_lunga: baierPreview.descrizione_lunga,
        faq: baierPreview.faq,
        used_facts: baierPreview.used_facts,
        excluded_facts: baierPreview.excluded_facts,
        warnings: baierPreview.warnings
      },
      tested: ['Centro Taekwondo Baier', 'CrossFit Three F.', 'dati completi', 'fonte povera', 'conflitti']
    },
    null,
    2
  )
);
