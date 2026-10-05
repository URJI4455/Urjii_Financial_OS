/**
 * Shared logic for agreements that are opened by one transaction and closed down by later ones:
 * loans (receivables) and money held for others. The opening transaction IS the agreement.
 * Layer: engine (pure). OPEN-004 decision: no separate stored agreement amounts.
 */

import { TRANSACTION_TYPES as T } from '../config/constants.js';
import { deriveEffects } from './balances.js';
import { dict } from './util.js';

/** Sum remaining amounts per agreement and per person for one effect kind. Zero balances are omitted. */
export function deriveOutstanding(effects, effectKind) {
  const grouped = dict();
  for (const effect of effects) {
    if (effect.kind !== effectKind) continue;
    const entry = (grouped[effect.agreementId] ??= { personId: effect.personId, remaining: 0 });
    entry.remaining += effect.amount;
  }

  const byAgreement = dict();
  const byPerson = dict();
  let total = 0;
  for (const [agreementId, entry] of Object.entries(grouped)) {
    if (entry.remaining === 0) continue;
    byAgreement[agreementId] = entry;
    byPerson[entry.personId] = (byPerson[entry.personId] ?? 0) + entry.remaining;
    total += entry.remaining;
  }
  return { total, byPerson, byAgreement };
}

export function agreementStatement({ agreementId, agreementType, childType, childField, effectKind, transactions }) {
  const agreement = transactions.find((transaction) => transaction.id === agreementId && transaction.type === agreementType);
  if (!agreement) return null;

  const remaining = deriveEffects(transactions)
    .filter((effect) => effect.kind === effectKind && effect.agreementId === agreementId)
    .reduce((sum, effect) => sum + effect.amount, 0);

  const children = transactions.filter((transaction) => transaction.type === childType && transaction[childField] === agreementId);
  const relatedIds = new Set([agreementId, ...children.map((child) => child.id)]);
  const reversals = transactions.filter((transaction) => transaction.type === T.REVERSAL && relatedIds.has(transaction.reverses));

  const history = [agreement, ...children, ...reversals]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.recordedAt.localeCompare(b.recordedAt))
    .map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      lifecycleStatus: transaction.lifecycleStatus,
      reverses: transaction.reverses ?? null,
    }));

  const settledAmount = children
    .filter((child) => child.lifecycleStatus === 'posted')
    .reduce((sum, child) => sum + child.amount, 0);

  return {
    agreementId,
    personId: agreement.personId,
    accountId: agreement.accountId,
    status: agreement.lifecycleStatus,
    originalAmount: agreement.amount,
    settledAmount,
    remainingAmount: remaining,
    history,
  };
}
