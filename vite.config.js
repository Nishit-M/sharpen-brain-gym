import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base: the same build works at a domain root or a sub-path such as
  // https://<user>.github.io/sharpen-brain-gym/ (routing is hash-based).
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/app/pwa.js
      filename: 'sw.js', // same URL as the pre-Vite worker, so installs upgrade in place
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sharpen — Daily Brain Gym',
        short_name: 'Sharpen',
        description: 'Daily math, logic, memory and decision-making workouts that adapt to you.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f6fa',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/main.js', 'src/app/pwa.js'],
    },
  },
});
