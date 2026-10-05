/**
 * Derived balances.
 * Spec sections 5, 11. Layer: engine (pure).
 *
 * Nothing here reads a stored balance. Balances are sums of effects of valid transactions.
 * Voided and draft transactions never contribute. Posted and reversed ones do (a reversed
 * transaction really happened; its reversal contributes the offsetting effects on its own date).
 */

import { interpretTransaction, EFFECT_KINDS } from './transactionTypes.js';
import { dict } from './util.js';

export const UNALLOCATED = '__unallocated__';

export const allocationKey = (allocationId) => allocationId ?? UNALLOCATED;

export function contributes(transaction) {
  return transaction.lifecycleStatus === 'posted' || transaction.lifecycleStatus === 'reversed';
}

/** Effects of every contributing transaction, optionally only those that happened at or before `asOf`. */
export function deriveEffects(transactions, { asOf = null } = {}) {
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const lookup = (id) => byId.get(id);
  const ordered = [...transactions].sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id)
  );

  const effects = [];
  for (const transaction of ordered) {
    if (!contributes(transaction)) continue;
    for (const effect of interpretTransaction(transaction, lookup)) {
      if (asOf === null || effect.occurredAt <= asOf) effects.push(effect);
    }
  }
  return effects;
}

/** Account and allocation balances (minor units) from effects. */
export function deriveBalances(effects) {
  const accounts = dict();
  const allocations = dict();
  for (const effect of effects) {
    if (effect.kind === EFFECT_KINDS.ACCOUNT) {
      accounts[effect.accountId] = (accounts[effect.accountId] ?? 0) + effect.amount;
    } else if (effect.kind === EFFECT_KINDS.ALLOCATION) {
      const key = allocationKey(effect.allocationId);
      allocations[key] = (allocations[key] ?? 0) + effect.amount;
    }
  }
  return { accounts, allocations };
}
