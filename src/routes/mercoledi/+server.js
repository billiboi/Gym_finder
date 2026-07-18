// /mercoledi was never a real page in this app -- it has no corresponding UI
// route and the string "mercoledì" only ever appears inside schedule/hours
// copy, never as a path. It was indexed in error (2026-07-18 404 audit, see
// data/seo-404-audit-2026-07-18/REPORT.md §5), most likely from a malformed
// link built out of a stray text fragment. Served as 410 rather than a plain
// 404 since Google has it indexed and there is no page to restore or
// redirect it to.
export function GET() {
  return new Response('Pagina non trovata', { status: 410 });
}
