import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lec-logo.png', 'lec-icon-512.png'],
      manifest: {
        name: 'ChurchOne — LEC',
        short_name: 'ChurchOne',
        description: 'Love Economy Church — Attendance & Member Management',
        theme_color: '#0066FF',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/lec-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/lec-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'utilities'],
        shortcuts: [
          {
            name: 'Mark Attendance',
            url: '/attendance',
            description: 'Open attendance marking',
            icons: [{ src: '/lec-logo.png', sizes: '96x96' }]
          },
          {
            name: 'People Directory',
            url: '/directory',
            description: 'Browse member directory',
            icons: [{ src: '/lec-logo.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        // Cache all assets, fonts, and images
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching strategy for Supabase API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        // Enable service worker in dev for testing
        enabled: false
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
         manualChunks: {
           'vendor-react': ['react', 'react-dom', 'react-router-dom'],
           'vendor-ui': ['lucide-react', 'recharts'],
           'vendor-supabase': ['@supabase/supabase-js']
         }
      }
    }
  }
})
