import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import fs from 'node:fs/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readNotebook } from './private-notebooks.mjs'

import {
  children,
  createNotionClient,
  frontmatter,
  localized,
  queryPublished,
  renderBlocks,
  safeUrl,
  slug,
  validateDataset,
  value
} from './notion-lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const request = createNotionClient(process.env.NOTION_TOKEN)
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/site/catalog.json'), 'utf8'))
const sourceNames = {
  blog: 'BLOG',
  courses: 'COURSES',
  notes: 'NOTES',
  publications: 'PUBLICATIONS',
  projects: 'PROJECTS',
  friends: 'FRIENDS'
}
const sources = Object.fromEntries(
  Object.entries(sourceNames).map(([key, name]) => [key, process.env['NOTION_' + name + '_SOURCE']])
)
if (!sources.blog || !sources.courses || !sources.notes)
  throw new Error('Configure NOTION_BLOG_SOURCE, NOTION_COURSES_SOURCE, and NOTION_NOTES_SOURCE')
for (const id of Object.values(sources).filter(Boolean))
  if (!/^[a-f0-9-]{32,36}$/i.test(id))
    throw new Error('Notion source IDs must be data-source UUIDs, not URLs')
const stage = path.join(root, '.sync', String(Date.now()))
await fs.mkdir(path.join(stage, 'entries'), { recursive: true })
await fs.mkdir(path.join(stage, 'notion'), { recursive: true })
function isPrivate(ip) {
  return (
    ip === '::1' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80') ||
    ip.startsWith('::ffff:') ||
    /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(ip)
  )
}
async function publicFetch(source) {
  const u = new URL(safeUrl(source)),
    addresses = isIP(u.hostname)
      ? [{ address: u.hostname }]
      : await lookup(u.hostname, { all: true })
  if (addresses.some((x) => isPrivate(x.address))) throw new Error('Non-public asset destination')
  const response = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error('Asset fetch failed: HTTP ' + response.status)
  return response
}
async function saveImage(source, id) {
  const r = await publicFetch(source),
    mime = (r.headers.get('content-type') || '').split(';')[0]
  const ext = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif'
  }[mime]
  if (!ext) throw new Error('Unsupported image format: ' + mime)
  if (Number(r.headers.get('content-length')) > 20 * 1024 * 1024)
    throw new Error('Image exceeds 20 MB')
  const bytes = Buffer.from(await r.arrayBuffer())
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MB')
  const name = createHash('sha256').update(id).update(bytes).digest('hex').slice(0, 24) + ext
  await fs.writeFile(path.join(stage, 'notion', name), bytes)
  return (process.env.BASE_PATH || '').replace(/\/$/, '') + '/notion/' + name
}
const rows = {}
for (const [key, id] of Object.entries(sources))
  if (id) rows[key] = await queryPublished(request, id)
const courseById = new Map()
const directCourses = new Set(rows.courses.filter(p => value(p.properties.Notebook)).map(p => p.id))
catalog.courses = rows.courses.map((page) => {
  const p = page.properties,
    c = {
      slug: slug(value(p.Slug)),
      title: localized(p),
      description: localized(p, 'Description'),
      code: value(p.Code),
      status: value(p.Status) || 'learning',
      source: safeUrl(value(p.Source)),
      demo: false
    }
  courseById.set(page.id, c.slug)
  return c
})
const entries = []
for (const kind of ['blog', 'notes'])
  for (const page of rows[kind]) {
    const p = page.properties,
      relation = p.Course?.relation || []
    // Original notebooks are authoritative: never fall back to old copies on withdrawal.
    if (kind === 'notes' && relation.some(r => directCourses.has(r.id))) continue
    if (kind === 'notes' && relation.length !== 1)
      throw new Error('Course note must belong to exactly one published course: ' + page.id)
    const entry = {
      title: value(p.Title),
      slug: slug(value(p.Slug)),
      lang: value(p.Language),
      kind: kind === 'blog' ? 'blog' : 'note',
      description: value(p.Description),
      date: p.Date?.date?.start,
      category: kind === 'blog' ? value(p.Category) : undefined,
      tags: (p.Tags?.multi_select || []).map((x) => x.name),
      course: kind === 'notes' ? courseById.get(relation[0].id) : undefined,
      order: kind === 'notes' ? p.Order?.number : 0,
      translationKey: value(p.TranslationKey) || undefined,
      series: kind === 'blog' ? value(p.Series) || undefined : undefined,
      demo: false,
      published: true
    }
    if (!['zh', 'en'].includes(entry.lang))
      throw new Error('Language must be zh or en at ' + page.id)
    const body = await renderBlocks(await children(request, page.id), {
      getChildren: (id) => children(request, id),
      saveImage
    })
    entries.push(entry)
    await fs.writeFile(
      path.join(
        stage,
        'entries',
        entry.lang +
          '-' +
          entry.kind +
          '-' +
          (entry.course ? entry.course + '-' : '') +
          entry.slug +
          '.md'
      ),
      frontmatter(entry, body)
    )
  }
