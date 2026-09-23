import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { close, createIndex } from 'pagefind'

import { check } from './check-content.mjs'

process.chdir(fileURLToPath(new URL('../', import.meta.url)))
await check(process.argv.includes('--production'))
// A fully emptied collection must not retain entries from a previous local build.
await rm('.astro/data-store.json', { force: true })
for (const command of ['check', 'build']) {
  const result = spawnSync(process.execPath, ['node_modules/astro/astro.js', command], {
    stdio: 'inherit',
    env: process.env
  })
  if (result.status !== 0) process.exit(result.status || 1)
}
try {
  const { index, errors } = await createIndex()
  if (errors.length || !index) throw new Error(errors.join(';'))
  const added = await index.addDirectory({ path: 'dist' })
  if (added.errors.length) throw new Error(added.errors.join(';'))
  const written = await index.writeFiles({ outputPath: 'dist/pagefind' })
  if (written.errors.length) throw new Error(written.errors.join(';'))
  console.log('Pagefind indexed ' + added.page_count + ' pages')
  await index.deleteIndex()
} finally {
  await close()
}
await import('./check-links.mjs')
