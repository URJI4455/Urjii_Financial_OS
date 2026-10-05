/**
 * Read-only queries over the derived state.
 * Layer: engine. Every call reads one consistent snapshot and derives everything from the ledger.
 */

import { READ_STORES, loadSnapshot } from './snapshot.js';
import { deriveState, publicState, verifyInvariants } from './financialPosition.js';
import { deriveAccountMovement, deriveIncomeTotals, deriveSpending } from './reporting.js';
import { receivableStatement } from './receivables.js';
import { heldMoneyStatement } from './heldMoney.js';
import { contributes } from './balances.js';
import { EFFECT_KINDS, interpretTransaction, summarizeMeaning } from './transactionTypes.js';
import { ValidationError } from './errors.js';
import { byOccurredAsc, filterTransactions } from './queries.js';
import { toIso } from './time.js';
import { TRANSACTION_TYPES as T } from '../config/constants.js';

const optionalIso = (value) => (value === undefined || value === null ? null : toIso(value));

export function createReadModel({ database }) {
  const read = (work) => database.runInTransaction(READ_STORES, 'readonly', async (tx) => work(await loadSnapshot(tx)));

  const statements = (snapshot, agreementType, byAgreement, build, { includeSettled = false, personId } = {}) =>
    snapshot.transactions
      .filter((t) => t.type === agreementType && t.lifecycleStatus === 'posted')
      .filter((t) => personId === undefined || t.personId === personId)
      .filter((t) => includeSettled || byAgreement[t.id] !== undefined)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map((t) => build(t.id, snapshot.transactions));

  return Object.freeze({
    /** Full derived state; pass { asOf } to reconstruct the position at a point in time (by occurredAt). */
    get: ({ asOf } = {}) =>
      read((snapshot) => publicState(deriveState(snapshot.transactions, snapshot.accountList, { asOf: optionalIso(asOf) }))),

    /** Empty list = every invariant holds. */
    verify: () => read((snapshot) => verifyInvariants(snapshot.state)),

    accountBalance: (accountId) => read((snapshot) => snapshot.state.accounts[accountId] ?? 0),

    receivableStatement: (agreementId) => read((snapshot) => receivableStatement(agreementId, snapshot.transactions)),
    outstandingReceivables: ({ personId } = {}) =>
      read((snapshot) => statements(snapshot, T.LOAN_RECEIVABLE_CREATED, snapshot.state.receivables.byAgreement, receivableStatement, { personId })),
    /** Every live loan; pass { includeSettled: true } to include fully repaid ones. */
    receivableStatements: (options = {}) =>
      read((snapshot) => statements(snapshot, T.LOAN_RECEIVABLE_CREATED, snapshot.state.receivables.byAgreement, receivableStatement, options)),

    heldMoneyStatement: (agreementId) => read((snapshot) => heldMoneyStatement(agreementId, snapshot.transactions)),
    outstandingHeldMoney: ({ personId } = {}) =>
      read((snapshot) => statements(snapshot, T.MONEY_HELD_FOR_OTHERS, snapshot.state.heldMoney.byAgreement, heldMoneyStatement, { personId })),
    heldMoneyStatements: (options = {}) =>
      read((snapshot) => statements(snapshot, T.MONEY_HELD_FOR_OTHERS, snapshot.state.heldMoney.byAgreement, heldMoneyStatement, options)),

    incomeSummary: () => read((snapshot) => snapshot.state.income),

    /** Net spending, optionally within [from, to] (inclusive). */
    spending: ({ from, to } = {}) =>
      read((snapshot) => deriveSpending(snapshot.effects, { from: optionalIso(from), to: optionalIso(to) })),

    /**
     * Transactions newest first, each with its economic meaning and money flow ('in' | 'out' | 'neutral' | 'none').
     * Filters: type, lifecycleStatus, accountId, from, to. Voided entries have no meaning (they contribute nothing).
     */
    transactions: (filter = {}) =>
      read((snapshot) =>
        filterTransactions(snapshot.transactions, filter)
          .sort((a, b) => -byOccurredAsc(a, b))
          .map((transaction) => {
            const meaning = contributes(transaction)
              ? summarizeMeaning(transaction.type, interpretTransaction(transaction, snapshot.lookup))
              : null;
            const flow = !meaning ? 'none' : meaning.liquidMoneyChange > 0 ? 'in' : meaning.liquidMoneyChange < 0 ? 'out' : 'neutral';
            return { transaction, meaning, flow };
          })
      ),

    /** Expenses that can still be (partly) refunded, with the amount still refundable. Newest first. */
    refundableExpenses: () =>
      read((snapshot) => {
        const refunded = new Map();
        for (const effect of snapshot.effects) {
          if (effect.kind === EFFECT_KINDS.EXPENSE && effect.refundOf) {
            refunded.set(effect.refundOf, (refunded.get(effect.refundOf) ?? 0) - effect.amount);
          }
        }
        return snapshot.transactions
          .filter((t) => t.type === T.EXPENSE && t.lifecycleStatus === 'posted')
          .map((expense) => ({ expense, refundableAmount: expense.amount - (refunded.get(expense.id) ?? 0) }))
          .filter((entry) => entry.refundableAmount > 0)
          .sort((a, b) => -byOccurredAsc(a.expense, b.expense));
      }),

    /** What happened between two moments: income, spending, account movement, opening and closing position. */
    periodReport: ({ from, to } = {}) =>
      read((snapshot) => {
        let fromIso;
        let toIsoValue;
        try {
          fromIso = toIso(from);
          toIsoValue = toIso(to);
        } catch {
          throw new ValidationError([{ code: 'PERIOD_INVALID', field: 'from', message: 'Both ends of the period must be valid dates.' }]);
        }
        if (fromIso > toIsoValue) {
          throw new ValidationError([{ code: 'PERIOD_INVALID', field: 'to', message: 'The period ends before it starts.' }]);
        }
        const range = { from: fromIso, to: toIsoValue };
        const income = deriveIncomeTotals(snapshot.effects, range);
        const spending = deriveSpending(snapshot.effects, range);
        const openingAsOf = new Date(Date.parse(fromIso) - 1).toISOString();
        return {
          from: fromIso,
          to: toIsoValue,
          income,
          spending,
          incomeMinusSpending: income.total - spending.total,
          accountMovement: deriveAccountMovement(snapshot.effects, range),
          opening: deriveState(snapshot.transactions, snapshot.accountList, { asOf: openingAsOf }).totals,
          closing: deriveState(snapshot.transactions, snapshot.accountList, { asOf: toIsoValue }).totals,
        };
      }),
  });
}
