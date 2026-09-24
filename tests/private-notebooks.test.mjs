import assert from 'node:assert/strict'
import test from 'node:test'
import { notionPageId, publicationContent, readNotebook } from '../scripts/private-notebooks.mjs'

const rt = s => [{ type: 'text', plain_text: s }]
const marker = checked => ({ type: 'to_do', to_do: { checked, rich_text: rt('发布到网站') } })
const body = { type: 'paragraph', paragraph: { rich_text: rt('Public lesson') } }
test('only an unambiguous checked marker at the top publishes a note', () => {
  assert.deepEqual(publicationContent([marker(true), body]), [body])
  for (const blocks of [[], [body], [marker(false), body], [body, marker(true)], [marker(true), marker(false)], [{ ...marker(true), has_children: true }, body]])
    assert.equal(publicationContent(blocks), null)
})
test('notebook URLs are restricted to Notion page IDs', () => {
  assert.equal(notionPageId('https://app.notion.com/p/260238b26d3180e9a445fa92c4760033'), '260238b2-6d31-80e9-a445-fa92c4760033')
  for (const url of ['https://example.com/260238b26d3180e9a445fa92c4760033', 'https://notion.so.evil.com/260238b26d3180e9a445fa92c4760033', 'https://notion.so/unknown'])
    assert.throws(() => notionPageId(url))
})
test('only direct opted-in pages render; withdrawing a marker removes the note', async () => {
  const root = '260238b2-6d31-80e9-a445-fa92c4760033'
  const course = { properties: { Notebook: { url: 'https://notion.so/' + root }, Slug: { rich_text: rt('cs285n-rl') } } }
  let publish = true
  const calls = []
  const request = async endpoint => {
    calls.push(endpoint)
    if (endpoint === 'pages/' + root) return {}
    if (endpoint.startsWith('blocks/' + root + '/')) return { results: [
      { id: 'public', type: 'child_page', child_page: { title: 'Lesson' } },
      { id: 'private', type: 'child_page', child_page: { title: 'Private' } },
      { id: 'other-database', type: 'child_database' }
    ] }
    if (endpoint.startsWith('blocks/public/')) return { results: [marker(publish), body] }
    if (endpoint.startsWith('blocks/private/')) return { results: [marker(false), { type: 'child_page', id: 'private-child' }] }
    if (endpoint === 'pages/public') return { parent: { type: 'page_id', page_id: root }, created_time: '2026-01-25T00:00:00Z', properties: { title: { type: 'title', title: rt('Current original title') } } }
    throw new Error('Unexpected access: ' + endpoint)
  }
  const first = await readNotebook(request, course, { public: 'existing-slug' })
  assert.equal(first.length, 1)
  assert.equal(first[0].entry.slug, 'existing-slug')
  assert.equal(first[0].entry.title, 'Current original title')
  assert.deepEqual(first[0].blocks, [body])
  assert.ok(!calls.some(x => x.includes('private-child') || x.includes('other-database') || x === 'pages/private'))
  publish = false
  assert.deepEqual(await readNotebook(request, course), [])
})
