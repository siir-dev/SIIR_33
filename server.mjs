/**
 * Production server for the frontend on Railway (or any Node host). Node built-ins only.
 *
 *  - serves dist/ with long cache for hashed assets
 *  - known routes get index.html, unknown paths get 404.html with a real 404 status (same rules as vercel.json)
 *  - /api/* is proxied to the backend, so the browser stays on one origin and VITE_API_URL is not needed
 *  - crawlers (X, Telegram, Slack...) asking for /seen/:handle get a small HTML page with profile meta tags
 *
 * Env:  PORT         set by Railway
 *       API_ORIGIN   backend origin, no path, for example https://siir-api.up.railway.app
 *                    or the private address http://<service>.railway.internal:3001
 *       SITE_URL     public site, for example https://siir.xyz (used in share meta)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT || 4173)
const API_ORIGIN = (process.env.API_ORIGIN || 'http://localhost:3001').replace(/\/$/, '')
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}
const KNOWN_ROUTE = /^\/(about|methodology|nominate|candidates|epochs|epochs\/\d+|seen\/[A-Za-z0-9_]+)?\/?$/
const CRAWLER = /twitterbot|facebookexternalhit|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|embedly|pinterest|skypeuripreview/i
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

async function sendFile(res, file, status = 200, cache = 'public, max-age=300') {
  const body = await readFile(file)
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': cache })
  res.end(body)
}

async function proxy(req, res) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const headers = { ...req.headers }
  delete headers.host
  delete headers.connection
  try {
    const upstream = await fetch(API_ORIGIN + req.url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      redirect: 'manual',
    })
    const out = {}
    upstream.headers.forEach((v, k) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) out[k] = v
    })
    res.writeHead(upstream.status, out)
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'API unavailable', statusCode: 502 }))
  }
}

async function crawlerPage(res, handle) {
  let title = 'SIIR - The Super Intelligence Influencer Rank'
  let description = "The minds the market hasn't seen yet. Ranked every epoch across Solana and Robinhood Chain."
  try {
    const r = await fetch(`${API_ORIGIN}/api/v1/seen/${handle}`, { signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      const p = await r.json()
      title = `${p.influencer.name} (@${p.influencer.handle}) on The SIIR 33`
      description = p.current
        ? `Rank #${p.current.rank} in epoch ${p.current.epoch}, SIIR Score ${p.current.score.toFixed(1)}. ${p.influencer.why}`.slice(0, 280)
        : String(p.influencer.why).slice(0, 280)
    }
  } catch {
    /* fall back to the generic card */
  }
  const url = `${SITE_URL}/seen/${handle}`
  const image = `${SITE_URL}/api/v1/og/${handle}.png`
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' })
  res.end(`<!doctype html>
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

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    const path = decodeURIComponent(url.pathname)

    if (path.startsWith('/api/')) return proxy(req, res)

    const seen = path.match(/^\/seen\/([A-Za-z0-9_]{1,15})\/?$/)
    if (seen && CRAWLER.test(req.headers['user-agent'] || '')) return crawlerPage(res, seen[1].toLowerCase())

    if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      return res.end('ok')
    }

    // Real files first (assets, images, icons)
    const file = normalize(join(DIST, path))
    if (file.startsWith(DIST) && extname(file)) {
      const s = await stat(file).catch(() => null)
      if (s?.isFile()) return sendFile(res, file, 200, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
    }

    if (KNOWN_ROUTE.test(path)) return sendFile(res, join(DIST, 'index.html'), 200, 'no-cache')
    return sendFile(res, join(DIST, '404.html'), 404, 'no-cache')
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Server error')
  }
}).listen(PORT, '0.0.0.0', () => console.log(`SIIR web on :${PORT}, API ${API_ORIGIN}`))
