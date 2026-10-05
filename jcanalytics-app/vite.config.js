import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { renderSeoHead } from './src/seo/site.js'
import { homePath, resolveRoute } from './src/seo/routes.js'

export default defineConfig({
  plugins: [
    {
      name: 'localized-search-metadata',
      transformIndexHtml(html, context) {
        const pathname = (context.originalUrl ?? context.path).split('?')[0]
        const language = /^\/es(?:\/|$)/.test(pathname) ? 'es' : 'en'
        const route = resolveRoute(pathname === '/index.html' ? '/' : pathname) ?? resolveRoute(homePath(language))
        return html.replace(/<html lang="[^"]+">/, `<html lang="${route.language}">`)
          .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => `<!--seo:start-->${renderSeoHead(route.language, route)}<!--seo:end-->`)
      },
    },
    react(),
    tailwindcss(),
  ],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-motion': ['framer-motion'],
          'vendor-gsap': ['gsap', 'lenis'],
        },
      },
    },
  },
})
