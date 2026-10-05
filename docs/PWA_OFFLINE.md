# PWA and offline behaviour (spec section 23)

- `manifest.webmanifest`: standalone display, start URL `./index.html`, placeholder icons.
- `service-worker.js`: precaches the shell, cache-first for same-origin GET requests, offline navigation falls back to `index.html`.
- The precache list is explicit. After adding or removing any shell file, update it; `npm run check` fails otherwise.
- Bump `CACHE_VERSION` whenever shell files change, or users keep the old shell.

TODO(pwa): update-available prompt (the worker deliberately does not skip waiting yet).
TODO(pwa): test installation and offline launch on the target phone.
