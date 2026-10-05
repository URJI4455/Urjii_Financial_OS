/**
 * Service worker registration.
 * Layer: ui infrastructure (js/pwa/ is grouped with the ui layer).
 *
 * TODO(pwa): add an update-available flow (see docs/PWA_OFFLINE.md).
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Deliberately generic: never log financial information (spec section 25).
      console.warn('Service worker registration failed.');
    });
  });
}
