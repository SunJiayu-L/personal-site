import fs from 'node:fs/promises'

const file = new URL('../src/site/catalog.json', import.meta.url),
  catalog = JSON.parse(await fs.readFile(file, 'utf8'))
for (const project of catalog.projects) {
  if (!project.url) continue
  const u = new URL(project.url)
  if (u.hostname !== 'github.com') continue
  const parts = u.pathname.split('/').filter(Boolean)
  if (parts.length !== 2) continue
  try {
    const r = await fetch(
      'https://api.github.com/repos/' + parts.map(encodeURIComponent).join('/'),
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN }
            : {})
        },
        signal: AbortSignal.timeout(15000)
      }
    )
    if (!r.ok) throw new Error('GitHub HTTP ' + r.status)
    const data = await r.json()
    if (data.private) throw new Error('Private projects cannot be published')
    project.github = {
      stars: data.stargazers_count,
      language: data.language || '',
      description: data.description || ''
    }
  } catch {
    console.warn(
      'Could not refresh GitHub metadata for ' + parts.join('/') + '; keeping existing metadata'
    )
  }
}
await fs.writeFile(file, JSON.stringify(catalog, null, 2) + '\n')
