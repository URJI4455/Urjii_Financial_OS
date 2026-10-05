/**
 * Accounts.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Accounts with their derived balances, and account management.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createAccountService(engine = defaultEngine) {
  return Object.freeze({
    /** [{ account, balance }] for every account (archived ones only while they hold money) plus the totals. */
    async overview() {
      const [accounts, state] = await Promise.all([engine.accounts.list({ includeArchived: true }), engine.state.get()]);
      const rows = accounts
        .map((account) => ({ account, balance: state.accounts[account.id] ?? 0 }))
        .filter((row) => !row.account.archived || row.balance !== 0);
      return { rows, totals: state.totals };
    },
    create: (input) => engine.accounts.create(input),
    rename: (id, name, options) => engine.accounts.rename(id, name, options),
    archive: (id, options) => engine.accounts.archive(id, options),
    unarchive: (id, options) => engine.accounts.unarchive(id, options),
  });
}

export const accountService = createAccountService();
