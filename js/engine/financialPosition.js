/**
 * Financial position and full derived state.
 * Spec section 6. Layer: engine (pure).
 *
 *   Liquid money             money in accounts (includes money held for others)
 *   Liabilities              money held for others
 *   User-owned money         liquid - liabilities
 *   Receivables              money others owe the user
 *   Net financial position   liquid + receivables - liabilities
 *
 * Net financial position is NOT spendable money. There is deliberately no "spendable" figure here.
 */

import { deriveBalances, deriveEffects } from './balances.js';
import { deriveReceivables } from './receivables.js';
import { deriveHeldMoney } from './heldMoney.js';
import { deriveIncome } from './income.js';
import { deriveSavings } from './savings.js';
import { deriveSpending } from './reporting.js';
import { sumAmounts } from './money.js';

export function computeTotals({ accountBalances, receivables, heldMoney, savings }) {
  const liquidMoney = sumAmounts(Object.values(accountBalances));
  const liabilities = heldMoney.total;
  return {
    liquidMoney,
    liabilities,
    userOwnedMoney: liquidMoney - liabilities,
    savings: savings.total,
    receivables: receivables.total,
    netFinancialPosition: liquidMoney + receivables.total - liabilities,
  };
}

/** Everything derivable from the ledger. `accounts` (records) supplies zero balances and savings kinds. */
export function deriveState(transactions, accounts = [], { asOf = null } = {}) {
  const effects = deriveEffects(transactions, { asOf });
  const { accounts: accountBalances, allocations } = deriveBalances(effects);
  for (const account of accounts) accountBalances[account.id] ??= 0;

  const receivables = deriveReceivables(effects);
  const heldMoney = deriveHeldMoney(effects);
  const savings = deriveSavings(accountBalances, accounts);

  return {
    asOf,
    accounts: accountBalances,
    allocations,
    receivables,
    heldMoney,
    income: deriveIncome(effects),
    spending: deriveSpending(effects),
    savings,
    totals: computeTotals({ accountBalances, receivables, heldMoney, savings }),
    effects,
  };
}

/** Identities that must always hold. Returns problem codes; an empty list means the state is consistent. */
export function verifyInvariants(state) {
  const problems = [];
  const { totals } = state;

  if (sumAmounts(Object.values(state.allocations)) !== totals.userOwnedMoney) {
    problems.push('ALLOCATIONS_DO_NOT_SUM_TO_USER_OWNED_MONEY');
  }
  if (totals.userOwnedMoney !== totals.liquidMoney - totals.liabilities) problems.push('USER_OWNED_MONEY_MISMATCH');
  if (totals.netFinancialPosition !== totals.liquidMoney + totals.receivables - totals.liabilities) {
    problems.push('NET_POSITION_MISMATCH');
  }
  if (Object.values(state.receivables.byAgreement).some((entry) => entry.remaining < 0)) problems.push('NEGATIVE_RECEIVABLE');
  if (Object.values(state.heldMoney.byAgreement).some((entry) => entry.remaining < 0)) problems.push('NEGATIVE_HELD_MONEY');
  return problems;
}

/** State without the (large) effects list, suitable for returning to callers. */
export function publicState(state) {
  const { effects: _effects, ...rest } = state;
  return rest;
}
