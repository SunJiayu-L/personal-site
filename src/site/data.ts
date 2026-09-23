import type { CollectionEntry } from 'astro:content'

import raw from './catalog.json'

export type Lang = 'zh' | 'en'
export type Localized = { zh: string; en: string }
export type Entry = CollectionEntry<'entries'>
export interface Friend {
  title: string
  description: Localized
  url: string
  avatar?: string
  rss?: string
  demo?: boolean
}
export interface FeedItem {
  title: string
  url: string
  date: string
  friend: string
}
export interface Course {
  slug: string
  title: Localized
  description: Localized
  code: string
  status: string
  source: string
  demo?: boolean
}
export interface Project {
  slug: string
  title: Localized
  description: Localized
  role: Localized
  url: string
  demo?: boolean
  github?: { stars: number; language: string; description: string }
}
export interface Publication {
  title: string
  authors: Array<{ name: string; isMe?: boolean; isEqual?: boolean; isCoreContributor?: boolean; role?: 'corresponding' | 'project-leader'; homepage?: string }>
  venue: string
  year: string
  type: 'conference' | 'journal' | 'workshop' | 'preprint'
  status: 'published' | 'accepted' | 'under-review' | 'preprint'
  abstract?: string
  links: Array<{ type: string; href: string }>
  demo?: boolean
}
export const catalog = raw as Omit<typeof raw, 'friends' | 'friendFeed' | 'projects' | 'courses' | 'publications' | 'links'> & {
  friends: Friend[]
  friendFeed: FeedItem[]
  projects: Project[]
  courses: Course[]
  publications: Publication[]
  links: Array<{ title: string; description: Localized; url: string; category: string; demo?: boolean }>
}
export const languages: Lang[] = ['zh', 'en']
export const categories = [
  { slug: 'research', title: 'Research' },
  { slug: 'technical', title: 'Technical' },
  { slug: 'daily-life', title: 'Daily Life' }
]
export const t = (lang: Lang, zh: string, en: string) => (lang === 'zh' ? zh : en)
export const local = (v: Localized, lang: Lang) => v[lang] || v.zh || v.en
export const base = import.meta.env.BASE_URL.replace(/\/$/, '')
export const url = (lang: Lang, path = '') =>
  base + '/' + lang + '/' + (path ? path.replace(/^\/|\/$/g, '') + '/' : '')
export const entryPath = (e: Entry) =>
  e.data.kind === 'blog' ? 'blog/' + e.data.slug : 'course/' + e.data.course + '/' + e.data.slug
export const entryUrl = (e: Entry) => url(e.data.lang, entryPath(e))
export const dateLabel = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(date))
export const readMinutes = (body = '') =>
  Math.max(
    1,
    Math.ceil(
      (body.match(/[\u4e00-\u9fff]/g)?.length || 0) / 350 +
        (body.match(/[a-zA-Z]+/g)?.length || 0) / 220
    )
  )
export const visibleEntries = (entries: Entry[], lang: Lang) => {
  const published = entries.filter((e) => e.data.published)
  const selected = published.filter((e) => e.data.lang === lang)
  const translated = new Set(selected.map((e) => e.data.translationKey).filter(Boolean))
  return [
    ...selected,
    ...published.filter(
      (e) =>
        e.data.lang !== lang && (!e.data.translationKey || !translated.has(e.data.translationKey))
    )
  ].sort((a, b) => b.data.date.localeCompare(a.data.date))
}

