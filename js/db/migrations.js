/**
 * Schema synchronisation and versioned data migrations.
 * Layer: db (may import: ./errors.js).
 *
 * DATA-SAFETY RULES
 *  1. The whole upgrade runs inside one versionchange transaction. If anything throws, the
 *     transaction is aborted and IndexedDB rolls the database back to its previous version
 *     and contents. Nothing is ever half-upgraded.
 *  2. Schema sync is ADDITIVE ONLY: missing stores and indexes are created; nothing is ever
 *     deleted, renamed or altered. Stores/indexes found in the database but absent from the
 *     definitions are left untouched.
 *  3. If an existing store or index differs from its definition (key path, unique, multiEntry),
 *     the upgrade is aborted with SCHEMA_CONFLICT instead of guessing.
 *  4. Data migrations are explicit, numbered steps. They run once, in ascending order, only for
 *     versions newer than the stored one, and see the latest schema. A destructive change
 *     (removing or reshaping a store) requires a recorded decision and a step that first copies
 *     the data to a new store.
 *  5. Steps run STRICTLY one after another: a step may return a promise, and the next step only
 *     starts once it settles. A step must await ONLY IndexedDB requests (never timers or network),
 *     otherwise the upgrade transaction commits early. Without this ordering, two steps that
 *     read-modify-write the same store could overwrite each other.
 *
 * TODO(migrations): add steps here as { version, description, up({ database, transaction }) }.
 */

import { DB_ERROR_CODES, createDbError } from './errors.js';

/** Versioned data migration steps for the default database. Version 1 is schema creation only. */
export const MIGRATIONS = Object.freeze([]);

const sameShape = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function applySchema(database, upgradeTransaction, definitions) {
  for (const definition of definitions) {
    let objectStore;

    if (database.objectStoreNames.contains(definition.name)) {
      objectStore = upgradeTransaction.objectStore(definition.name);
      if (!sameShape(objectStore.keyPath, definition.keyPath)) {
        throw createDbError(DB_ERROR_CODES.SCHEMA_CONFLICT, { context: `store "${definition.name}"` });
      }
    } else {
      objectStore = database.createObjectStore(definition.name, { keyPath: definition.keyPath });
    }

    for (const definedIndex of definition.indexes ?? []) {
      const wanted = { unique: Boolean(definedIndex.unique), multiEntry: Boolean(definedIndex.multiEntry) };

      if (objectStore.indexNames.contains(definedIndex.name)) {
        const existing = objectStore.index(definedIndex.name);
        const matches =
          sameShape(existing.keyPath, definedIndex.keyPath) &&
          existing.unique === wanted.unique &&
          existing.multiEntry === wanted.multiEntry;
        if (!matches) {
          throw createDbError(DB_ERROR_CODES.SCHEMA_CONFLICT, {
            context: `index "${definedIndex.name}" on "${definition.name}"`,
          });
        }
      } else {
        objectStore.createIndex(definedIndex.name, definedIndex.keyPath, wanted);
      }
    }
  }
}

/**
 * Returns a promise that settles when every pending step has finished. Schema sync is synchronous
 * and throws immediately on a conflict.
 */
export async function runMigrations({ database, upgradeTransaction, oldVersion, newVersion, definitions, steps = [] }) {
  applySchema(database, upgradeTransaction, definitions);

  const pending = steps
    .filter((step) => step.version > oldVersion && step.version <= newVersion)
    .sort((a, b) => a.version - b.version);

  for (const step of pending) {
    await step.up({ database, transaction: upgradeTransaction });
  }
}
