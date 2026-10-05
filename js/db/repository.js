/**
 * Generic repository (CRUD primitives) for one object store.
 * Layer: db (may import: ./errors.js).
 *
 * Repositories are persistence only. They contain NO financial rules (those live in ../engine/)
 * and they never generate ids: every record must carry its own key (keyPath 'id', ADR-005).
 *
 * Each call runs in its own transaction. To make several writes atomic (for example a ledger
 * entry plus its audit record), use database.runInTransaction instead.
 *
 * Deliberately absent: clear/truncate. A restore that replaces data needs an explicit decision
 * (docs/BACKUP_RESTORE.md). `delete` is a primitive; whether anything may be deleted is an
 * engine decision (spec section 9).
 *
 *   get(key)                    -> record | null
 *   getAll()                    -> record[]
 *   getAllByIndex(index, query) -> record[]   (query: key or IDBKeyRange; omit for all indexed records)
 *   count()                     -> number
 *   add(record)                 -> key        (rejects CONSTRAINT_VIOLATION if the key exists)
 *   put(record)                 -> key        (insert or replace)
 *   delete(key)                 -> undefined  (no error if the key does not exist)
 */

export function createRepository(database, storeName) {
  const read = (operation) =>
    database.runInTransaction([storeName], 'readonly', (tx) => operation(tx.store(storeName)));
  const write = (operation) =>
    database.runInTransaction([storeName], 'readwrite', (tx) => operation(tx.store(storeName)));

  return Object.freeze({
    storeName,
    get: (key) => read((store) => store.get(key)),
    getAll: () => read((store) => store.getAll()),
    getAllByIndex: (indexName, query) => read((store) => store.getAllByIndex(indexName, query)),
    count: () => read((store) => store.count()),
    add: (record) => write((store) => store.add(record)),
    put: (record) => write((store) => store.put(record)),
    delete: (key) => write((store) => store.delete(key)),
  });
}

export function createRepositories(database, storeNames) {
  return Object.freeze(Object.fromEntries(storeNames.map((storeName) => [storeName, createRepository(database, storeName)])));
}
