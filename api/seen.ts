/**
 * Vercel function. Crawlers (X, Telegram, Slack...) do not run JavaScript, so a client-rendered /seen/:handle has no
 * profile meta tags. vercel.json rewrites known crawler user agents here; everyone else gets the normal SPA.
 *
 * Env:  API_URL        backend base, e.g. https://api.siir.xyz/api/v1
 *       SITE_URL       public site, e.g. https://siir.xyz
 */
type Req = { query: Record<string, string | string[] | undefined> }
type Res = { status(code: number): Res; setHeader(k: string, v: string): Res; send(body: string): void }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export default async function handler(req: Req, res: Res) {
  const raw = Array.isArray(req.query.handle) ? req.query.handle[0] : req.query.handle
  const handle = String(raw ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15)
  const api = (process.env.API_URL ?? '').replace(/\/$/, '')
  const site = (process.env.SITE_URL ?? '').replace(/\/$/, '')

  let title = 'SIIR - The Super Intelligence Influencer Rank'
  let description = "The minds the market hasn't seen yet. Ranked every epoch across Solana and Robinhood Chain."
  try {
    const r = await fetch(`${api}/seen/${handle}`)
    if (r.ok) {
      const p = (await r.json()) as { influencer: { name: string; handle: string; why: string }; current: { rank: number; score: number; epoch: number } | null }
      title = `${p.influencer.name} (@${p.influencer.handle}) on The SIIR 33`
      description = p.current
        ? `Rank #${p.current.rank} in epoch ${p.current.epoch}, SIIR Score ${p.current.score.toFixed(1)}. ${p.influencer.why}`.slice(0, 280)
        : p.influencer.why.slice(0, 280)
    }
  } catch {
    // fall back to the generic card
  }

  const url = `${site}/seen/${handle}`
  const image = `${api}/og/${handle}.png`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')
  res.status(200).send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="SIIR" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@SIIR33Index" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`)
}
