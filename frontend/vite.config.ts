import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: "Do'konchi — Hisob-kitob",
        short_name: "Do'konchi",
        description: "Do'kon hisob-kitob tizimi (FIFO, partiyalar, nasiya)",
        theme_color: '#3a5a40',
        background_color: '#f3ede0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'uz',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // /auth va /api ga keladigan so'rovlar har doim networkdan kelsin
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/(auth|users|categories|products|suppliers|batches|sales|inventory|customers|debts|expenses|reports)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
});
