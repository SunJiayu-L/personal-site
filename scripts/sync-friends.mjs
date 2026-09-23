import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { parse } from 'node-html-parser'

import { safeUrl } from './notion-lib.mjs'

export function parseFeed(xml, friend) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML entities are not supported')
  const root = parse(xml, { lowerCaseTagName: true, comment: false, voidTag: { tags: [] } }),
    result = []
  for (const node of root.querySelectorAll('item,entry')) {
    const title = node
      .querySelector('title')
      ?.textContent?.replace(/^<!\[CDATA\[|\]\]>$/g, '')
      .trim()
    const link = node
      .querySelectorAll('link')
      .find((l) => !l.getAttribute('rel') || l.getAttribute('rel') === 'alternate')
    const target = link?.getAttribute('href') || link?.textContent?.trim()
    const date = node.querySelector('pubdate,published,updated')?.textContent?.trim()
    if (!title || !target || !date || !Number.isFinite(Date.parse(date))) continue
    result.push({
      title,
      url: safeUrl(new URL(target, friend.url).href),
      date: new Date(date).toISOString(),
      friend: friend.title
    })
  }
  return result.slice(0, 8)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = new URL('../src/site/catalog.json', import.meta.url),
    catalog = JSON.parse(await fs.readFile(file, 'utf8')),
    feed = []
  for (const friend of catalog.friends) {
    if (!friend.rss) continue
    try {
      const response = await fetch(safeUrl(friend.rss), { signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const xml = await response.text()
      if (xml.length > 2_000_000) throw new Error('Feed exceeds size limit')
      feed.push(...parseFeed(xml, friend))
    } catch {
      console.warn('RSS unavailable for ' + friend.title + '; retaining its previous items')
      feed.push(...catalog.friendFeed.filter((x) => x.friend === friend.title))
    }
  }
  catalog.friendFeed = [...new Map(feed.map((x) => [x.url, x])).values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
  await fs.writeFile(file, JSON.stringify(catalog, null, 2) + '\n')
  console.log('Friend feed: ' + catalog.friendFeed.length + ' items')
}
