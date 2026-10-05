/**
 * Dashboard summary.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Everything the home screen shows, in one call. Totals and balances come from the engine; "today" and "this month" boundaries are local-time ranges.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine, balances } from '../engine/index.js';

import { periodRange } from './reportService.js';

export function createDashboardService(engine = defaultEngine) {
  return Object.freeze({
    async load(now = new Date()) {
      const month = periodRange('this-month', now);
      const todayRange = {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
      };

      const [state, accounts, allocations, people, sources, today, monthToDate, discrepancies, receivables, held] = await Promise.all([
        engine.state.get(),
        engine.accounts.list({ includeArchived: true }),
        engine.allocations.list({ includeArchived: true }),
        engine.people.list({ includeArchived: true }),
        engine.sources.list({ includeArchived: true }),
        engine.state.spending(todayRange),
        engine.state.spending(month),
        engine.reconciliation.openDiscrepancies(),
        engine.state.outstandingReceivables(),
        engine.state.outstandingHeldMoney(),
      ]);

      const accountRows = accounts
        .map((account) => ({ account, balance: state.accounts[account.id] ?? 0 }))
        .filter((row) => !row.account.archived || row.balance !== 0);
      const allocationRows = allocations
        .map((allocation) => ({ allocation, balance: state.allocations[allocation.id] ?? 0 }))
        .filter((row) => !row.allocation.archived || row.balance !== 0);

      const pending = [
        ...discrepancies.map((entry) => ({ kind: 'discrepancy', accountId: entry.account.id, amount: entry.openDiscrepancy.currentDifference })),
        ...Object.entries(state.income.expectations)
          .filter(([, entry]) => entry.outstanding > 0)
          .map(([id, entry]) => ({ kind: 'expected-income', id, sourceId: entry.sourceId, amount: entry.outstanding })),
        ...receivables.map((statement) => ({ kind: 'receivable', id: statement.agreementId, personId: statement.personId, amount: statement.remainingAmount })),
        ...held.map((statement) => ({ kind: 'held', id: statement.agreementId, personId: statement.personId, amount: statement.remainingAmount })),
      ];

      return {
        isEmpty: accounts.length === 0,
        totals: state.totals,
        accounts: accountRows,
        allocations: allocationRows,
        unallocated: state.allocations[balances.UNALLOCATED] ?? 0,
        savings: state.savings,
        receivables: { total: state.receivables.total, people: state.receivables.byPerson },
        heldForOthers: { total: state.heldMoney.total, people: state.heldMoney.byPerson },
        outstandingIncome: state.income.outstandingTotal,
        spending: { today: today.total, monthToDate: monthToDate.total },
        discrepancies,
        pending,
        peopleNames: Object.fromEntries(people.map((person) => [person.id, person.name])),
        sourceNames: Object.fromEntries(sources.map((source) => [source.id, source.name])),
        accountNames: Object.fromEntries(accounts.map((account) => [account.id, account.name])),
      };
    },
  });
}

export const dashboardService = createDashboardService();
