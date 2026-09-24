import { children, text, value } from './notion-lib.mjs'

export const PUBLISH_LABEL = '发布到网站'

export function notionPageId(input) {
  const url = new URL(input)
  if (url.protocol !== 'https:' || !['notion.so', 'www.notion.so', 'app.notion.com', 'notion.com', 'www.notion.com'].includes(url.hostname))
    throw new Error('Notebook must be a Notion page URL')
  const match = url.pathname.match(/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/?$/i)
  if (!match) throw new Error('Notebook URL must identify a page')
  const id = match[1].replaceAll('-', '').toLowerCase()
  return id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

// Only the explicit first block can publish a page. A checkbox inside the
// lesson, a nested task, a missing marker, or duplicate markers never opts in.
export function publicationContent(blocks) {
  const markers = blocks.filter(b => b.type === 'to_do' && text({ rich_text: b.to_do.rich_text }).trim() === PUBLISH_LABEL)
  if (markers.length !== 1 || blocks[0] !== markers[0] || markers[0].to_do.checked !== true || markers[0].has_children)
    return null
  return blocks.slice(1)
}

export async function readNotebook(request, coursePage, aliases = {}) {
  const p = coursePage.properties
  const root = notionPageId(value(p.Notebook))
  const rootPage = await request('pages/' + root)
  if (rootPage.archived || rootPage.in_trash) return []
  const direct = (await children(request, root)).filter(b => b.type === 'child_page' && !b.archived && !b.in_trash)
  const result = []
  for (let i = 0; i < direct.length; i++) {
    const child = direct[i]
    const blocks = await children(request, child.id)
    const body = publicationContent(blocks)
    if (body === null) continue
    const page = await request('pages/' + child.id)
    if (page.archived || page.in_trash) continue
    // A moved page must still belong to the configured notebook.
    if (page.parent?.type !== 'page_id' || page.parent.page_id.replaceAll('-', '') !== root.replaceAll('-', ''))
      continue
    const titleProperty = Object.values(page.properties || {}).find(x => x.type === 'title')
    const title = text(titleProperty).trim() || child.child_page.title
    const slug = aliases[child.id.replaceAll('-', '')] || 'note-' + child.id.replaceAll('-', '')
    result.push({
      entry: {
        title, slug, lang: 'zh', kind: 'note', description: title,
        date: page.created_time.slice(0, 10), tags: [],
        course: value(p.Slug), order: i + 1, demo: false, published: true
      },
      blocks: body
    })
  }
  return result
}
