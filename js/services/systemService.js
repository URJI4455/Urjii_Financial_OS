/**
 * System: safe start-up and storage status.
 * Layer: services (may import: ../engine/index.js; must NOT import ../db/* or ../ui/*).
 */

import { initializeDatabase } from '../engine/index.js';

export function createSystemService(initialize = initializeDatabase) {
  return Object.freeze({
    /** Opens (and if needed creates/upgrades) the local database and asks the browser to keep it. Throws a DbError on failure. */
    initialize: () => initialize(),
    /** { persisted: boolean|null, usage, quota } - what the browser says about the stored data. Never throws. */
    async storageStatus() {
      const storage = globalThis.navigator?.storage;
      const status = { persisted: null, usage: null, quota: null };
      try {
        if (storage?.persisted) status.persisted = await storage.persisted();
        if (storage?.estimate) {
          const estimate = await storage.estimate();
          status.usage = estimate.usage ?? null;
          status.quota = estimate.quota ?? null;
        }
      } catch {
        // Status is informational only.
      }
      return status;
    },
    async requestPersistence() {
      try {
        return (await globalThis.navigator?.storage?.persist?.()) ?? null;
      } catch {
        return null;
      }
    },
  });
}

export const systemService = createSystemService();
