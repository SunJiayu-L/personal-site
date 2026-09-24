import assert from 'node:assert/strict'
import test from 'node:test'

import { readEntry } from '../scripts/check-content.mjs'
import {
  frontmatter,
  queryPublished,
  renderBlocks,
  richText,
  safeUrl,
  slug,
  validateDataset
} from '../scripts/notion-lib.mjs'
import { parseFeed } from '../scripts/sync-friends.mjs'

const rt = (s) => [{ type: 'text', text: { content: s }, plain_text: s }]
const catalog = () => ({
  demo: false,
  profile: { name: { zh: '测试', en: 'Test' }, github: 'https://github.com/example' },
  courses: [{ slug: 'test-course' }],
  publications: [],
  projects: [],
  friends: []
})
const entry = () => ({
  slug: 'test-note',
  kind: 'note',
  course: 'test-course',
  order: 1,
  lang: 'zh',
  title: 'Test',
  description: 'Description',
  date: '2026-09-20',
  published: true
})
test('published pagination excludes drafts and archived pages', async () => {
  let count = 0
  const result = await queryPublished(async (endpoint, body) => {
    assert.match(endpoint, /data_sources/)
    assert.equal(body.filter.checkbox.equals, true)
    count++
    if (count === 1)
      return {
        results: [
          { object: 'page', id: 'yes', properties: { Published: { checkbox: true } } },
          { object: 'page', id: 'no', properties: { Published: { checkbox: false } } }
        ],
        has_more: true,
        next_cursor: 'cursor'
      }
    assert.equal(body.start_cursor, 'cursor')
    return {
      results: [
        {
          object: 'page',
          id: 'archive',
          archived: true,
          properties: { Published: { checkbox: true } }
        },
        { object: 'page', id: 'next', properties: { Published: { checkbox: true } } }
      ],
      has_more: false
    }
  }, 'source')
  assert.deepEqual(
    result.map((x) => x.id),
    ['yes', 'next']
  )
})
test('rich text escapes HTML and rejects executable links', () => {
  assert.equal(richText(rt('<script>alert(1)</script>')), '&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.throws(() => richText([{ ...rt('x')[0], href: 'javascript:alert(1)' }]), /protocol/)
  assert.throws(() => safeUrl('https://name:secret@example.com/'), /Credentials/)
})
test('literal dollar text stays text while native equations remain math', () => {
  assert.equal(richText(rt('$x^2$ costs $5')), '\\$x^2\\$ costs \\$5')
  assert.equal(richText([{ type: 'equation', equation: { expression: 'x^2' } }]), '$x^2$')
})
test('nested lists, code, math, tables and images render', async () => {
  const children = {
    list: [{ id: 'child', type: 'paragraph', paragraph: { rich_text: rt('nested') } }],
    table: [
      { type: 'table_row', table_row: { cells: [rt('A'), rt('B')] } },
      { type: 'table_row', table_row: { cells: [rt('1'), rt('2')] } }
    ]
  }
  const source = String.fromCharCode(96).repeat(3) + 'inside'
  const result = await renderBlocks(
    [
      {
        id: 'list',
        type: 'bulleted_list_item',
        has_children: true,
        bulleted_list_item: { rich_text: rt('parent') }
      },
      { id: 'code', type: 'code', code: { language: 'python', rich_text: rt(source) } },
      { id: 'eq', type: 'equation', equation: { expression: 'x^2' } },
      {
        id: 'image',
        type: 'image',
        image: {
          type: 'file',
          file: { url: 'https://example.com/image.png' },
          caption: rt('image')
        }
      },
      { id: 'table', type: 'table', has_children: true, table: { has_column_header: true } }
    ],
    { getChildren: async (id) => children[id], saveImage: async () => '/notion/test.png' }
  )
  assert.match(result, /- parent\n    nested/)
  assert.ok(result.includes(String.fromCharCode(96).repeat(4) + 'python'))
  assert.ok(result.includes('$$\nx^2\n$$'))
  assert.match(result, /!\[image\]\(\/notion\/test.png\)/)
  assert.ok(result.includes('| A | B |\n| --- | --- |'))
})
test('unsupported blocks fail with their location', async () => {
  await assert.rejects(
    renderBlocks([{ id: 'bad-block', type: 'unsupported' }], {
      getChildren: async () => [],
      saveImage: async () => ''
    }),
    /bad-block/
  )
})
test('slugs reject traversal and reserved category paths', () => {
  for (const value of ['../secret', 'research', 'Hello World', 'x/y'])
    assert.throws(() => slug(value))
  assert.equal(slug('linear-regression'), 'linear-regression')
})
test('dataset rejects duplicate routes, chapter order and orphan notes', () => {
  assert.throws(() => validateDataset([entry(), entry()], catalog()), /Duplicate route/)
  assert.throws(
    () => validateDataset([entry(), { ...entry(), slug: 'another' }], catalog()),
    /chapter order/
  )
  assert.throws(
    () => validateDataset([{ ...entry(), course: 'missing' }], catalog()),
    /Course relation/
  )
})
test('translation keys are unique within each language', () => {
  assert.throws(
    () =>
      validateDataset(
        [
          { ...entry(), translationKey: 'pair' },
          { ...entry(), slug: 'second', order: 2, translationKey: 'pair' }
        ],
        catalog()
      ),
    /translation key/
  )
  validateDataset(
    [
      { ...entry(), translationKey: 'pair' },
      { ...entry(), lang: 'en', translationKey: 'pair' }
    ],
    catalog()
  )
})
test('production rejects preview data before deployment', () =>
  assert.throws(
    () => validateDataset([entry()], { ...catalog(), demo: true }, { production: true }),
    /demo/
  ))
test('frontmatter preserves quotes, newlines and multilingual titles', () => {
  const data = { ...entry(), title: '中文 "quoted"\\nline', tags: ['a', 'b'] }
  assert.deepEqual(readEntry(frontmatter(data, 'Body')), data)
})
test('withdrawing the last published post is allowed in production', () => {
  const previous = process.env.SITE_URL
  process.env.SITE_URL = 'https://test.github.io'
  try {
    validateDataset([], catalog(), { production: true })
  } finally {
    if (previous === undefined) delete process.env.SITE_URL
    else process.env.SITE_URL = previous
  }
})
test('tag and series labels cannot escape their URL segment', () => {
  assert.throws(() => validateDataset([{ ...entry(), series: 'a/b' }], catalog()), /Invalid tag or series/)
  assert.throws(() => validateDataset([{ ...entry(), tags: ['..'] }], catalog()), /Invalid tag or series/)
})
test('RSS and Atom feeds parse and ignore invalid dates', () => {
  const friend = { title: 'Friend', url: 'https://example.com/' }
  const rss =
    '<rss><channel><item><title>Note</title><link>https://example.com/note</link><pubDate>2026-09-20</pubDate></item><item><title>Bad</title><link>https://example.com/bad</link><pubDate>invalid</pubDate></item></channel></rss>'
  assert.equal(parseFeed(rss, friend)[0]?.url, 'https://example.com/note')
  const atom =
    '<feed><entry><title>Atom note</title><link href="/atom" rel="alternate"/><updated>2026-09-20T00:00:00Z</updated></entry></feed>'
  assert.equal(parseFeed(atom, friend)[0]?.url, 'https://example.com/atom')
  assert.throws(() => parseFeed('<!DOCTYPE foo><rss/>', friend), /entities/)
})
