/**
 * Reconciliation.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Expected vs real balance per account; discrepancies and their explicit resolution.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createReconciliationService(engine = defaultEngine) {
  return Object.freeze({
    overview: () => engine.reconciliation.overview(),
    history: (accountId) => engine.reconciliation.list({ accountId }),
    openDiscrepancies: () => engine.reconciliation.openDiscrepancies(),
    check: (accountId, actualAmount, note) => engine.reconciliation.check({ accountId, actualAmount, ...(note ? { note } : {}) }),
    resolveWithAdjustment: (checkId, reason) => engine.reconciliation.resolveWithAdjustment(checkId, { reason }),
  });
}

export const reconciliationService = createReconciliationService();
