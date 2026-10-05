/**
 * Database connection manager: open / upgrade / close, and transaction-safe operations.
 * Layer: db (may import: ./errors.js, ./migrations.js).
 *
 * This module knows how to store and retrieve data. It contains NO financial rules: it does not
 * know what a transaction, balance or account means. The financial engine decides that.
 *
 * createDatabase(config) returns an isolated manager, so tests can use throw-away databases.
 * The production instance is created in ./database.js.
 *
 * config: { name, version, stores, migrations?, onBlocked?, indexedDBFactory? }
 */

import { DB_ERROR_CODES, DbError, createDbError, toDbError } from './errors.js';
import { runMigrations } from './migrations.js';

const MODES = Object.freeze(['readonly', 'readwrite']);

function invalidConfig(context) {
  return createDbError(DB_ERROR_CODES.INVALID_CONFIG, { context });
}

function validateConfig(config) {
  const { name, version, stores, migrations = [] } = config ?? {};

  if (typeof name !== 'string' || name.length === 0) throw invalidConfig('name');
  if (!Number.isInteger(version) || version < 1) throw invalidConfig('version');
  if (!Array.isArray(stores) || stores.length === 0) throw invalidConfig('stores');

  const storeNames = new Set();
  for (const definition of stores) {
    if (typeof definition?.name !== 'string' || !definition.keyPath) throw invalidConfig('store definition');
    if (storeNames.has(definition.name)) throw invalidConfig(`duplicate store "${definition.name}"`);
    storeNames.add(definition.name);
  }

  let previous = 1;
  for (const step of migrations) {
    if (!Number.isInteger(step?.version) || typeof step.up !== 'function') throw invalidConfig('migration step');
    if (step.version <= previous || step.version > version) throw invalidConfig(`migration version ${step.version}`);
    previous = step.version;
  }

  return storeNames;
}

function toPromise(request, context) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    // No preventDefault(): a failed request aborts its transaction, which is the safe behaviour.
    request.onerror = () => reject(toDbError(request.error, { context }));
  });
}

/** Run a request-producing function; synchronous throws (bad key, bad store...) become rejections. */
function attempt(context, produce) {
  try {
    return toPromise(produce(), context);
  } catch (error) {
    return Promise.reject(toDbError(error, { context }));
  }
}

function assertRecord(record, context) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw createDbError(DB_ERROR_CODES.INVALID_ARGUMENT, { context });
  }
}

function createStoreHandle(transaction, storeName) {
  const context = `store "${storeName}"`;
  const objectStore = () => transaction.objectStore(storeName);

  return Object.freeze({
    storeName,
    get: (key) => attempt(context, () => objectStore().get(key)).then((value) => value ?? null),
    getAll: () => attempt(context, () => objectStore().getAll()),
    getAllByIndex: (indexName, query) =>
      attempt(`${context}, index "${indexName}"`, () => objectStore().index(indexName).getAll(query)),
    count: () => attempt(context, () => objectStore().count()),
    add: (record) => {
      try {
        assertRecord(record, context);
      } catch (error) {
        return Promise.reject(error);
      }
      return attempt(context, () => objectStore().add(record));
    },
    put: (record) => {
      try {
        assertRecord(record, context);
      } catch (error) {
        return Promise.reject(error);
      }
      return attempt(context, () => objectStore().put(record));
    },
    delete: (key) => attempt(context, () => objectStore().delete(key)).then(() => undefined),
  });
}

