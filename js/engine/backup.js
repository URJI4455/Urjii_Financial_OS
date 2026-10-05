/**
 * Backup export.
 * Spec section 24. Layer: engine.
 *
 * exportAll() reads EVERY store inside one read-only transaction, so the file is a consistent
 * snapshot. Backups hold sensitive data: IndexedDB is persistence, not encryption.
 *
 * TODO(backup): restore (select -> validate -> preview -> confirm -> restore), CSV export.
 */

import { STORE_NAMES } from '../db/schema.js';
import { toIso } from './time.js';

export const BACKUP_FORMAT = 'urji-finance-os-backup';
export const BACKUP_FORMAT_VERSION = 1;

export function createBackup({ database, clock }) {
  const names = Object.values(STORE_NAMES);

  const exportAll = () =>
    database.runInTransaction(names, 'readonly', async (tx) => {
      const stores = {};
      for (const name of names) stores[name] = await tx.store(name).getAll();
      const counts = Object.fromEntries(names.map((name) => [name, stores[name].length]));
      return { format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: toIso(clock()), counts, stores };
    });

  return Object.freeze({ exportAll });
}
