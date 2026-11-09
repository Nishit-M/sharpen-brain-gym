/**
 * Service-worker registration. The worker itself is generated at build time
 * by vite-plugin-pwa (Workbox): every built asset is precached with a content
 * hash, so the app works offline and updates atomically on the next visit.
 */
import { registerSW } from 'virtual:pwa-register';

/** Caches created by the hand-written service worker used before the Vite build. */
const LEGACY_CACHES = ['sharpen-v1', 'sharpen-v2'];

export function setupPwa() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  registerSW({
    immediate: true,
    onRegisterError: (err) => console.warn('[sharpen] service worker registration failed', err),
  });

  if ('caches' in window) {
    for (const name of LEGACY_CACHES) caches.delete(name).catch(() => {});
  }
}
