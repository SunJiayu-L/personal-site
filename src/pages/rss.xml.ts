import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'

import { catalog, entryUrl } from '../site/data'

export async function GET(context: APIContext) {
  const entries = (await getCollection('entries')).filter((e) => e.data.published)
  return rss({
    title: catalog.profile.name.zh + ' · Fieldnotes',
    description: catalog.profile.bio.zh,
    site: context.site!,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: new Date(e.data.date),
      link: entryUrl(e)
    }))
  })
}