const routeAliases = JSON.parse(await fs.readFile(path.join(root, 'config/notebook-routes.json'), 'utf8'))
for (const course of rows.courses.filter(p => directCourses.has(p.id))) {
  for (const { entry, blocks } of await readNotebook(request, course, routeAliases)) {
    const body = await renderBlocks(blocks, {
      getChildren: id => children(request, id), saveImage
    })
    entries.push(entry)
    await fs.writeFile(path.join(stage, 'entries', entry.lang + '-note-' + entry.course + '-' + entry.slug + '.md'), frontmatter(entry, body))
  }
}
const blogNotebooks = JSON.parse(await fs.readFile(path.join(root, 'config/blog-notebooks.json'), 'utf8'))
for (const notebook of blogNotebooks) {
  const source = { properties: { Notebook: { url: notebook.url } } }
  for (const { entry, blocks } of await readNotebook(request, source, notebook.routes || {}, {
    kind: 'blog', category: notebook.category, lang: notebook.lang || 'zh', descriptions: notebook.descriptions || {}
  })) {
    const body = await renderBlocks(blocks, { getChildren: id => children(request, id), saveImage })
    entries.push(entry)
    await fs.writeFile(path.join(stage, 'entries', entry.lang + '-blog-' + entry.slug + '.md'), frontmatter(entry, body))
  }
}
if (rows.publications)
  catalog.publications = rows.publications.map((page) => {
    const p = page.properties
    let authors, links
    try {
      authors = JSON.parse(value(p.Authors) || '[]')
      links = JSON.parse(value(p.Links) || '[]')
    } catch {
      throw new Error('Authors/Links must contain valid JSON at ' + page.id)
    }
    if (
      !Array.isArray(authors) ||
      authors.some((a) => typeof a.name !== 'string') ||
      !Array.isArray(links) ||
      links.some((l) => typeof l.type !== 'string' || typeof l.href !== 'string')
    )
      throw new Error('Invalid publication authors or links at ' + page.id)
    const type = value(p.Type),
      status = value(p.Status)
    if (
      !['conference', 'journal', 'workshop', 'preprint'].includes(type) ||
      !['published', 'accepted', 'under-review', 'preprint'].includes(status)
    )
      throw new Error('Invalid publication type/status at ' + page.id)
    return {
      title: value(p.Title),
      authors,
      links,
      venue: value(p.Venue),
      year: String(p.Year?.number || ''),
      type,
      status,
      abstract: value(p.Abstract),
      demo: false
    }
  })
if (rows.projects)
  catalog.projects = rows.projects.map((page) => {
    const p = page.properties
    return {
      slug: slug(value(p.Slug)),
      title: localized(p),
      description: localized(p, 'Description'),
      role: localized(p, 'Role'),
      url: safeUrl(value(p.URL)),
      demo: false
    }
  })
if (rows.friends)
  catalog.friends = rows.friends.map((page) => {
    const p = page.properties
    return {
      title: value(p.Title),
      description: localized(p, 'Description'),
      url: safeUrl(value(p.URL)),
      avatar: safeUrl(value(p.Avatar)),
      rss: safeUrl(value(p.RSS)),
      demo: false
    }
  })
validateDataset(entries, catalog)
await fs.writeFile(path.join(stage, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
const replacements = [
    ['entries', 'src/content/entries'],
    ['notion', 'public/notion'],
    ['catalog.json', 'src/site/catalog.json']
  ],
  completed = []
try {
  for (const [name, target] of replacements) {
    const dest = path.join(root, target),
      backup = path.join(stage, 'previous-' + name)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    const existed = await fs.stat(dest).then(
      () => true,
      () => false
    )
    if (existed) await fs.rename(dest, backup)
    try {
      await fs.rename(path.join(stage, name), dest)
    } catch (e) {
      if (existed) await fs.rename(backup, dest)
      throw e
    }
    completed.push({ dest, backup, existed, name })
  }
} catch (error) {
  for (const item of completed.reverse()) {
    await fs.rename(item.dest, path.join(stage, item.name))
    if (item.existed) await fs.rename(item.backup, item.dest)
  }
  throw error
}
console.log(
  'Synced ' +
    entries.length +
    ' published notes and ' +
    catalog.courses.length +
    ' courses. Backups are in .sync/.'
)