export function createDatabase(config) {
  const storeNames = validateConfig(config);
  const { name, version, stores, migrations = [], onBlocked } = config;

  let connection = null;
  let opening = null;

  function factory() {
    return 'indexedDBFactory' in config ? config.indexedDBFactory : globalThis.indexedDB;
  }

  function open() {
    if (connection) return Promise.resolve(connection);
    if (opening) return opening;

    opening = new Promise((resolve, reject) => {
      const idb = factory();
      if (!idb) {
        reject(createDbError(DB_ERROR_CODES.UNAVAILABLE));
        return;
      }

      let request;
      try {
        request = idb.open(name, version);
      } catch (error) {
        reject(toDbError(error));
        return;
      }

      let upgradeError = null;

      const failUpgrade = (error) => {
        upgradeError =
          error instanceof DbError ? error : createDbError(DB_ERROR_CODES.UPGRADE_FAILED, { cause: error });
        try {
          request.transaction.abort(); // IndexedDB rolls the database back to its previous state.
        } catch {
          // Already aborting.
        }
      };

      request.onupgradeneeded = (event) => {
        // runMigrations is async: schema sync throws as a rejection, steps run one at a time.
        runMigrations({
          database: request.result,
          upgradeTransaction: request.transaction,
          oldVersion: event.oldVersion,
          newVersion: event.newVersion,
          definitions: stores,
          steps: migrations,
        }).catch(failUpgrade);
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          // Another tab/instance is upgrading: release our connection so it can proceed.
          database.close();
          if (connection === database) connection = null;
        };
        database.onclose = () => {
          if (connection === database) connection = null;
        };
        connection = database;
        resolve(database);
      };

      request.onerror = () => reject(upgradeError ?? toDbError(request.error));
      request.onblocked = () => {
        if (typeof onBlocked === 'function') onBlocked();
      };
    });

    const clear = () => {
      opening = null;
    };
    opening.then(clear, clear);
    return opening;
  }

  function close() {
    if (connection) {
      connection.close();
      connection = null;
    }
  }

  /**
   * Safe initialisation: open (creating/upgrading as needed) and ask the browser not to evict the
   * data. Persistence is best-effort and never causes initialisation to fail.
   */
  async function initialize({ requestPersistence = true } = {}) {
    const database = await open();

    let persisted = null;
    const storage = globalThis.navigator?.storage;
    if (requestPersistence && storage) {
      try {
        persisted = typeof storage.persisted === 'function' ? await storage.persisted() : false;
        if (!persisted && typeof storage.persist === 'function') persisted = await storage.persist();
      } catch {
        persisted = null;
      }
    }

    return { name: database.name, version: database.version, persisted };
  }

  /**
   * Run `work` inside ONE IndexedDB transaction spanning `storeNames`.
   *  - `work(tx)` receives tx.store(name) handles: get, getAll, getAllByIndex, count, add, put, delete.
   *  - If `work` throws or rejects, every write is rolled back and the SAME error is re-thrown.
   *  - If any request fails, the transaction aborts and the call rejects with a DbError.
   *  - Inside `work`, await ONLY database operations. Awaiting timers/network lets the browser
   *    commit the transaction early (later operations fail with TRANSACTION_INACTIVE).
   * Resolves with the value returned by `work` once the transaction has committed.
   */
  async function runInTransaction(requestedStores, mode, work) {
    const names = [...new Set(Array.isArray(requestedStores) ? requestedStores : [requestedStores])];

    if (names.length === 0 || !names.every((storeName) => storeNames.has(storeName))) {
      throw createDbError(DB_ERROR_CODES.INVALID_ARGUMENT, { context: 'unknown store' });
    }
    if (!MODES.includes(mode) || typeof work !== 'function') {
      throw createDbError(DB_ERROR_CODES.INVALID_ARGUMENT, { context: 'transaction mode or work' });
    }

    const database = await open();

    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = database.transaction(names, mode);
      } catch (error) {
        reject(toDbError(error, { context: 'opening transaction' }));
        return;
      }

      let result;
      let failure = null;
      let committed = false;
      let settled = false;

      const finish = () => {
        if (!committed || !settled) return;
        if (failure) reject(failure);
        else resolve(result);
      };

      transaction.oncomplete = () => {
        committed = true;
        finish();
      };
      transaction.onabort = () => {
        reject(failure ?? toDbError(transaction.error ?? { name: 'AbortError' }));
      };

      const handles = Object.fromEntries(names.map((storeName) => [storeName, createStoreHandle(transaction, storeName)]));
      const tx = Object.freeze({
        store(storeName) {
          if (!handles[storeName]) {
            throw createDbError(DB_ERROR_CODES.INVALID_ARGUMENT, { context: `store "${storeName}" is not in this transaction` });
          }
          return handles[storeName];
        },
      });

      let outcome;
      try {
        outcome = Promise.resolve(work(tx));
      } catch (error) {
        outcome = Promise.reject(error);
      }

      outcome.then(
        (value) => {
          result = value;
          settled = true;
          finish();
        },
        (error) => {
          failure = error;
          settled = true;
          try {
            transaction.abort(); // roll back everything written so far
          } catch {
            // Transaction already finished or aborting.
          }
          finish();
        }
      );
    });
  }

  return Object.freeze({ name, version, open, close, initialize, runInTransaction });
}
