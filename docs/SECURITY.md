# Security principles (spec section 25)

- Local-first storage; no unnecessary external services; no analytics trackers.
- No sensitive information in URLs; no financial information in production console logs.
- Confirmation required for destructive operations.
- IndexedDB is persistence, not encryption. If encryption is added later, document it here.
- The service worker caches the application shell only, never financial data.
- No CDN assets are used; any future CDN asset must be non-critical and is not available offline unless precached.
