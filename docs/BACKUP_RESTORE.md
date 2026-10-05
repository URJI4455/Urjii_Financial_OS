# Backup and restore (spec section 24)

- Full JSON backup of every store listed in `docs/DATA_MODEL.md`.
- CSV export of transactions for analysis and archival.
- Restore flow: **Select backup -> Validate -> Preview -> Confirm -> Restore.** Never overwrite silently.
- Backup files hold sensitive data. `*.backup.json` is git-ignored. IndexedDB is persistence, not encryption.

TODO(backup): define file format and version field; define validation rules; decide restore atomicity (single transaction).
