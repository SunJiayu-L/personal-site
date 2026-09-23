import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const entries = defineCollection({
  loader: glob({
    base: './src/content/entries',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, '')
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    lang: z.enum(['zh', 'en']),
    kind: z.enum(['blog', 'note']),
    description: z.string(),
    date: z.string(),
    category: z.enum(['research', 'technical', 'daily-life']).optional(),
    tags: z.array(z.string()).default([]),
    course: z.string().optional(),
    order: z.number().default(0),
    translationKey: z.string().optional(),
    series: z.string().optional(),
    demo: z.boolean().default(false),
    published: z.boolean().default(true)
  })
})
export const collections = { entries }
