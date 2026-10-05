/**
 * Allocations (what money is for).
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Allocations with their derived balances.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine, balances } from '../engine/index.js';

export function createAllocationService(engine = defaultEngine) {
  return Object.freeze({
    /** { rows: [{ allocation, balance }], unallocated, total } - every figure from the engine. */
    async overview() {
      const [allocations, state] = await Promise.all([engine.allocations.list({ includeArchived: true }), engine.state.get()]);
      const rows = allocations
        .map((allocation) => ({ allocation, balance: state.allocations[allocation.id] ?? 0 }))
        .filter((row) => !row.allocation.archived || row.balance !== 0);
      return { rows, unallocated: state.allocations[balances.UNALLOCATED] ?? 0, userOwnedMoney: state.totals.userOwnedMoney };
    },
    create: (input) => engine.allocations.create(input),
    rename: (id, name, options) => engine.allocations.rename(id, name, options),
    archive: (id, options) => engine.allocations.archive(id, options),
    unarchive: (id, options) => engine.allocations.unarchive(id, options),
  });
}

export const allocationService = createAllocationService();
