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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/.*/i,
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
