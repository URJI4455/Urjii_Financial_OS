# Architecture

## Dependency direction (spec section 4)

```
UI  ->  Services  ->  Financial Engine  ->  IndexedDB
```

| Layer | Folder | May import | Must not import |
| --- | --- | --- | --- |
| UI | `js/ui/`, `js/pwa/` | services, config, ui | engine, db |
| Services | `js/services/` | engine, config, services | db, ui |
| Engine | `js/engine/` | db, config, engine | services, ui |
| DB | `js/db/` | config, db | engine, services, ui |
| Config | `js/config/` | nothing | everything else |

- Only `js/db/` may reference `indexedDB`.
- Pages never read or write IndexedDB. The engine is the source of financial truth.
- Enforced by `tools/check-structure.mjs` (`npm run check`, also run by `npm test`).

## Barrels

`js/db/index.js`, `js/engine/index.js` and `js/services/index.js` are the public surface of each layer.

## Pages

Flat HTML files at the project root, each with `<body data-page="id">` and a controller at `js/ui/pages/<id>.js`.
`js/ui/routes.js` is the single route table; navigation is rendered from it.
Primary mobile navigation: Home, Transactions, Money, Reports, More.

## Business logic placement

A financial rule used in more than one place belongs in the engine. Services orchestrate; the UI displays.
