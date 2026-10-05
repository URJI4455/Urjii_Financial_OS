/**
 * Derived reporting queries.
 * Spec sections 5, 22. Layer: engine (pure).
 */

import { EFFECT_KINDS } from './transactionTypes.js';
import { dict } from './util.js';

/** Net spending (expenses minus refunds), optionally within [from, to] (ISO strings, inclusive). */
export function deriveSpending(effects, { from = null, to = null } = {}) {
  const byCategory = dict();
  let total = 0;
  for (const effect of effects) {
    if (effect.kind !== EFFECT_KINDS.EXPENSE) continue;
    if (from !== null && effect.occurredAt < from) continue;
    if (to !== null && effect.occurredAt > to) continue;
    total += effect.amount;
    byCategory[effect.categoryId] = (byCategory[effect.categoryId] ?? 0) + effect.amount;
  }
  return { total, byCategory };
}

const inRange = (effect, from, to) => (from === null || effect.occurredAt >= from) && (to === null || effect.occurredAt <= to);

/** Net income (income minus reversed income), optionally within [from, to] (ISO strings, inclusive). */
export function deriveIncomeTotals(effects, { from = null, to = null } = {}) {
  const bySource = dict();
  let total = 0;
  for (const effect of effects) {
    if (effect.kind !== EFFECT_KINDS.INCOME || !inRange(effect, from, to)) continue;
    total += effect.amount;
    bySource[effect.sourceId] = (bySource[effect.sourceId] ?? 0) + effect.amount;
  }
  return { total, bySource };
}

/** Per account: money in, money out and net change within [from, to]. Transfers show on both accounts. */
export function deriveAccountMovement(effects, { from = null, to = null } = {}) {
  const movement = dict();
  for (const effect of effects) {
    if (effect.kind !== EFFECT_KINDS.ACCOUNT || !inRange(effect, from, to)) continue;
    const entry = (movement[effect.accountId] ??= { moneyIn: 0, moneyOut: 0, net: 0 });
    if (effect.amount > 0) entry.moneyIn += effect.amount;
    else entry.moneyOut += -effect.amount;
    entry.net += effect.amount;
  }
  return movement;
}
