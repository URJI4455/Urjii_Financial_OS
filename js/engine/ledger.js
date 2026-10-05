/**
 * Ledger: record, void and reverse transactions.
 * Spec sections 5, 8, 9, 10. Layer: engine.
 *
 * Every operation runs inside ONE database transaction:
 *   read snapshot -> validate -> interpret -> persist -> audit -> derive state -> structured result
 * If anything throws, nothing is saved. Nothing here stores a balance.
 *
 * Void     wrong entry. Status becomes 'voided'; it contributes to nothing. Record is kept.
 * Reversal a real event later undone. A NEW linked 'reversal' transaction offsets it; the original
 *          is kept, marked 'reversed', and keeps contributing until the reversal's own date.
 * Both need a written reason and are blocked while posted transactions still depend on the target.
 */

import { LIFECYCLE_STATUS as L, RECONCILIATION_STATUS as R, TRANSACTION_TYPES as T } from '../config/constants.js';
import { STORE_NAMES as S } from '../db/schema.js';
import { ENGINE_ERROR_CODES, EngineError, ValidationError } from './errors.js';
import { deriveState } from './financialPosition.js';
import { allocationKey } from './balances.js';
import { loadSnapshot, WRITE_STORES } from './snapshot.js';
import { validateTransactionInput, requireReason } from './validation.js';
import { EFFECT_KINDS, findDependents, interpretTransaction, negateEffect, summarizeMeaning } from './transactionTypes.js';
import { isPlainObject } from './util.js';
import { byOccurredAsc, filterTransactions } from './queries.js';
import { toIso } from './time.js';

const sumBy = (effects, kind, key) => {
  const totals = new Map();
  for (const effect of effects) {
    if (effect.kind === kind) totals.set(key(effect), (totals.get(key(effect)) ?? 0) + effect.amount);
  }
  return totals;
};

/** Balances of everything an action touched, after the action. */
function touchedBalances(effects, state) {
  const result = { accounts: {}, allocations: {}, receivables: {}, heldMoney: {} };
  for (const effect of effects) {
    if (effect.kind === EFFECT_KINDS.ACCOUNT) result.accounts[effect.accountId] = state.accounts[effect.accountId] ?? 0;
    else if (effect.kind === EFFECT_KINDS.ALLOCATION) {
      const key = allocationKey(effect.allocationId);
      result.allocations[key] = state.allocations[key] ?? 0;
    } else if (effect.kind === EFFECT_KINDS.RECEIVABLE) {
      result.receivables[effect.agreementId] = state.receivables.byAgreement[effect.agreementId]?.remaining ?? 0;
    } else if (effect.kind === EFFECT_KINDS.HELD_MONEY) {
      result.heldMoney[effect.agreementId] = state.heldMoney.byAgreement[effect.agreementId]?.remaining ?? 0;
    }
  }
  return result;
}

/** Non-blocking: reality wins, but the user should know money went below zero. */
function computeWarnings(effects, state) {
  const warnings = [];
  for (const [accountId, delta] of sumBy(effects, EFFECT_KINDS.ACCOUNT, (e) => e.accountId)) {
    if (delta < 0 && (state.accounts[accountId] ?? 0) < 0) {
      warnings.push({ code: 'ACCOUNT_BALANCE_NEGATIVE', accountId, balance: state.accounts[accountId] });
    }
  }
  for (const [key, delta] of sumBy(effects, EFFECT_KINDS.ALLOCATION, (e) => allocationKey(e.allocationId))) {
    if (delta < 0 && (state.allocations[key] ?? 0) < 0) {
      warnings.push({ code: 'ALLOCATION_BALANCE_NEGATIVE', allocationId: key, balance: state.allocations[key] });
    }
  }
  return warnings;
}

function buildResult({ action, transaction, original = null, effects, stateAfter, audit }) {
  const { effects: _all, ...position } = stateAfter;
  return {
    ok: true,
    action,
    transaction,
    original,
    meaning: summarizeMeaning(transaction.type, effects),
    effects,
    balances: touchedBalances(effects, stateAfter),
    position: position.totals,
    warnings: computeWarnings(effects, stateAfter),
    audit,
  };
}

