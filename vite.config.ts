import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Share-card meta tags need absolute URLs. Set VITE_SITE_URL (for example https://siir.xyz) at build time.
  const site = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
  const proxy = { '/api': 'http://localhost:3001' }

  return {
    plugins: [
      react(),
      {
        name: 'siir-site-url',
        transformIndexHtml: (html: string) => {
          if (!site && mode === 'production') console.warn('[siir] VITE_SITE_URL is not set: og:image and canonical will be relative. Set it before deploying.')
          return html.replaceAll('__SITE_URL__', site)
        },
      },
      {
        // Unknown paths are served this file with a real 404 status (see vercel.json); the app then renders its own 404 view.
        name: 'siir-404',
        apply: 'build' as const,
        closeBundle: () => copyFileSync('dist/index.html', 'dist/404.html'),
      },
    ],
    server: { proxy },
    preview: { proxy },
  }
})
