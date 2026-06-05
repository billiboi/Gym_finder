import assert from 'node:assert/strict';
import {
  analyzeOfficialScrape,
  cleanOfficialScrape,
  dedupeTextBlocks,
  extractOfficialFacts,
  extractOfficialSections
} from '../src/lib/official-scrape-cleaner.js';

const fixtures = [
  {
    name: 'Centro Taekwondo Baier',
    raw:
      'Home - Centro Taekwondo Baier CHI SIAMO CORSI GALLERY CONTATTI CHI SIAMO CORSI GALLERY CONTATTI Top Menu Skip to content Home Home Home ' +
      'Centro Taekwondo Baier nasce come scuola dedicata al Taekwondo e alla crescita tecnica degli atleti. ' +
      'I corsi di Taekwondo sono rivolti a bambini, ragazzi e adulti con allenamenti settimanali. ' +
      'Maestro Mario Rossi segue gli allenamenti e la preparazione. Orari: lunedi 18:00-20:00 mercoledi 18:00-20:00. ' +
      'Contatti: info@centrotaekwondobaier.it Tel. 0331 123456 Via Roma 12, Busto Arsizio. Privacy Policy Cookie Policy Copyright 2025.'
  },
  {
    name: 'CrossFit Three F.',
    raw:
      'MENU HOME WOD COACH CONTATTI MENU HOME WOD COACH CONTATTI Skip to content ' +
      'CrossFit Three F. propone classi CrossFit, allenamento funzionale e programmi strength. ' +
      'I coach seguono tecnica, mobilita e lavoro metabolico. Corsi: CrossFit, Weightlifting, Functional training. ' +
      'Prezzi: abbonamento mensile EUR 85. Orari lunedi 07:00-21:00 venerdi 07:00-21:00. Email threef@example.com.'
  },
  {
    name: 'Sito ufficiale povero',
    raw: 'Home Contatti Privacy Cookie Tel. 0322 111222 Via Breve 1. Palestra aperta su appuntamento.'
  },
  {
    name: 'Molti menu duplicati',
    raw:
      'HOME CORSI CHI SIAMO CONTATTI HOME CORSI CHI SIAMO CONTATTI HOME CORSI CHI SIAMO CONTATTI Top Menu Top Menu ' +
      'Chi siamo La palestra lavora sul benessere e su corsi personalizzati. ' +
      'Chi siamo La palestra lavora sul benessere e su corsi personalizzati. ' +
      'Corsi Pilates Yoga Ginnastica posturale. Corsi Pilates Yoga Ginnastica posturale. ' +
      'Footer Privacy Copyright Cookie Banner'
  }
];

const baier = analyzeOfficialScrape(fixtures[0].raw);
assert(!/Skip to content|Top Menu|Cookie Policy|Copyright/i.test(baier.clean_text));
assert(!/CHI SIAMO CORSI GALLERY CONTATTI/i.test(baier.clean_text));
assert(/Centro Taekwondo Baier nasce/i.test(baier.clean_text));
assert(/Taekwondo/i.test(baier.clean_text));
assert(baier.sections.corsi.text || baier.sections.discipline.text);
assert(baier.facts.emails_found.some((item) => item.value === 'info@centrotaekwondobaier.it'));
assert(baier.facts.phones_found.length >= 1);
assert(baier.facts.addresses_found.length >= 1);

const duplicated = dedupeTextBlocks('Corsi Pilates Yoga.\nCorsi Pilates Yoga.\nCorsi Pilates Yoga e Ginnastica posturale.');
assert.equal((duplicated.match(/Corsi Pilates Yoga/g) || []).length, 1);
assert(/Ginnastica posturale/.test(duplicated));

for (const fixture of fixtures) {
  const cleaned = cleanOfficialScrape(fixture.raw);
  const sections = extractOfficialSections(cleaned);
  const facts = extractOfficialFacts(sections);
  assert(cleaned.length > 0, `${fixture.name}: testo pulito vuoto`);
  assert(sections.sections, `${fixture.name}: sezioni mancanti`);
  assert(facts.facts, `${fixture.name}: fatti mancanti`);
}

console.log(
  JSON.stringify(
    {
      tested: fixtures.map((fixture) => fixture.name),
      baier: {
        before: fixtures[0].raw.slice(0, 220),
        after: baier.clean_text,
        sections: Object.fromEntries(Object.entries(baier.sections).filter(([, section]) => section.text)),
        facts: baier.facts,
        warnings: baier.warnings
      }
    },
    null,
    2
  )
);
