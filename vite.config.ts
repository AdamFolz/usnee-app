import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/usnee-app/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'USNEE',
        short_name: 'USNEE',
        description: 'Без осуждения, только факты',
        lang: 'ru',
        theme_color: '#0b0d1a',
        background_color: '#070814',
        display: 'standalone',
        start_url: '/usnee-app/',
        scope: '/usnee-app/',
        icons: [
          { src: '/usnee-app/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/usnee-app/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Mini App SW scope is /usnee-app/, which also covers /landing/.
        // Without this, NavigationRoute serves the SPA shell there.
        navigateFallbackDenylist: [/\/landing(?:\/|$)/],
        runtimeCaching: [
          {
            // Never cache API responses: sensitive data must not be served from SW cache.
            urlPattern: /\/api\//,
            handler: 'NetworkOnly'
          },
          {
            // SEC: cache only same-origin app assets. The previous catch-all
            // /^https:\/\/.*\/.*/ (NetworkFirst) matched every cross-origin
            // request; once a real API appears it would silently cache
            // responses of any https host into the offline store.
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && url.pathname.startsWith('/usnee-app/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'usnee-cache' }
          }
        ]
      }
    })
  ],

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts']
        }
      }
    }
  }
})
