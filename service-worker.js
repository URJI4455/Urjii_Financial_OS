/*
 * Urji Finance OS - service worker (foundation).
 *
 * Purpose: cache the application shell so the app opens offline after installation (spec section 23).
 * This worker never reads or writes financial data: IndexedDB is used only by the app itself.
 *
 * TODO(pwa): update flow (notify the user, then activate a new version) - docs/PWA_OFFLINE.md.
 * TODO(pwa): decide caching strategy per resource type when the shell grows.
 * RULE: every shell file must be listed below. `npm run check` verifies the list matches the project.
 */

const CACHE_VERSION = 'v0.4.0';
const CACHE_PREFIX = 'urji-finance-os-shell-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_SHELL = [
  './',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'css/base/reset.css',
  'css/base/tokens.css',
  'css/base/typography.css',
  'css/components/badges.css',
  'css/components/buttons.css',
  'css/components/cards.css',
  'css/components/forms.css',
  'css/components/lists.css',
  'css/components/modal.css',
  'css/components/states.css',
  'css/components/tables.css',
  'css/components/toast.css',
  'css/layout/app-shell.css',
  'css/layout/navigation.css',
  'css/main.css',
  'css/pages/dashboard.css',
  'css/pages/income.css',
  'css/pages/money.css',
  'css/pages/more.css',
  'css/pages/receivables.css',
  'css/pages/reconciliation.css',
  'css/pages/reports.css',
  'css/pages/settings.css',
  'css/pages/sop.css',
  'css/pages/transactions.css',
  'income.html',
  'index.html',
  'js/config/constants.js',
  'js/config/errors.js',
  'js/db/connection.js',
  'js/db/database.js',
  'js/db/errors.js',
  'js/db/index.js',
  'js/db/migrations.js',
  'js/db/repositories.js',
  'js/db/repository.js',
  'js/db/schema.js',
  'js/engine/accounts.js',
  'js/engine/agreements.js',
  'js/engine/allocations.js',
  'js/engine/audit.js',
  'js/engine/backup.js',
  'js/engine/balances.js',
  'js/engine/categories.js',
  'js/engine/engine.js',
  'js/engine/errors.js',
  'js/engine/financialPosition.js',
  'js/engine/heldMoney.js',
  'js/engine/income.js',
  'js/engine/index.js',
  'js/engine/ledger.js',
  'js/engine/money.js',
  'js/engine/people.js',
  'js/engine/queries.js',
  'js/engine/readModel.js',
  'js/engine/receivables.js',
  'js/engine/reconciliation.js',
  'js/engine/referenceData.js',
  'js/engine/reporting.js',
  'js/engine/savings.js',
  'js/engine/settings.js',
  'js/engine/snapshot.js',
  'js/engine/sops.js',
  'js/engine/sources.js',
  'js/engine/time.js',
  'js/engine/transactionTypes.js',
  'js/engine/util.js',
  'js/engine/validation.js',
  'js/pwa/registerServiceWorker.js',
  'js/services/accountService.js',
  'js/services/allocationService.js',
  'js/services/auditService.js',
  'js/services/backupService.js',
  'js/services/catalogService.js',
  'js/services/categoryService.js',
  'js/services/dashboardService.js',
  'js/services/heldMoneyService.js',
  'js/services/incomeService.js',
  'js/services/index.js',
  'js/services/moneyService.js',
  'js/services/peopleService.js',
  'js/services/receivableService.js',
  'js/services/reconciliationService.js',
  'js/services/reportService.js',
  'js/services/savingsService.js',
  'js/services/settingsService.js',
  'js/services/sopService.js',
  'js/services/systemService.js',
  'js/services/transactionService.js',
  'js/ui/app.js',
  'js/ui/components/card.js',
  'js/ui/components/form.js',
  'js/ui/components/modal.js',
  'js/ui/components/navigation.js',
  'js/ui/components/states.js',
  'js/ui/components/toast.js',
  'js/ui/components/view.js',
  'js/ui/content/guides.js',
  'js/ui/dom.js',
  'js/ui/flows/entryFlows.js',
  'js/ui/flows/manage.js',
  'js/ui/flows/quickCreate.js',
  'js/ui/formatters.js',
  'js/ui/icons.js',
  'js/ui/labels.js',
  'js/ui/messages.js',
  'js/ui/pageKit.js',
  'js/ui/pages/dashboard.js',
  'js/ui/pages/income.js',
  'js/ui/pages/money.js',
  'js/ui/pages/more.js',
  'js/ui/pages/receivables.js',
  'js/ui/pages/reconciliation.js',
  'js/ui/pages/reports.js',
  'js/ui/pages/settings.js',
  'js/ui/pages/sop.js',
  'js/ui/pages/transactions.js',
  'js/ui/routes.js',
  'js/ui/views/transactionDetail.js',
  'manifest.webmanifest',
  'money.html',
  'more.html',
  'receivables.html',
  'reconciliation.html',
  'reports.html',
  'settings.html',
  'sop.html',
  'transactions.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('index.html');
      if (fallback) return fallback;
    }
    throw error;
  }
}
