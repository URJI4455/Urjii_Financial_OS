/**
 * Transactions.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Recording, listing, voiding and reversing transactions, plus the lists the entry forms need.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createTransactionService(engine = defaultEngine) {
  return Object.freeze({
    /** Newest first; each row has { transaction, meaning, flow }. Filters: type, lifecycleStatus, accountId, from, to. */
    list: (filter) => engine.state.transactions(filter),

    /** One transaction with its audit history (what changed, and why). */
    async detail(id) {
      const [rows, history] = await Promise.all([engine.state.transactions(), engine.audit.forEntity('transactions', id)]);
      const row = rows.find((candidate) => candidate.transaction.id === id) ?? null;
      const related = row ? rows.filter((candidate) => candidate.transaction.reverses === id || candidate.transaction.id === row.transaction.reversedBy || candidate.transaction.id === row.transaction.reverses) : [];
      return { row, history, related };
    },

    /** Record any transaction type with already-parsed values. Returns the engine's structured result. */
    record: (input) => engine.ledger.record(input),
    voidTransaction: (id, reason) => engine.ledger.voidTransaction(id, { reason }),
    reverseTransaction: (id, reason, occurredAt) => engine.ledger.reverseTransaction(id, { reason, occurredAt }),

    /** Lists that feed the "what happened?" forms. */
    async choices() {
      const [loans, held, refundable, state] = await Promise.all([
        engine.state.outstandingReceivables(),
        engine.state.outstandingHeldMoney(),
        engine.state.refundableExpenses(),
        engine.state.get(),
      ]);
      const expectations = Object.entries(state.income.expectations)
        .map(([id, entry]) => ({ id, ...entry }))
        .filter((entry) => entry.outstanding > 0);
      return { loans, held, refundable, expectations };
    },
  });
}

export const transactionService = createTransactionService();
