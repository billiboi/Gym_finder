import assert from 'node:assert/strict';
import { analyzeOfficialHtmlPages, discoverOfficialLinks } from '../src/lib/official-structured-scraper.js';

const base = 'https://centrotaekwondobaier.example';
const homeHtml = `
  <html>
    <head>
      <title>Home - Centro Taekwondo Baier</title>
      <meta name="description" content="Scuola di Taekwondo a Busto Arsizio con corsi per bambini, ragazzi e adulti.">
      <meta property="og:description" content="Corsi di Taekwondo e allenamenti settimanali.">
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"SportsActivityLocation","name":"Centro Taekwondo Baier","address":{"streetAddress":"Via Roma 12","addressLocality":"Busto Arsizio"},"telephone":"+39 0331 123456","email":"info@centrotaekwondobaier.it"}
      </script>
    </head>
    <body>
      <header>HOME CHI SIAMO CORSI GALLERY CONTATTI HOME CHI SIAMO CORSI GALLERY CONTATTI</header>
      <a href="/chi-siamo">Chi siamo</a>
      <a href="/corsi">Corsi</a>
      <a href="/orari-prezzi">Orari e prezzi</a>
      <a href="https://instagram.com/example">Instagram</a>
      <a href="/brochure.pdf">Brochure</a>
      <h1>Centro Taekwondo Baier</h1>
      <p>Centro Taekwondo Baier nasce come scuola dedicata al Taekwondo e alla crescita tecnica degli atleti.</p>
      <p>I corsi di Taekwondo sono rivolti a bambini, ragazzi e adulti.</p>
      <a href="tel:+390331123456">Chiama</a>
      <a href="mailto:info@centrotaekwondobaier.it">Email</a>
      <iframe src="https://www.google.com/maps/embed?pb=test"></iframe>
      <footer>Privacy Policy Cookie Policy Copyright 2026</footer>
    </body>
  </html>
`;

const coursesHtml = `
  <h1>Corsi</h1>
  <p>Corsi di Taekwondo, preparazione atletica e allenamento funzionale.</p>
  <table>
    <tr><td>Lunedi</td><td>18:00-20:00</td></tr>
    <tr><td>Mercoledi</td><td>18:00-20:00</td></tr>
    <tr><td>Abbonamento mensile</td><td>EUR 60</td></tr>
  </table>
`;

const poorHtml = `<title>Sito povero</title><p>Contatti Tel. 0322 111222 Via Breve 1.</p>`;
const crossfitHtml = `
  <title>CrossFit Three F.</title>
  <meta name="description" content="Box CrossFit con classi WOD, weightlifting e allenamento funzionale.">
  <h1>CrossFit Three F.</h1>
  <p>CrossFit Three F. propone classi CrossFit, programmi strength e allenamento funzionale.</p>
  <p>Orari lunedi 07:00-21:00 venerdi 07:00-21:00.</p>
  <a href="mailto:threef@example.com">Contatti</a>
`;

const links = discoverOfficialLinks(homeHtml, base, 8);
assert(links.includes(base));
assert(links.includes(`${base}/chi-siamo`));
assert(links.includes(`${base}/corsi`));
assert(links.includes(`${base}/orari-prezzi`));
assert(!links.some((url) => /instagram|brochure\.pdf/.test(url)));
assert(links.length <= 8);

const analysis = analyzeOfficialHtmlPages([
  { url: base, html: homeHtml, fetched_at: '2026-06-05T10:00:00.000Z' },
  { url: `${base}/corsi`, html: coursesHtml, fetched_at: '2026-06-05T10:00:02.000Z' },
  { url: `${base}/contatti`, html: poorHtml, fetched_at: '2026-06-05T10:00:04.000Z' }
]);
const crossfitAnalysis = analyzeOfficialHtmlPages([{ url: 'https://crossfit-three-f.example', html: crossfitHtml, fetched_at: '2026-06-05T10:00:06.000Z' }]);

assert.equal(analysis.pages_scraped.length, 3);
assert(analysis.clean_text.includes('Centro Taekwondo Baier nasce'));
assert(!/Privacy Policy Cookie Policy|HOME CHI SIAMO CORSI GALLERY/i.test(analysis.clean_text));
assert(analysis.facts_json.contacts.some((item) => item.type === 'phone'));
assert(analysis.facts_json.contacts.some((item) => item.type === 'email'));
assert(analysis.facts_json.addresses.length >= 1);
assert(analysis.facts_json.courses.some((item) => /Taekwondo/i.test(item.value)));
assert(analysis.facts_json.schedules.length >= 1);
assert(analysis.facts_json.prices.length >= 1);
assert(analysis.facts_json.schema_org.length >= 1);
assert(analysis.confidence_score > 50);
assert(crossfitAnalysis.facts_json.courses.some((item) => /CrossFit/i.test(item.value)));
assert(crossfitAnalysis.facts_json.contacts.some((item) => item.type === 'email'));
assert(crossfitAnalysis.facts_json.schedules.length >= 1);

console.log(
  JSON.stringify(
    {
      tested: ['Centro Taekwondo Baier', 'CrossFit Three F.', 'sito povero', 'tabella orari/prezzi'],
      pages_discovered: links,
      before: 'HOME CHI SIAMO CORSI GALLERY CONTATTI ... Privacy Policy Cookie Policy Copyright 2026',
      after: analysis.clean_text.slice(0, 500),
      facts_json: analysis.facts_json,
      confidence_score: analysis.confidence_score,
      warnings: analysis.warnings
    },
    null,
    2
  )
);
