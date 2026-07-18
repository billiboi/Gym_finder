// Curated exceptions for legacy `/palestre/[slug]` URLs that the deterministic
// resolver in `+page.server.js` (canonical/legacy-slug/prefix/orphaned-name
// matching, plus exact-name matching against archived rows) cannot resolve on
// its own. Each entry here was reviewed individually during the 2026-07-18
// 404/redirect audit (see data/seo-404-audit-2026-07-18/REPORT.md) -- do not
// add entries without the same kind of check (does the id/name evidence
// actually point at one specific gym?).
//
// REDIRECTS: old slug -> current canonical slug (301). Used for cases where a
// mojibake-corrupted `name` at import time produced a different base slug than
// the one Google indexed, confirmed by matching the still-stable `id`.
export const LEGACY_SLUG_REDIRECTS = {
  'urban-fitness-varese-csv-633': 'urban-fitness-varese',
  'centro-elite-fitness-varese-csv-104': 'centro-0lite-fitness-varese',
  'alizestudio-di-vera-viligiardi-fitness-with-vera-csv-40': 'alizstudio-di-vera-viligiardi-fitness-with-vera',
  'jita-kya-ei-judo-gallarate-csv-301': 'jita-ky-ei-judo-gallarate',
  'bushi-no-te-arti-marziali-karate-do-kenjutsu-kobudo-antiaggressione-femminile-m-t-guney-csv-98':
    'bushi-no-te-arti-marziali-karate-do-kenjutsu-kobudo-antiaggressione-femminile-m-t-gney',
  'piscina-il-seme-societa-cooperativa-sociale-csv-489': 'piscina-il-seme-societ-cooperativa-sociale',
  'krav-maga-kick-boxing-boxe-mma-savate-boxe-de-rue-ju-jitsu-judo-fit-boxe-psicomotricta-sportiva-fitness-kidssaronno-milano-csv-326':
    'krav-maga-kick-boxing-boxe-mma-savate-boxe-de-rue-ju-jitsu-judo-fit-boxe-psicomotrict-sportiva-fitness-kidssaronno-milano',
  // Active gym (id csv-244), not archived. The `name`/`nome` columns disagree
  // on spelling ("GiSeVuoi" vs "GiùSeVuoi"), so today's computed slug
  // ("giusevuoi") no longer matches the accent-less URL Google indexed. This
  // is a byproduct of an unrelated data-quality issue on this row (mismatched
  // editorial content, flagged separately, not touched here) -- left as a
  // plain redirect since the SEO fix and the data fix are independent.
  'gisevuoi-csv-244': 'giusevuoi'
};

// GONE: old slug -> 410 (permanently removed, do not guess a redirect target).
// Covers: id reassigned to an unrelated gym since Google indexed the URL
// (sport-cafe-locarno), no plausible match at all in the current or archived
// catalog (tigota, the two crossfit- entries), low-confidence name matches
// left unconfirmed during the audit (societa-federale, spazio-esychia,
// momo-boxing-club), and one mojibake-corrupted archived-row match too weak
// for the deterministic exact-name-vs-archived-catalog rule to catch on its
// own (universita-degli-studi-dell-insubria).
export const LEGACY_SLUG_GONE = new Set([
  'sport-cafe-locarno-csv-559',
  'tigota-csv-618',
  'crossfit-motus-rostock-csv-159',
  'crossfit-sturmflut-csv-161',
  'societa-federale-di-ginnastica-chiasso-csv-544',
  'spazio-esychia-anna-arturi-csv-554',
  'momo-boxing-club-csv-381',
  'universita-degli-studi-dell-insubria-palainsubria-csv-627'
]);
