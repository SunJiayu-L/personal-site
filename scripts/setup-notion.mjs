import fs from 'node:fs/promises'

import { createNotionClient } from './notion-lib.mjs'

const schemas = JSON.parse(
  await fs.readFile(new URL('../config/notion-schema.json', import.meta.url), 'utf8')
)
if (!process.argv.includes('--apply')) {
  console.log(
    'Dry run: will create ' +
      Object.keys(schemas).join(', ') +
      ' below NOTION_PARENT_PAGE. No Notion data changed.'
  )
  console.log(
    'To create these databases, set NOTION_SETUP_TOKEN and NOTION_PARENT_PAGE in .env, then run with --apply.'
  )
} else {
  const parent = process.env.NOTION_PARENT_PAGE
  if (!/^[a-f0-9-]{32,36}$/i.test(parent || ''))
    throw new Error('NOTION_PARENT_PAGE must be a page UUID')
  const request = createNotionClient(process.env.NOTION_SETUP_TOKEN)
  const stateDir = new URL('../.sync/', import.meta.url),
    stateFile = new URL('setup-' + parent + '.json', stateDir)
  await fs.mkdir(stateDir, { recursive: true })
  const state = await fs.readFile(stateFile, 'utf8').then(JSON.parse, () => ({}))
  const save = () => fs.writeFile(stateFile, JSON.stringify(state, null, 2))
  for (const [key, original] of Object.entries(schemas)) {
    if (state[key]?.source) continue
    if (!state[key]?.database) {
      const properties = structuredClone(original)
      if (key === 'notes') properties.Course.relation.data_source_id = state.courses.source
      const result = await request('databases', {
        parent: { type: 'page_id', page_id: parent },
        title: [{ type: 'text', text: { content: 'Website · ' + key } }],
        initial_data_source: { properties }
      })
      state[key] = { database: result.id, source: result.data_sources?.[0]?.id }
      await save()
    }
    if (!state[key].source) {
      const database = await request('databases/' + state[key].database)
      state[key].source = database.data_sources?.[0]?.id
      if (!state[key].source)
        throw new Error(
          'Database created but source ID unavailable; inspect ' + state[key].database
        )
      await save()
    }
    console.log('Ready: ' + key)
  }
  const env =
    Object.entries(state)
      .map(([key, v]) => 'NOTION_' + key.toUpperCase() + '_SOURCE=' + v.source)
      .join('\n') + '\n'
  await fs.writeFile(new URL('notion-sources.env', stateDir), env)
  console.log(
    'Source IDs saved to .sync/notion-sources.env. Configure a separate read-only NOTION_TOKEN for scheduled builds.'
  )
}
