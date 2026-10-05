# Testing strategy

- Runner: `node:test`, no dependencies. Coverage list = spec section 27 (see `tests/unit/engine/`).
- Real tests today: enumerations, schema vs backup list, structure/layering check.
- Everything else is `test.todo`. A feature is not done until its todo becomes a passing test.
- `npm run test:browser` runs `tests/browser/db.html` in headless Chromium (real IndexedDB) via Playwright. Playwright is a dev tool and is not a dependency; without it the command exits 2 and says how to run the page by hand (`npm run serve`, then open `/tests/browser/db.html`).
- Persistence-dependent engine tests still depend on OPEN-002.

## Engine tests (v0.3.0)
- `tests/shared/engine-scenarios.js`: 88 scenarios written once. Run in Node against the in-memory double (`npm test`) and in Chromium against real IndexedDB (`npm run test:browser`).
- Pure unit tests: money, interpretation table, derivation from a hand-written ledger.
- Includes a real month of events with hand-computed totals, a concurrency race, atomic-rollback checks (failing audit write) and a seeded stress test (150 random operations; invariants and incremental results checked after each).
- Remaining `test.todo`: reconciliation and the full lifecycle (Reconcile step), backup/restore.

## Interface tests (v0.4.0)
- `npm run test:ui`: 30 end-to-end tests drive the real app in headless Chromium with real IndexedDB (a fresh browser context per test). Any console error, uncaught exception or native alert/confirm/prompt fails the test. `--only=text` runs a subset; `--shots=dir` also writes screenshots for design review.
- Covered: first run, forms and inline errors, every money flow (held money, loans in parts, overpayment refused), cancel and undo with required reasons, the hand-checked month on the dashboard, reconciliation end to end, reports, income, settings and backup download, XSS-safe names, dialog accessibility, five screen widths without horizontal scroll, phone touch targets, dark mode, offline use, blocked storage.
- Node guards (`npm test`): `tests/unit/ui/no-calculations.test.js` (no arithmetic on money, no engine/db imports, no innerHTML, no native dialogs) and `messages.test.js` (every error code the engine or database can raise has a plain-language message).
- Playwright is a development tool, not a dependency; without it `test:browser` and `test:ui` exit 2 and explain.
