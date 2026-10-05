# Project structure

Regenerated at v0.4.0.

```
urji-finance-os/
├── assets/
│   └── icons/
│       ├── README.md
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-maskable-512.png
├── css/
│   ├── base/
│   │   ├── reset.css
│   │   ├── tokens.css
│   │   └── typography.css
│   ├── components/
│   │   ├── badges.css
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── lists.css
│   │   ├── modal.css
│   │   ├── states.css
│   │   ├── tables.css
│   │   └── toast.css
│   ├── layout/
│   │   ├── app-shell.css
│   │   └── navigation.css
│   ├── pages/
│   │   ├── dashboard.css
│   │   ├── income.css
│   │   ├── money.css
│   │   ├── more.css
│   │   ├── receivables.css
│   │   ├── reconciliation.css
│   │   ├── reports.css
│   │   ├── settings.css
│   │   ├── sop.css
│   │   └── transactions.css
│   └── main.css
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BACKUP_RESTORE.md
│   ├── DATA_MODEL.md
│   ├── FINANCIAL_MODEL.md
│   ├── PROJECT_STRUCTURE.md
│   ├── PWA_OFFLINE.md
│   ├── SECURITY.md
│   ├── SPEC.md
│   ├── TESTING.md
│   ├── TRANSACTION_TYPES.md
│   └── UI_UX.md
├── js/
│   ├── config/
│   │   ├── constants.js
│   │   └── errors.js
│   ├── db/
│   │   ├── connection.js
│   │   ├── database.js
│   │   ├── errors.js
│   │   ├── index.js
│   │   ├── migrations.js
│   │   ├── repositories.js
│   │   ├── repository.js
│   │   └── schema.js
│   ├── engine/
│   │   ├── accounts.js
│   │   ├── agreements.js
│   │   ├── allocations.js
│   │   ├── audit.js
│   │   ├── backup.js
│   │   ├── balances.js
│   │   ├── categories.js
│   │   ├── engine.js
│   │   ├── errors.js
│   │   ├── financialPosition.js
│   │   ├── heldMoney.js
│   │   ├── income.js
│   │   ├── index.js
│   │   ├── ledger.js
│   │   ├── money.js
│   │   ├── people.js
│   │   ├── queries.js
│   │   ├── readModel.js
│   │   ├── receivables.js
│   │   ├── reconciliation.js
│   │   ├── referenceData.js
│   │   ├── reporting.js
│   │   ├── savings.js
│   │   ├── settings.js
│   │   ├── snapshot.js
│   │   ├── sops.js
│   │   ├── sources.js
│   │   ├── time.js
│   │   ├── transactionTypes.js
│   │   ├── util.js
│   │   └── validation.js
│   ├── pwa/
│   │   └── registerServiceWorker.js
│   ├── services/
│   │   ├── accountService.js
│   │   ├── allocationService.js
│   │   ├── auditService.js
│   │   ├── backupService.js
│   │   ├── catalogService.js
│   │   ├── categoryService.js
│   │   ├── dashboardService.js
│   │   ├── heldMoneyService.js
│   │   ├── incomeService.js
│   │   ├── index.js
│   │   ├── moneyService.js
│   │   ├── peopleService.js
│   │   ├── receivableService.js
│   │   ├── reconciliationService.js
│   │   ├── reportService.js
│   │   ├── savingsService.js
│   │   ├── settingsService.js
│   │   ├── sopService.js
│   │   ├── systemService.js
│   │   └── transactionService.js
│   └── ui/
│       ├── components/
│       │   ├── card.js
│       │   ├── form.js
│       │   ├── modal.js
│       │   ├── navigation.js
│       │   ├── states.js
│       │   ├── toast.js
│       │   └── view.js
│       ├── content/
│       │   └── guides.js
│       ├── flows/
│       │   ├── entryFlows.js
│       │   ├── manage.js
│       │   └── quickCreate.js
│       ├── pages/
│       │   ├── dashboard.js
│       │   ├── income.js
│       │   ├── money.js
│       │   ├── more.js
│       │   ├── receivables.js
│       │   ├── reconciliation.js
│       │   ├── reports.js
│       │   ├── settings.js
│       │   ├── sop.js
│       │   └── transactions.js
│       ├── views/
│       │   └── transactionDetail.js
│       ├── app.js
│       ├── dom.js
│       ├── formatters.js
│       ├── icons.js
│       ├── labels.js
│       ├── messages.js
│       ├── pageKit.js
│       └── routes.js
├── project/
│   ├── ARCHITECTURE_REVIEW.md
│   ├── CHANGELOG.md
│   ├── DECISIONS.md
│   ├── OPEN_QUESTIONS.md
│   ├── ROADMAP.md
│   └── TODO.md
├── sample-data/
│   ├── README.md
│   └── sample-data.template.json
├── tests/
│   ├── browser/
│   │   ├── db-suite.js
│   │   ├── db.html
│   │   ├── engine-suite.js
│   │   ├── engine.html
│   │   └── run-browser-tests.mjs
│   ├── e2e/
│   │   └── run-ui-tests.mjs
│   ├── fixtures/
│   │   └── README.md
│   ├── helpers/
│   │   └── README.md
│   ├── integration/
│   │   ├── backup-restore.test.js
│   │   └── ledger-lifecycle.test.js
│   ├── shared/
│   │   ├── engine-extras.js
│   │   └── engine-scenarios.js
│   ├── support/
│   │   ├── assert.js
│   │   ├── engine-fixtures.js
│   │   └── memory-database.js
│   ├── unit/
│   │   ├── config/
│   │   │   └── constants.test.js
│   │   ├── db/
│   │   │   ├── connection.test.js
│   │   │   ├── errors.test.js
│   │   │   ├── memory-database.test.js
│   │   │   └── schema.test.js
│   │   ├── engine/
│   │   │   ├── engine-scenarios.test.js
│   │   │   ├── money.test.js
│   │   │   └── transaction-types.test.js
│   │   ├── services/
│   │   │   └── services.test.js
│   │   ├── structure/
│   │   │   └── architecture.test.js
│   │   └── ui/
│   │       ├── messages.test.js
│   │       └── no-calculations.test.js
│   └── README.md
├── tools/
│   ├── check-structure.mjs
│   └── update-precache.mjs
├── .gitignore
├── README.md
├── income.html
├── index.html
├── manifest.webmanifest
├── money.html
├── more.html
├── package.json
├── receivables.html
├── reconciliation.html
├── reports.html
├── service-worker.js
├── settings.html
├── sop.html
└── transactions.html
```
