/**
 * The public Waline endpoint is intentionally safe to ship to the browser.
 * A repository variable can still override it for staging or a future migration.
 */
export const walineServerURL = (
  import.meta.env.PUBLIC_WALINE_SERVER_URL || 'https://sun-waline-comments.vercel.app'
)
  .trim()
  .replace(/\/$/, '')
