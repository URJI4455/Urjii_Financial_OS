/**
 * Income and income sources.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Income received per source, and expected payments that are not fully received yet.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createIncomeService(engine = defaultEngine) {
  return Object.freeze({
    async overview() {
      const [sources, summary] = await Promise.all([engine.sources.list({ includeArchived: true }), engine.state.incomeSummary()]);
      const open = Object.entries(summary.expectations)
        .map(([id, entry]) => ({ id, ...entry }))
        .filter((entry) => entry.outstanding > 0);
      const settled = Object.entries(summary.expectations)
        .map(([id, entry]) => ({ id, ...entry }))
        .filter((entry) => entry.outstanding === 0);
      return {
        total: summary.total,
        outstandingTotal: summary.outstandingTotal,
        sources: sources
          .map((source) => ({ source, received: summary.bySource[source.id] ?? 0 }))
          .filter((row) => !row.source.archived || row.received !== 0),
        openExpectations: open,
        settledExpectations: settled,
      };
    },
    createSource: (input) => engine.sources.create(input),
    renameSource: (id, name, options) => engine.sources.rename(id, name, options),
    archiveSource: (id, options) => engine.sources.archive(id, options),
    unarchiveSource: (id, options) => engine.sources.unarchive(id, options),
  });
}

export const incomeService = createIncomeService();
