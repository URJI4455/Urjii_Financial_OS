/**
 * Income: totals per source and expected vs received vs outstanding.
 * Spec section 15. Layer: engine (pure).
 *
 * An income transaction may declare `expectedAmount`; its expectation id (default: its own id) lets
 * later receipts complete it. Outstanding = expected - received (never below zero).
 */

import { EFFECT_KINDS } from './transactionTypes.js';
import { dict } from './util.js';

export function deriveIncome(effects) {
  const bySource = dict();
  const groups = dict();
  let total = 0;

  for (const effect of effects) {
    if (effect.kind !== EFFECT_KINDS.INCOME) continue;
    total += effect.amount;
    bySource[effect.sourceId] = (bySource[effect.sourceId] ?? 0) + effect.amount;

    if (effect.expectationId) {
      const group = (groups[effect.expectationId] ??= { sourceId: effect.sourceId, expected: null, received: 0 });
      group.received += effect.amount;
      if (effect.expectedAmount != null && group.expected === null) group.expected = effect.expectedAmount;
    }
  }

  const expectations = dict();
  let outstandingTotal = 0;
  for (const [id, group] of Object.entries(groups)) {
    if (group.expected === null) continue;
    const outstanding = Math.max(group.expected - group.received, 0);
    expectations[id] = { ...group, outstanding };
    outstandingTotal += outstanding;
  }
  return { total, bySource, expectations, outstandingTotal };
}
