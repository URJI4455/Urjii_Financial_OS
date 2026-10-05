/**
 * Receivables (people who owe me).
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Each loan with its original, settled and remaining amounts and history, grouped by person.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createReceivableService(engine = defaultEngine) {
  return Object.freeze({
    /** { total, people: [{ personId, remaining, items: [statement] }], settled: [statement] } */
    async overview() {
      const [live, all, state] = await Promise.all([
        engine.state.receivableStatements(),
        engine.state.receivableStatements({ includeSettled: true }),
        engine.state.get(),
      ]);
      const people = [];
      for (const statement of live) {
        let group = people.find((entry) => entry.personId === statement.personId);
        if (!group) {
          group = { personId: statement.personId, remaining: state.receivables.byPerson[statement.personId] ?? 0, items: [] };
          people.push(group);
        }
        group.items.push(statement);
      }
      const liveIds = new Set(live.map((statement) => statement.agreementId));
      return {
        total: state.receivables.total,
        people,
        settled: all.filter((statement) => !liveIds.has(statement.agreementId)),
      };
    },
    statement: (id) => engine.state.receivableStatement(id),
  });
}

export const receivableService = createReceivableService();
