/**
 * Backup.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Builds a downloadable JSON backup. Backups hold sensitive data: IndexedDB is persistence, not encryption.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createBackupService(engine = defaultEngine) {
  return Object.freeze({
    /** { filename, text, counts, totalRecords, exportedAt } - the UI turns `text` into a file download. */
    async exportJson() {
      const backup = await engine.backup.exportAll();
      const day = backup.exportedAt.slice(0, 10);
      return { filename: `urji-finance-backup-${day}.json`, text: JSON.stringify(backup, null, 2), counts: backup.counts, totalRecords: Object.values(backup.counts).reduce((sum, count) => sum + count, 0), exportedAt: backup.exportedAt };
    },
  });
}

export const backupService = createBackupService();
