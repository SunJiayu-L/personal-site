import fs from 'node:fs/promises'

import { validateDataset } from './notion-lib.mjs'

export function readEntry(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) throw new Error('Missing frontmatter')
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf(':')
        return [line.slice(0, i), JSON.parse(line.slice(i + 1).trim())]
      })
  )
}
export async function check(production = false) {
  const catalog = JSON.parse(
      await fs.readFile(new URL('../src/site/catalog.json', import.meta.url), 'utf8')
    ),
    dir = new URL('../src/content/entries/', import.meta.url)
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'))
  const entries = await Promise.all(
    files.map(async (f) => readEntry(await fs.readFile(new URL(f, dir), 'utf8')))
  )
  validateDataset(
    entries.filter((e) => e.published !== false),
    catalog,
    { production }
  )
  console.log(
    'Content validated: ' +
      entries.length +
      ' entries' +
      (production ? ' (production)' : ' (preview)')
  )
  return { entries, catalog }
}
