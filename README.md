# Urji Finance OS

> Your personal financial operating system.

A private, offline-first personal finance application: HTML5, CSS3, vanilla JavaScript (ES modules),
IndexedDB, a service worker and a web app manifest. No frameworks, no bundler, no external services.

**Status: v0.4.0 - data layer, financial engine, services and the interface.** Restore from backup, CSV export and drafts are not built yet.
Every unimplemented file carries a `TODO(...)` marker.

## Governing specification

All work follows the *Urji Finance OS General Executive / Master Development Prompt*.
Keep a copy at `docs/SPEC.md` (see that file). Where this repository and the spec disagree, the spec wins
and the disagreement goes into `project/ARCHITECTURE_REVIEW.md`.

## Architecture

```
UI  ->  Services  ->  Financial Engine  ->  IndexedDB
js/ui   js/services   js/engine             js/db        (+ js/config shared by all)
```

Pages never touch IndexedDB. Details: `docs/ARCHITECTURE.md`. The rule is enforced by `npm run check`.

## Run it

IndexedDB and service workers need `http://localhost` or HTTPS (not `file://`):

```
npm run serve        # then open http://localhost:8080
```

## Checks and tests (Node 20+, no dependencies)

```
npm run check        # paths, imports, layering, PWA precache list
npm test             # node:test; most financial tests are TODO placeholders
npm run test:browser # db layer + engine against real IndexedDB (needs Playwright + Chromium)
npm run test:ui      # end-to-end interface tests in headless Chromium
npm run precache     # regenerate the service worker file list after adding or removing files
```

## Where things are

| Path | Contents |
| --- | --- |
| `*.html` | Page shells (flat, project root) |
| `css/` | tokens -> base -> layout -> components -> pages |
| `js/` | config, db, engine, services, ui, pwa |
| `tests/` | unit, integration, fixtures, helpers |
| `tools/` | structure/architecture checker |
| `docs/` | Design and reference documentation |
| `project/` | Decisions, roadmap, TODO, open questions, changelog |
| `sample-data/` | Fictional sample-data template (never real data) |

Full tree: `docs/PROJECT_STRUCTURE.md`.
