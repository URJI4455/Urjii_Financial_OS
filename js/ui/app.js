/**
 * Shared page bootstrap for every HTML shell.
 * Layer: ui (may import: ../services/*, ../config/*, ./*, ../pwa/*; must NOT import ../engine/* or ../db/*).
 *
 * Start-up order: navigation -> service worker -> open the local database (safe initialisation) ->
 * currency label -> header "Add" button. If storage is unavailable the page shows a clear error
 * instead of failing silently.
 */

import { ROUTES } from './routes.js';
import { h, render } from './dom.js';
import { icon } from './icons.js';
import { renderNavigation } from './components/navigation.js';
import { errorState } from './components/states.js';
import { toastError } from './components/toast.js';
import { friendlyError } from './messages.js';
import { setCurrency } from './formatters.js';
import { registerServiceWorker } from '../pwa/registerServiceWorker.js';
import { systemService } from '../services/systemService.js';
import { moneyService } from '../services/moneyService.js';

/** Returns { ok, route, main, headerActions }. When ok is false the error is already shown. */
export async function bootPage(pageId, { onAdd } = {}) {
  const route = ROUTES.find((candidate) => candidate.id === pageId);
  if (!route) throw new Error(`Unknown page id: ${pageId}`);

  const main = document.getElementById('app-main');
  const headerActions = document.getElementById('header-actions');
  const navigationContainer = document.getElementById('app-nav');
  if (navigationContainer) renderNavigation(navigationContainer, pageId);

  registerServiceWorker();

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    toastError(friendlyError(event.reason).message);
  });

  try {
    await systemService.initialize();
    setCurrency(await moneyService.currencyLabel());
  } catch (error) {
    const info = friendlyError(error);
    render(main, errorState({ title: info.title, message: info.message, onRetry: () => window.location.reload() }));
    return { ok: false, route, main, headerActions };
  }

  if (route.add && onAdd && headerActions) {
    render(headerActions, h('button', { class: 'button button--primary button--compact', type: 'button', onClick: onAdd }, icon('plus', { size: 18 }), h('span', {}, 'Add')));
  }

  return { ok: true, route, main, headerActions };
}
