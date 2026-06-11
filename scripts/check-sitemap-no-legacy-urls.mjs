import { readFile } from 'node:fs/promises';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=') || '1'];
}));

const sourceFile = args.get('--file') || '';
const sourceUrl = args.get('--url') || '';

async function readSitemap() {
  if (sourceFile) return readFile(sourceFile, 'utf8');
  if (sourceUrl) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Sitemap fetch failed: ${response.status}`);
    return response.text();
  }

  throw new Error('Use --file=<sitemap.xml> or --url=<https://example.com/sitemap.xml>.');
}

const xml = await readSitemap();
const legacyUrls = [...xml.matchAll(/<loc>([^<]*\/palestre\/[^<]*csv-[^<]*)<\/loc>/gi)].map((match) => match[1]);

if (legacyUrls.length) {
  console.error(`[sitemap-no-legacy] FAIL count=${legacyUrls.length}`);
  for (const url of legacyUrls.slice(0, 20)) console.error(url);
  process.exit(1);
}

console.log('[sitemap-no-legacy] OK no csv-* gym URLs found');
