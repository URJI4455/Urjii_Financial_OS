/**
 * IndexedDB schema definition (data only; no behaviour).
 * Layer: db (may import: ../config/*).
 *
 * Store list = the backup list in spec section 24.
 * Stores and indexes are only ever ADDED (see migrations.js). Adding an index later is a
 * non-destructive version bump, so the index list below can safely start small.
 *
 * PROVISIONAL (DECISIONS.md, ADR-005): key paths and index fields follow the spec's vocabulary
 * (type, lifecycle/reconciliation status, dates, account, person) but the transaction record
 * shape is still undecided (OPEN-003). An index on a field a record does not have is harmless:
 * such records are simply not indexed.
 *
 * IndexedDB cannot index booleans or null/undefined, so flags such as "archived" cannot be
 * indexed; filter them in the engine.
 *
 * TODO(schema): revisit indexes and keyPaths when OPEN-003 is decided.
 */

export const DB_NAME = 'FinancialOS';
export const DB_VERSION = 1;

export const STORE_NAMES = Object.freeze({
  TRANSACTIONS: 'transactions',
  ACCOUNTS: 'accounts',
  PEOPLE: 'people',
  SOURCES: 'sources',
  ALLOCATIONS: 'allocations',
  CATEGORIES: 'categories',
  RECEIVABLES: 'receivables',
  HELD_MONEY: 'heldMoney',
  SAVINGS_GOALS: 'savingsGoals',
  RECONCILIATIONS: 'reconciliations',
  SOPS: 'sops',
  AUDIT_LOG: 'auditLog',
  SETTINGS: 'settings',
});

/** Index helper. The index name defaults to the field name (compound paths are joined with "_"). */
function index(keyPath, options = {}) {
  const name = options.name ?? (Array.isArray(keyPath) ? keyPath.join('_') : keyPath);
  return Object.freeze({ name, keyPath, unique: false, multiEntry: false, ...options });
}

function store(name, indexes = []) {
  return Object.freeze({ name, keyPath: 'id', indexes: Object.freeze(indexes) });
}

export const STORE_DEFINITIONS = Object.freeze([
  store(STORE_NAMES.TRANSACTIONS, [
    index('type'),
    index('lifecycleStatus'),
    index('reconciliationStatus'),
    index('occurredAt'),
    index('accountId'),
    index('personId'),
  ]),
  store(STORE_NAMES.ACCOUNTS, [index('name')]),
  store(STORE_NAMES.PEOPLE, [index('name')]),
  store(STORE_NAMES.SOURCES, [index('name')]),
  store(STORE_NAMES.ALLOCATIONS, [index('name')]),
  store(STORE_NAMES.CATEGORIES, [index('parentId'), index('name')]),
  store(STORE_NAMES.RECEIVABLES, [index('personId')]),
  store(STORE_NAMES.HELD_MONEY, [index('personId')]),
  store(STORE_NAMES.SAVINGS_GOALS, [index('name')]),
  store(STORE_NAMES.RECONCILIATIONS, [index('accountId')]),
  store(STORE_NAMES.SOPS),
  store(STORE_NAMES.AUDIT_LOG, [index('timestamp'), index(['entity', 'entityId'])]),
  store(STORE_NAMES.SETTINGS),
]);
