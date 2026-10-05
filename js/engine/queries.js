/**
 * Shared transaction filtering.
 * Layer: engine (pure).
 */

import { toIso } from './time.js';

export const byOccurredAsc = (a, b) =>
  a.occurredAt.localeCompare(b.occurredAt) || a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id);

/** Filters (all optional): type, lifecycleStatus, accountId (any account field), from, to (inclusive). */
export function filterTransactions(transactions, filter = {}) {
  const from = filter.from === undefined || filter.from === null ? null : toIso(filter.from);
  const to = filter.to === undefined || filter.to === null ? null : toIso(filter.to);
  return transactions
    .filter((t) => filter.type === undefined || t.type === filter.type)
    .filter((t) => filter.lifecycleStatus === undefined || t.lifecycleStatus === filter.lifecycleStatus)
    .filter((t) => filter.accountId === undefined || [t.accountId, t.fromAccountId, t.toAccountId].includes(filter.accountId))
    .filter((t) => from === null || t.occurredAt >= from)
    .filter((t) => to === null || t.occurredAt <= to);
}
