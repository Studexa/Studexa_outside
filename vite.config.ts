import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const backendOrigin = process.env.STUDEXA_DEV_API_ORIGIN ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/actuator(?:\/|$)/, /^\/ws(?:\/|$)/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      manifest: {
        name: 'Studexa',
        short_name: 'Studexa',
        description: 'A gamified study web app for students (Khmer + English)',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
      },
      // STOMP endpoint (handshake + WebSocket upgrade) for live quiz rooms.
      '/ws/quiz': {
        target: backendOrigin,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('katex')) {
              return 'vendor-editor'
            }
            if (id.includes('framer-motion') || id.includes('canvas-confetti')) {
              return 'vendor-animation'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack') || id.includes('dexie') || id.includes('zustand')) {
              return 'vendor-state'
            }
          }
        },
      },
    },
  },
})
