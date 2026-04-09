import { SITE_URL } from '$lib/site';

export function GET() {
  const body = [`User-agent: *`, `Allow: /`, `Sitemap: ${SITE_URL}/sitemap.xml`].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'max-age=3600'
    }
  });
}