export function createLedger({ database, clock, newId, audit }) {
  const nowIso = () => toIso(clock());

  /**
   * Validate, interpret, persist, audit and derive state for one new transaction INSIDE an open
   * transaction (which must include WRITE_STORES). Engine-internal: reconciliation uses it so an
   * adjustment and its reconciliation record are saved together.
   */
  async function recordWithin(tx, input) {
    const snapshot = await loadSnapshot(tx);
    const ctx = { ...snapshot, nowIso: nowIso() };

    const candidate = isPlainObject(input) && input.id === undefined ? { ...input, id: newId() } : input;
    const normalized = validateTransactionInput(candidate, ctx);

    const transaction = {
      ...normalized,
      lifecycleStatus: L.POSTED,
      reconciliationStatus: R.UNRECONCILED,
      recordedAt: ctx.nowIso,
    };
    const effects = interpretTransaction(transaction, snapshot.lookup);

    await tx.store(S.TRANSACTIONS).add(transaction);
    const entry = await audit.write(tx, {
      entity: S.TRANSACTIONS,
      entityId: transaction.id,
      action: 'create',
      previousState: null,
      newState: transaction,
      reason: transaction.reason ?? null,
    });

    const stateAfter = deriveState([...snapshot.transactions, transaction], snapshot.accountList);
    return buildResult({ action: 'recorded', transaction, effects, stateAfter, audit: [entry] });
  }

  const record = (input) => database.runInTransaction(WRITE_STORES, 'readwrite', (tx) => recordWithin(tx, input));

  function requireExisting(snapshot, id) {
    const original = snapshot.transactionsById.get(id);
    if (!original) throw new EngineError(ENGINE_ERROR_CODES.NOT_FOUND, 'Transaction not found.', { id });
    return original;
  }

  function requireVoidable(original, verb) {
    if (original.type === T.REVERSAL) {
      throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, `A reversal cannot be ${verb}.`, { id: original.id });
    }
    if (original.lifecycleStatus !== L.POSTED) {
      throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, `Only a posted transaction can be ${verb}.`, {
        id: original.id,
        lifecycleStatus: original.lifecycleStatus,
      });
    }
  }

  function requireNoDependents(original, snapshot) {
    const dependents = findDependents(original, snapshot.transactions);
    if (dependents.length > 0) {
      throw new EngineError(ENGINE_ERROR_CODES.HAS_DEPENDENTS, 'Other posted transactions depend on this one. Void or reverse them first.', {
        id: original.id,
        dependentIds: dependents.map((dependent) => dependent.id),
      });
    }
  }

  async function voidTransaction(id, options = {}) {
    return database.runInTransaction(WRITE_STORES, 'readwrite', async (tx) => {
      const snapshot = await loadSnapshot(tx);
      const reason = requireReason(options.reason);
      const original = requireExisting(snapshot, id);
      requireVoidable(original, 'voided');
      requireNoDependents(original, snapshot);

      const when = nowIso();
      const updated = { ...original, lifecycleStatus: L.VOIDED, voidedAt: when, voidReason: reason };
      await tx.store(S.TRANSACTIONS).put(updated);
      const entry = await audit.write(tx, {
        entity: S.TRANSACTIONS,
        entityId: id,
        action: 'void',
        previousState: original,
        newState: updated,
        reason,
      });

      const effects = interpretTransaction(original, snapshot.lookup).map((effect) =>
        negateEffect(effect, { transactionId: id, occurredAt: when, voided: true })
      );
      const next = snapshot.transactions.map((transaction) => (transaction.id === id ? updated : transaction));
      const stateAfter = deriveState(next, snapshot.accountList);
      return buildResult({ action: 'voided', transaction: updated, effects, stateAfter, audit: [entry] });
    });
  }

  async function reverseTransaction(id, options = {}) {
    return database.runInTransaction(WRITE_STORES, 'readwrite', async (tx) => {
      const snapshot = await loadSnapshot(tx);
      const reason = requireReason(options.reason);
      const original = requireExisting(snapshot, id);
      requireVoidable(original, 'reversed');
      requireNoDependents(original, snapshot);

      const when = nowIso();
      let occurredAt = when;
      if (options.occurredAt !== undefined) {
        try {
          occurredAt = toIso(options.occurredAt);
        } catch {
          throw new ValidationError([{ code: 'OCCURRED_AT_INVALID', field: 'occurredAt', message: 'occurredAt must be a valid date.' }]);
        }
      }
      if (occurredAt < original.occurredAt) {
        throw new ValidationError([{ code: 'REVERSAL_BEFORE_ORIGINAL', field: 'occurredAt', message: 'A reversal cannot happen before the original.' }]);
      }

      const reversal = {
        id: newId(),
        type: T.REVERSAL,
        amount: original.amount,
        occurredAt,
        recordedAt: when,
        lifecycleStatus: L.POSTED,
        confidenceStatus: 'confirmed',
        reconciliationStatus: R.UNRECONCILED,
        reverses: original.id,
        reason,
      };
      const updated = { ...original, lifecycleStatus: L.REVERSED, reversedBy: reversal.id, reversedAt: when };

      await tx.store(S.TRANSACTIONS).add(reversal);
      await tx.store(S.TRANSACTIONS).put(updated);
      const created = await audit.write(tx, {
        entity: S.TRANSACTIONS,
        entityId: reversal.id,
        action: 'create',
        previousState: null,
        newState: reversal,
        reason,
      });
      const changed = await audit.write(tx, {
        entity: S.TRANSACTIONS,
        entityId: id,
        action: 'reverse',
        previousState: original,
        newState: updated,
        reason,
      });

      const next = [...snapshot.transactions.map((transaction) => (transaction.id === id ? updated : transaction)), reversal];
      const effects = interpretTransaction(reversal, (lookupId) => next.find((transaction) => transaction.id === lookupId));
      const stateAfter = deriveState(next, snapshot.accountList);
      return buildResult({ action: 'reversed', transaction: reversal, original: updated, effects, stateAfter, audit: [created, changed] });
    });
  }

  function get(id) {
    return database.runInTransaction([S.TRANSACTIONS], 'readonly', (tx) => tx.store(S.TRANSACTIONS).get(id));
  }

  /** Filters (all optional): type, lifecycleStatus, accountId (any account field), from, to (inclusive). Oldest first. */
  function list(filter = {}) {
    return database.runInTransaction([S.TRANSACTIONS], 'readonly', async (tx) =>
      filterTransactions(await tx.store(S.TRANSACTIONS).getAll(), filter).sort(byOccurredAsc)
    );
  }

  const typed = (type) => (input) => record({ ...(isPlainObject(input) ? input : {}), type });

  return Object.freeze({
    record,
    recordWithin,
    voidTransaction,
    reverseTransaction,
    get,
    list,
    recordIncome: typed(T.INCOME),
    recordExpense: typed(T.EXPENSE),
    recordTransfer: typed(T.TRANSFER),
    recordSavingsDeposit: typed(T.SAVINGS_DEPOSIT),
    recordSavingsWithdrawal: typed(T.SAVINGS_WITHDRAWAL),
    recordLoan: typed(T.LOAN_RECEIVABLE_CREATED),
    recordReceivableSettlement: typed(T.RECEIVABLE_SETTLEMENT),
    recordHeldMoneyReceived: typed(T.MONEY_HELD_FOR_OTHERS),
    recordHeldMoneyReturned: typed(T.RETURN_HELD_MONEY),
    recordAllocationTransfer: typed(T.ALLOCATION_TRANSFER),
    recordRefund: typed(T.REFUND),
    recordAdjustment: typed(T.ADJUSTMENT),
  });
}
