/**
 * Transaction types: allowed fields, economic interpretation and dependency rules.
 * Spec sections 7, 13, 14, 16, 18. Layer: engine (pure; no database access).
 *
 * interpretTransaction() is the SINGLE place that decides what a transaction means. It turns a
 * stored transaction into EFFECTS. Balances and totals are always derived from effects; effects are
 * never stored (changing this table changes history, so it needs a decision record).
 *
 * Effect kinds (amount is signed, in minor units):
 *   account      { accountId }                      where money is
 *   allocation   { allocationId | null }            what user-owned money is intended for (null = unallocated)
 *   income       { sourceId, expectationId?, expectedAmount? }
 *   expense      { categoryId, refundOf? }          negative for refunds
 *   receivable   { personId, agreementId }          money others owe the user
 *   held_money   { personId, agreementId }          money held for others (a liability)
 *
 * Meaning table (ADR-010):
 *   income                 account +A, allocation +A, income +A
 *   expense                account -A, allocation -A, expense +A
 *   transfer               account(from) -A, account(to) +A
 *   savings_deposit        account(from) -A, savings account(to) +A
 *   savings_withdrawal     savings account(from) -A, account(to) +A
 *   loan_receivable_created account -A, allocation -A, receivable +A      (expense = 0)
 *   receivable_settlement  account +A, allocation +A, receivable -A
 *   money_held_for_others  account +A, held_money +A                      (income = 0, no allocation)
 *   return_held_money      account -A, held_money -A
 *   allocation_transfer    allocation(from) -A, allocation(to) +A
 *   refund                 account +A, allocation +A, expense -A          (income = 0)
 *   adjustment             account +/-A, allocation +/-A                  (neither income nor expense)
 *   reversal               the exact negation of the reversed transaction's effects
 */

import { TRANSACTION_TYPES as T } from '../config/constants.js';
import { ENGINE_ERROR_CODES, EngineError } from './errors.js';

export const EFFECT_KINDS = Object.freeze({
  ACCOUNT: 'account',
  ALLOCATION: 'allocation',
  INCOME: 'income',
  EXPENSE: 'expense',
  RECEIVABLE: 'receivable',
  HELD_MONEY: 'held_money',
});

const K = EFFECT_KINDS;

/** Fields every recordable transaction may carry. */
export const COMMON_FIELDS = Object.freeze(['id', 'type', 'amount', 'occurredAt', 'note', 'reason', 'confidenceStatus']);

/** Extra fields per recordable type. Anything else is rejected (typos must not be silently ignored). */
export const TYPE_FIELDS = Object.freeze({
  [T.INCOME]: ['accountId', 'sourceId', 'allocationId', 'expectedAmount', 'expectationId'],
  [T.EXPENSE]: ['accountId', 'categoryId', 'allocationId'],
  [T.TRANSFER]: ['fromAccountId', 'toAccountId'],
  [T.SAVINGS_DEPOSIT]: ['fromAccountId', 'toAccountId'],
  [T.SAVINGS_WITHDRAWAL]: ['fromAccountId', 'toAccountId'],
  [T.LOAN_RECEIVABLE_CREATED]: ['accountId', 'personId', 'allocationId'],
  [T.RECEIVABLE_SETTLEMENT]: ['accountId', 'receivableId', 'personId', 'allocationId'],
  [T.MONEY_HELD_FOR_OTHERS]: ['accountId', 'personId'],
  [T.RETURN_HELD_MONEY]: ['accountId', 'heldMoneyId', 'personId'],
  [T.ALLOCATION_TRANSFER]: ['fromAllocationId', 'toAllocationId'],
  [T.REFUND]: ['refundOf', 'accountId', 'allocationId'],
  [T.ADJUSTMENT]: ['accountId', 'direction', 'allocationId'],
});

export const ADJUSTMENT_DIRECTIONS = Object.freeze({ INCREASE: 'increase', DECREASE: 'decrease' });

