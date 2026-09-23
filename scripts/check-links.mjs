import fs from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'node-html-parser'

const root = path.resolve('dist'),
  base = (process.env.BASE_PATH || '').replace(/\/$/, '')
async function walk(dir) {
  const result = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) result.push(...(await walk(p)))
    else if (e.name.endsWith('.html')) result.push(p)
  }
  return result
}
const files = await walk(root),
  errors = []
let checked = 0
for (const file of files) {
  if (file.includes(path.sep + 'pagefind' + path.sep)) continue
  const doc = parse(await fs.readFile(file, 'utf8'))
  for (const node of doc.querySelectorAll('a[href],link[href],script[src],img[src]')) {
    const href = node.getAttribute('href') || node.getAttribute('src')
    if (!href || /^(https?:|mailto:|data:|tel:|\/\/)/.test(href)) continue
    const fileUrl =
      'https://local.test' + base + '/' + path.relative(root, file).split(path.sep).join('/')
    const u = new URL(href, fileUrl)
    if (base && !u.pathname.startsWith(base + '/')) {
      errors.push('Missing base path: ' + href)
      continue
    }
    const relative = decodeURIComponent(u.pathname.slice(base.length)),
      target = path.resolve(root, '.' + relative)
    if (!target.startsWith(root + path.sep) && target !== root) {
      errors.push('Escaping dist: ' + href)
      continue
    }
    const actual = relative.endsWith('/') ? path.join(target, 'index.html') : target
    const exists = await fs.stat(actual).then(
      (x) => x.isFile(),
      () => false
    )
    if (!exists) errors.push(path.relative(root, file) + ' -> ' + href)
    else if (u.hash && actual.endsWith('.html')) {
      const targetDoc = actual === file ? doc : parse(await fs.readFile(actual, 'utf8'))
      const id = decodeURIComponent(u.hash.slice(1))
      if (!targetDoc.querySelectorAll('[id]').some((el) => el.id === id))
        errors.push('Missing fragment: ' + href)
    }
    checked++
  }
}
if (errors.length) throw new Error(errors.slice(0, 30).join('\n'))
console.log('Checked ' + checked + ' local links/assets across ' + files.length + ' HTML pages')
