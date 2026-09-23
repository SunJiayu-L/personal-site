import { setTimeout as delay } from 'node:timers/promises'

export const API_VERSION = '2026-03-11'
export const text = (p) =>
  (p?.title || p?.rich_text || []).map((x) => x.plain_text ?? x.text?.content ?? '').join('')
export const value = (p) => p?.select?.name ?? p?.status?.name ?? p?.url ?? p?.email ?? text(p)
export const localized = (p, name = 'Title') => ({
  zh: value(p[name]),
  en: value(p[name + ' EN']) || value(p[name])
})
export function safeUrl(input, { allowMail = false } = {}) {
  if (!input) return ''
  const u = new URL(input)
  if (!['https:', 'http:', ...(allowMail ? ['mailto:'] : [])].includes(u.protocol))
    throw new Error('Unsupported URL protocol')
  if (u.username || u.password) throw new Error('Credentials are not allowed in content URLs')
  return u.href
}
export function slug(input) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input))
    throw new Error('Slug must use lowercase letters, numbers, and hyphens: ' + input)
  if (['research', 'technical', 'daily-life'].includes(input))
    throw new Error('Slug is reserved for a category: ' + input)
  return input
}
export function frontmatter(data, body) {
  return (
    '---\n' +
    Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => k + ': ' + JSON.stringify(v))
      .join('\n') +
    '\n---\n\n' +
    body +
    '\n'
  )
}
export function escapeText(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\\x60*_[\]{}|])/g, '\\$1')
    .replace(/^([>#\-+]|\d+\.)/gm, '\\$1')
}
export function richText(items = []) {
  return items
    .map((item) => {
      if (item.type === 'equation') return '$' + item.equation.expression + '$'
      const raw = item.plain_text ?? item.text?.content ?? ''
      let s = escapeText(raw),
        a = item.annotations || {}
      if (a.code) {
        const fence = String.fromCharCode(96).repeat(
          Math.max(1, ...(raw.match(/\x60+/g) || []).map((x) => x.length + 1))
        )
        s = fence + ' ' + raw + ' ' + fence
      } else {
        if (a.bold) s = '**' + s + '**'
        if (a.italic) s = '*' + s + '*'
        if (a.strikethrough) s = '~~' + s + '~~'
      }
      const href = item.href ?? item.text?.link?.url
      if (href) s = '[' + s + '](<' + safeUrl(href, { allowMail: true }).replace(/>/g, '%3E') + '>)'
      return s
    })
    .join('')
}
export function createNotionClient(token, fetcher = fetch) {
  if (!token) throw new Error('NOTION_TOKEN is missing')
  return async function request(endpoint, body) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await delay(340)
      const response = await fetcher('https://api.notion.com/v1/' + endpoint, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'Notion-Version': API_VERSION,
          'Content-Type': 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(30000)
      })
      if (
        (response.status === 429 || (response.status >= 500 && endpoint !== 'databases')) &&
        attempt < 3
      ) {
        await delay(
          Math.min(10000, Number(response.headers.get('retry-after') || 2 ** attempt) * 1000)
        )
        continue
      }
      if (!response.ok)
        throw new Error(
          'Notion ' +
            response.status +
            ' at ' +
            endpoint.split('?')[0] +
            '; check permissions and data-source configuration'
        )
      return response.json()
    }
  }
}
export async function queryPublished(request, id) {
  const pages = []
  let cursor
  do {
    const r = await request('data_sources/' + id + '/query', {
      page_size: 100,
      filter: { property: 'Published', checkbox: { equals: true } },
      ...(cursor ? { start_cursor: cursor } : {})
    })
    pages.push(
      ...r.results.filter(
        (p) =>
          p.object === 'page' &&
          !p.archived &&
          !p.in_trash &&
          p.properties?.Published?.checkbox === true
      )
    )
    cursor = r.has_more ? r.next_cursor : undefined
    if (r.has_more && !cursor) throw new Error('Incomplete Notion pagination')
  } while (cursor)
  return pages
}
export async function children(request, id) {
  const items = []
  let cursor
  do {
    const r = await request(
      'blocks/' +
        id +
        '/children?page_size=100' +
        (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : '')
    )
    items.push(...r.results)
    cursor = r.has_more ? r.next_cursor : undefined
    if (r.has_more && !cursor) throw new Error('Incomplete block pagination')
  } while (cursor)
  return items
}
export async function renderBlocks(blocks, { getChildren, saveImage }, depth = 0) {
  if (depth > 30) throw new Error('Notion nesting exceeds 30 levels')
  const output = []
  for (const b of blocks) {
    const d = b[b.type] || {},
      rich = richText(d.rich_text)
    const nested = b.has_children ? await getChildren(b.id) : []
    const child = async () => renderBlocks(nested, { getChildren, saveImage }, depth + 1)
    let result = ''
    switch (b.type) {
      case 'paragraph':
        result = rich
        break
      case 'heading_1':
        result = '# ' + rich
        break
      case 'heading_2':
        result = '## ' + rich
        break
      case 'heading_3':
        result = '### ' + rich
        break
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'to_do': {
        const marker =
          b.type === 'numbered_list_item'
            ? '1. '
            : b.type === 'to_do'
              ? d.checked
                ? '- [x] '
                : '- [ ] '
              : '- '
        result =
          marker +
          rich +
          (nested.length
            ? '\n' +
              (await child())
                .split('\n')
                .map((l) => '    ' + l)
                .join('\n')
            : '')
        output.push(result)
        continue
      }
      case 'quote':
      case 'callout':
        result = (rich + (nested.length ? '\n\n' + (await child()) : ''))
          .split('\n')
          .map((l) => '> ' + l)
          .join('\n')
        output.push(result)
        continue
      case 'code': {
        const raw = (d.rich_text || []).map((x) => x.plain_text ?? x.text?.content ?? '').join('')
        const fence = String.fromCharCode(96).repeat(
          Math.max(3, ...(raw.match(/\x60+/g) || []).map((x) => x.length + 1))
        )
        const aliases = { 'plain text': 'text', 'c++': 'cpp', 'c#': 'csharp', shell: 'bash' }
        const language =
          aliases[d.language] || (/^[a-z0-9-]+$/i.test(d.language || '') ? d.language : 'text')
        result = fence + language + '\n' + raw + '\n' + fence
        break
      }
      case 'equation':
        result = '$$\n' + d.expression + '\n$$'
        break
      case 'divider':
        result = '---'
        break
      case 'image': {
        const source = d.type === 'file' ? d.file.url : d.external?.url
        if (!source) throw new Error('Missing image URL at block ' + b.id)
        result =
          '![' +
          escapeText((d.caption || []).map((x) => x.plain_text ?? x.text?.content ?? '').join('')) +
          '](' +
          (await saveImage(source, b.id)) +
          ')'
        break
      }
      case 'bookmark':
      case 'link_preview':
      case 'embed':
      case 'video':
      case 'file':
      case 'pdf': {
        const source = d.url || d.external?.url
        if (!source)
          throw new Error('Hosted attachment requires a durable external URL at block ' + b.id)
        result =
          '[' +
          (richText(d.caption) || escapeText(d.name || b.type)) +
          '](<' +
          safeUrl(source) +
          '>)'
        break
      }
      case 'table': {
        const rows = nested
          .filter((x) => x.type === 'table_row')
          .map((x) => x.table_row.cells.map((c) => richText(c).replace(/\n/g, ' ')))
        if (rows.length) {
          const width = rows[0].length
          if (rows.some((r) => r.length !== width))
            throw new Error('Table cell count mismatch at ' + b.id)
          if (!d.has_column_header) rows.unshift(Array(width).fill(''))
          result = rows
            .map(
              (r, i) =>
                '| ' +
                r.join(' | ') +
                ' |' +
                (i === 0 ? '\n| ' + r.map(() => '---').join(' | ') + ' |' : '')
            )
            .join('\n')
        }
        output.push(result)
        continue
      }
      case 'toggle':
        result = '**' + rich + '**'
        break
      case 'column_list':
      case 'column':
        result = ''
        break
      case 'table_of_contents':
        continue
      default:
        throw new Error(
          'Unsupported Notion block ' + b.type + ' at ' + b.id + '; replace it before publishing'
        )
    }
    if (nested.length) result += '\n\n' + (await child())
    output.push(result)
  }
  return output.join('\n\n')
}
export function validateDataset(entries, catalog, { production = false } = {}) {
  const seen = new Set(),
    translations = new Set(),
    courses = new Set(catalog.courses.map((c) => slug(c.slug)))
  if (courses.size !== catalog.courses.length) throw new Error('Duplicate course slug')
  for (const entry of entries) {
    const e = entry.data || entry
    slug(e.slug)
    for (const label of [...(e.tags || []), ...(e.series ? [e.series] : [])])
      if (!label.trim() || /[\\/#?%]/.test(label) || label === '.' || label === '..')
        throw new Error('Invalid tag or series label: ' + label)
    if (!['zh', 'en'].includes(e.lang)) throw new Error('Language must be zh or en')
    if (!['blog', 'note'].includes(e.kind)) throw new Error('Invalid content kind')
    if (!e.title?.trim() || !e.description?.trim() || !Number.isFinite(Date.parse(e.date)))
      throw new Error('Missing title, description, or valid date: ' + e.slug)
    if (e.kind === 'blog' && !['research', 'technical', 'daily-life'].includes(e.category))
      throw new Error('Invalid blog category: ' + e.slug)
    if (e.kind === 'note' && (!courses.has(e.course) || !Number.isFinite(e.order)))
      throw new Error('Course relation or chapter order is invalid: ' + e.slug)
    const key = e.lang + '/' + e.kind + '/' + (e.course || '') + '/' + e.slug
    if (seen.has(key)) throw new Error('Duplicate route: ' + key)
    seen.add(key)
    if (e.translationKey) {
      const key = e.lang + '/' + e.translationKey
      if (translations.has(key)) throw new Error('Duplicate translation key: ' + key)
      translations.add(key)
    }
  }
  for (const lang of ['zh', 'en'])
    for (const c of courses) {
      const orders = entries
        .map((e) => e.data || e)
        .filter((e) => e.kind === 'note' && e.course === c && e.lang === lang)
        .map((e) => e.order)
      if (new Set(orders).size !== orders.length)
        throw new Error('Duplicate chapter order: ' + c + ' / ' + lang)
    }
  for (const item of [...catalog.links, ...catalog.friends]) safeUrl(item.url)
  for (const item of catalog.projects) if (item.url) safeUrl(item.url)
  for (const item of catalog.publications) {
    for (const link of item.links) safeUrl(link.href)
    for (const author of item.authors || []) if (author.homepage) safeUrl(author.homepage)
  }
  for (const key of ['github', 'scholar', 'cv'])
    if (catalog.profile[key]) safeUrl(catalog.profile[key])
  if (production) {
    if (
      catalog.demo ||
      entries.some((e) => (e.data || e).demo) ||
      [
        ...catalog.courses,
        ...catalog.publications,
        ...catalog.projects,
        ...catalog.links,
        ...catalog.friends
      ].some((e) => e.demo)
    )
      throw new Error('Production blocked: replace or remove all demo content first')
    if (
      !catalog.profile.name.zh.trim() ||
      !catalog.profile.name.en.trim() ||
      /你的名字|Your name/.test(JSON.stringify(catalog.profile))
    )
      throw new Error('Production blocked: complete the bilingual profile')
    if (!catalog.profile.github) throw new Error('Production blocked: GitHub profile is missing')
    // Empty published lists are valid: withdrawing the last post must remove it from the site.
    const site = new URL(process.env.SITE_URL || 'https://example.com')
    if (site.hostname === 'example.com' || site.protocol !== 'https:')
      throw new Error('Production blocked: configure a real HTTPS SITE_URL')
  }
}
