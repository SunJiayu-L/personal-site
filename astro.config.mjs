import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import {
  transformerNotationDiff,
  transformerNotationHighlight
} from './src/plugins/shiki-transformers.ts'

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap(), tailwind({ applyBaseStyles: false })],
  markdown: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      transformers: [transformerNotationDiff(), transformerNotationHighlight()]
    }
  },
  server: { host: '127.0.0.1', port: 4321 }
})