/** Turn one stored transaction into effects. `lookup(id)` is only needed for reversals. */
export function interpretTransaction(transaction, lookup) {
  if (transaction.type === T.REVERSAL) {
    const original = lookup ? lookup(transaction.reverses) : undefined;
    if (!original) {
      throw new EngineError(ENGINE_ERROR_CODES.LEDGER_CORRUPT, 'A reversal refers to a transaction that does not exist.', {
        transactionId: transaction.id,
      });
    }
    return interpretTransaction(original, lookup).map((effect) =>
      negateEffect(effect, { transactionId: transaction.id, occurredAt: transaction.occurredAt })
    );
  }

  const A = transaction.amount;
  const base = { transactionId: transaction.id, occurredAt: transaction.occurredAt };
  const account = (accountId, amount) => ({ ...base, kind: K.ACCOUNT, accountId, amount });
  const allocation = (allocationId, amount) => ({ ...base, kind: K.ALLOCATION, allocationId: allocationId ?? null, amount });

  switch (transaction.type) {
    case T.INCOME:
      return [
        account(transaction.accountId, A),
        allocation(transaction.allocationId, A),
        {
          ...base,
          kind: K.INCOME,
          sourceId: transaction.sourceId,
          amount: A,
          expectationId: transaction.expectationId ?? null,
          expectedAmount: transaction.expectedAmount ?? null,
        },
      ];
    case T.EXPENSE:
      return [
        account(transaction.accountId, -A),
        allocation(transaction.allocationId, -A),
        { ...base, kind: K.EXPENSE, categoryId: transaction.categoryId, amount: A, refundOf: null },
      ];
    case T.TRANSFER:
    case T.SAVINGS_DEPOSIT:
    case T.SAVINGS_WITHDRAWAL:
      return [account(transaction.fromAccountId, -A), account(transaction.toAccountId, A)];
    case T.LOAN_RECEIVABLE_CREATED:
      return [
        account(transaction.accountId, -A),
        allocation(transaction.allocationId, -A),
        { ...base, kind: K.RECEIVABLE, personId: transaction.personId, agreementId: transaction.id, amount: A },
      ];
    case T.RECEIVABLE_SETTLEMENT:
      return [
        account(transaction.accountId, A),
        allocation(transaction.allocationId, A),
        { ...base, kind: K.RECEIVABLE, personId: transaction.personId, agreementId: transaction.receivableId, amount: -A },
      ];
    case T.MONEY_HELD_FOR_OTHERS:
      return [
        account(transaction.accountId, A),
        { ...base, kind: K.HELD_MONEY, personId: transaction.personId, agreementId: transaction.id, amount: A },
      ];
    case T.RETURN_HELD_MONEY:
      return [
        account(transaction.accountId, -A),
        { ...base, kind: K.HELD_MONEY, personId: transaction.personId, agreementId: transaction.heldMoneyId, amount: -A },
      ];
    case T.ALLOCATION_TRANSFER:
      return [allocation(transaction.fromAllocationId, -A), allocation(transaction.toAllocationId, A)];
    case T.REFUND:
      return [
        account(transaction.accountId, A),
        allocation(transaction.allocationId, A),
        { ...base, kind: K.EXPENSE, categoryId: transaction.categoryId, amount: -A, refundOf: transaction.refundOf },
      ];
    case T.ADJUSTMENT: {
      const signed = transaction.direction === ADJUSTMENT_DIRECTIONS.INCREASE ? A : -A;
      return [account(transaction.accountId, signed), allocation(transaction.allocationId, signed)];
    }
    default:
      throw new EngineError(ENGINE_ERROR_CODES.LEDGER_CORRUPT, 'Unknown transaction type in the ledger.', {
        transactionId: transaction.id,
      });
  }
}

/** The exact opposite of an effect, attributed to another transaction. `expectedAmount` is not carried over. */
export function negateEffect(effect, { transactionId, occurredAt, voided = false }) {
  const { expectedAmount: _definition, ...rest } = effect;
  const negated = { ...rest, amount: -effect.amount, transactionId, occurredAt, reverses: effect.transactionId };
  if (voided) negated.voided = true;
  return negated;
}

/** What an action means economically: net change per dimension. */
export function summarizeMeaning(type, effects) {
  const total = (kind) => effects.filter((effect) => effect.kind === kind).reduce((sum, effect) => sum + effect.amount, 0);
  const liquid = total(K.ACCOUNT);
  const receivable = total(K.RECEIVABLE);
  const liability = total(K.HELD_MONEY);
  return {
    type,
    liquidMoneyChange: liquid,
    receivableChange: receivable,
    liabilityChange: liability,
    userOwnedMoneyChange: liquid - liability,
    netPositionChange: liquid + receivable - liability,
    incomeAmount: total(K.INCOME),
    expenseAmount: total(K.EXPENSE),
  };
}

/**
 * Posted transactions that depend on `transaction` and therefore block voiding or reversing it.
 * Reversed dependents are ignored: their reversal already cancels them.
 */
export function findDependents(transaction, transactions) {
  const live = transactions.filter((other) => other.lifecycleStatus === 'posted' && other.id !== transaction.id);
  switch (transaction.type) {
    case T.LOAN_RECEIVABLE_CREATED:
      return live.filter((other) => other.type === T.RECEIVABLE_SETTLEMENT && other.receivableId === transaction.id);
    case T.MONEY_HELD_FOR_OTHERS:
      return live.filter((other) => other.type === T.RETURN_HELD_MONEY && other.heldMoneyId === transaction.id);
    case T.EXPENSE:
      return live.filter((other) => other.type === T.REFUND && other.refundOf === transaction.id);
    case T.INCOME:
      if (transaction.expectedAmount == null) return [];
      return live.filter((other) => other.type === T.INCOME && other.expectationId === transaction.expectationId);
    default:
      return [];
  }
}
