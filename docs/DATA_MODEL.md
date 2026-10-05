# Data model (IndexedDB)

Database **`FinancialOS`**, version **1**. Store list = spec section 24 backup list.
Key paths and index fields are **provisional** (ADR-005) until the transaction record shape is decided (OPEN-003).

| Store | Role | Indexes |
| --- | --- | --- |
| `transactions` | Ledger, the source of truth | type, lifecycleStatus, reconciliationStatus, occurredAt, accountId, personId |
| `accounts` | Locations of money (never balances) | name |
| `people` | Counterparties | name |
| `sources` | Income sources | name |
| `allocations` | Intended purposes | name |
| `categories` | Categories and subcategories | parentId, name |
| `receivables` | Loan agreements (outstanding is derived, OPEN-004) | personId |
| `heldMoney` | Held-money agreements (outstanding is derived, OPEN-004) | personId |
| `savingsGoals` | Savings goals (model undefined, OPEN-005) | name |
| `reconciliations` | Reconciliation records | accountId |
| `sops` | Procedures | none |
| `auditLog` | Append-only audit trail | timestamp, entity_entityId (compound) |
| `settings` | App settings | none |

All stores use in-line key path `id`. The db layer never generates ids.
No index is `unique`: uniqueness is a business rule and belongs to the engine.
IndexedDB cannot index booleans, null or undefined, so flags such as "archived" are filtered in the engine.

## Db layer API (`js/db/`, only the engine may import it)

- `createDatabase({ name, version, stores, migrations })` returns `open, close, initialize, runInTransaction`.
- `database` / `openDatabase` / `initializeDatabase` / `runInTransaction`: the production instance.
- `repositories[storeName]`: `get, getAll, getAllByIndex, count, add, put, delete`. One transaction per call.
- `runInTransaction(stores, 'readonly'|'readwrite', async (tx) => ...)`: one atomic transaction across stores,
  for example a ledger entry plus its audit record. `tx.store(name)` has the same primitives.
  Throw inside the work and everything rolls back; the same error reaches the caller.
  Await only database operations inside the work.
- Errors are `DbError` with a stable `code` (`DB_ERROR_CODES`). Messages never contain record data.
- No clear/truncate primitive exists on purpose (restore design is pending, `docs/BACKUP_RESTORE.md`).

## Upgrade safety (`js/db/migrations.js`)

1. The whole upgrade is one versionchange transaction; any failure rolls back to the previous version and data.
2. Schema sync is additive only. Nothing is ever deleted, renamed or altered; unknown stores and indexes are left alone.
3. A mismatch with an existing store or index aborts with `DB_SCHEMA_CONFLICT` instead of guessing.
4. Data migrations are numbered steps, run once, in order, strictly one after another.
5. Opening a newer database with older code fails with `DB_VERSION_DOWNGRADE`. An open connection closes itself when another instance upgrades.
6. Destructive changes need a recorded decision and a step that copies the data first.

To change the schema: edit `schema.js`, increase `DB_VERSION`, add a step to `MIGRATIONS` if existing data must change.
