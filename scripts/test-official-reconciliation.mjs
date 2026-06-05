import assert from 'node:assert/strict';
import { analyzeOfficialScrape } from '../src/lib/official-scrape-cleaner.js';
import { reconcileGymWithOfficialSource } from '../src/lib/official-reconciliation.js';

const baierGym = {
  id: 'baier-1',
  slug: 'centro-taekwondo-baier',
  nome: 'Centro Taekwondo Baier',
  citta: 'Busto Arsizio',
  indirizzo: 'Via Roma 12',
  telefono: '0331 123456',
  email: '',
  sito: 'https://www.centrotaekwondobaier.it/',
  disciplines: ['Taekwondo'],
  orari: 'lunedi e mercoledi 18:00-20:00',
  descrizione: 'Centro dedicato al Taekwondo a Busto Arsizio.'
};

const officialRaw =
  'Home CHI SIAMO CORSI GALLERY CONTATTI CHI SIAMO CORSI GALLERY CONTATTI Top Menu Skip to content ' +
  'Centro Taekwondo Baier nasce come scuola dedicata al Taekwondo e alla crescita tecnica degli atleti. ' +
  'I corsi di Taekwondo sono rivolti a bambini, ragazzi e adulti. ' +
  'Orari: lunedi 18:00-20:00 mercoledi 18:00-20:00. ' +
  'Contatti: info@centrotaekwondobaier.it Tel. 0331 123456 Via Roma 12, Busto Arsizio.';

const analysis = analyzeOfficialScrape(officialRaw);
const reconciliation = reconcileGymWithOfficialSource(baierGym, {
  ...analysis,
  source_url: 'https://www.centrotaekwondobaier.it/'
});

const byField = new Map(reconciliation.rows.map((row) => [row.field, row]));

assert.equal(byField.get('telefono').status, 'confirmed');
assert.equal(byField.get('email').status, 'new_from_official');
assert.equal(byField.get('email').suggested_action, 'suggest_update');
assert.equal(byField.get('sito').status, 'confirmed');
assert(['confirmed', 'missing_on_official'].includes(byField.get('citta').status));
assert(reconciliation.editorial_eligible.some((row) => row.field === 'telefono'));

const conflict = reconcileGymWithOfficialSource(
  { ...baierGym, telefono: '0331 999999' },
  { ...analysis, source_url: 'https://www.centrotaekwondobaier.it/' }
);
assert.equal(conflict.rows.find((row) => row.field === 'telefono').status, 'conflict');
assert.equal(conflict.needs_review, true);

const unclear = reconcileGymWithOfficialSource(baierGym, {
  facts: {
    prices_found: [{ value: 'PROMO gratis solo oggi EUR 10', source_section: 'prezzi', confidence: 'high', warning: '' }]
  },
  clean_text: 'PROMO gratis solo oggi EUR 10'
});
assert.equal(unclear.rows.find((row) => row.field === 'prezzi').status, 'official_unclear');

console.log(
  JSON.stringify(
    {
      baier: {
        needs_review: reconciliation.needs_review,
        overall_confidence: reconciliation.overall_confidence,
        rows: reconciliation.rows.filter((row) => ['telefono', 'email', 'sito', 'discipline', 'orari'].includes(row.field))
      }
    },
    null,
    2
  )
);

