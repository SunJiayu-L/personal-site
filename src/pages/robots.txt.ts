import type { APIContext } from 'astro'

import { base, catalog } from '../site/data'

export function GET({ site }: APIContext) {
  return new Response(
    catalog.demo
      ? 'User-agent: *\nDisallow: /\n'
      : 'User-agent: *\nAllow: /\nSitemap: ' +
          new URL(base + '/sitemap-index.xml', site).href +
          '\n',
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
