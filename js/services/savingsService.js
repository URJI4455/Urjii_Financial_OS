/**
 * Savings.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Savings accounts and their derived balances (savings is real money in savings accounts).
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createSavingsService(engine = defaultEngine) {
  return Object.freeze({
    async overview() {
      const [accounts, state] = await Promise.all([engine.accounts.list(), engine.state.get()]);
      return {
        total: state.savings.total,
        rows: accounts.filter((account) => account.kind === 'savings').map((account) => ({ account, balance: state.accounts[account.id] ?? 0 })),
      };
    },
  });
}

export const savingsService = createSavingsService();
