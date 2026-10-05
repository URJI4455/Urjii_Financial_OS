/**
 * Transaction input validation and normalisation.
 * Spec sections 7, 8, 27. Layer: engine (pure; works on a snapshot context).
 *
 * Collects EVERY problem (not just the first) and throws one ValidationError.
 * Only fields the type allows are accepted; defaults are filled so the stored record is explicit.
 *
 * ctx: { nowIso, transactionsById, accounts, people, sources, allocations, categories, state, effects }
 */

import { CONFIDENCE_STATUS, TRANSACTION_TYPES as T } from '../config/constants.js';
import { ValidationError } from './errors.js';
import { ADJUSTMENT_DIRECTIONS, COMMON_FIELDS, EFFECT_KINDS, TYPE_FIELDS } from './transactionTypes.js';
import { ACCOUNT_KINDS } from './savings.js';
import { isPlainObject } from './util.js';
import { toIso } from './time.js';

const CONFIDENCE_VALUES = new Set(Object.values(CONFIDENCE_STATUS));

export function validateTransactionInput(input, ctx) {
  if (!isPlainObject(input)) {
    throw new ValidationError([{ code: 'INPUT_INVALID', field: null, message: 'Transaction input must be an object.' }]);
  }
  if (input.type === T.REVERSAL) {
    throw new ValidationError([{ code: 'TYPE_NOT_RECORDABLE', field: 'type', message: 'Use reverseTransaction to create a reversal.' }]);
  }
  if (typeof input.type !== 'string' || !Object.hasOwn(TYPE_FIELDS, input.type)) {
    throw new ValidationError([{ code: 'TYPE_UNKNOWN', field: 'type', message: 'Unknown transaction type.' }]);
  }

  const type = input.type;
  const errors = [];
  const add = (code, field, message) => errors.push({ code, field, message });

  // ---- helpers bound to this validation run
  const lookup = (collection, value, field, entity) => {
    if (value === undefined || value === null || value === '') {
      add(`${entity}_REQUIRED`, field, `${field} is required.`);
      return null;
    }
    const record = typeof value === 'string' ? collection.get(value) : undefined;
    if (!record) {
      add(`${entity}_NOT_FOUND`, field, `${field} does not refer to an existing record.`);
      return null;
    }
    if (record.archived) {
      add(`${entity}_ARCHIVED`, field, `${field} refers to an archived record.`);
      return null;
    }
    return record;
  };

  const checkAmount = (value, field, prefix) => {
    if (value === undefined) {
      add(`${prefix}_REQUIRED`, field, `${field} is required.`);
      return false;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      add(`${prefix}_INVALID`, field, `${field} must be a whole number of minor units.`);
      return false;
    }
    if (value <= 0) {
      add(`${prefix}_NOT_POSITIVE`, field, `${field} must be greater than zero.`);
      return false;
    }
    return true;
  };

  /** Optional allocation: undefined -> fallback, null -> unallocated, id -> must exist and be active. */
  const optionalAllocation = (value, field, fallback) => {
    if (value === undefined) return fallback;
    if (value === null) return null;
    return lookup(ctx.allocations, value, field, 'ALLOCATION') ? value : fallback;
  };

  /** Required allocation endpoint: must be given; null means unallocated. */
  const requiredAllocation = (value, field) => {
    if (value === undefined) {
      add('ALLOCATION_REQUIRED', field, `${field} is required (use null for unallocated).`);
      return undefined;
    }
    if (value === null) return null;
    return lookup(ctx.allocations, value, field, 'ALLOCATION') ? value : undefined;
  };

  const account = (value, field = 'accountId') => lookup(ctx.accounts, value, field, 'ACCOUNT');

  // ---- common fields
  const allowed = new Set([...COMMON_FIELDS, ...TYPE_FIELDS[type]]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) add('UNKNOWN_FIELD', key, `${key} is not a valid field for this transaction type.`);
  }

  const amountOk = checkAmount(input.amount, 'amount', 'AMOUNT');

  let occurredAt = ctx.nowIso;
  if (input.occurredAt !== undefined) {
    const usable = typeof input.occurredAt === 'string' || typeof input.occurredAt === 'number' || input.occurredAt instanceof Date;
    try {
      if (!usable) throw new RangeError('bad type');
      occurredAt = toIso(input.occurredAt);
    } catch {
      add('OCCURRED_AT_INVALID', 'occurredAt', 'occurredAt must be a valid date.');
    }
  }

  let confidenceStatus = CONFIDENCE_STATUS.CONFIRMED;
  if (input.confidenceStatus !== undefined) {
    if (CONFIDENCE_VALUES.has(input.confidenceStatus)) confidenceStatus = input.confidenceStatus;
    else add('CONFIDENCE_STATUS_INVALID', 'confidenceStatus', 'Unknown confidence status.');
  }

  if (typeof input.id !== 'string' || input.id === '') {
    add('ID_INVALID', 'id', 'id must be a non-empty string.');
  } else if (ctx.transactionsById.has(input.id)) {
    add('DUPLICATE_ID', 'id', 'A transaction with this id already exists.');
  }

  const out = { id: input.id, type, amount: input.amount, occurredAt, confidenceStatus };

  if (input.note !== undefined) {
    if (typeof input.note === 'string') out.note = input.note;
    else add('NOTE_INVALID', 'note', 'note must be text.');
  }
  if (input.reason !== undefined) {
    if (typeof input.reason === 'string' && input.reason.trim() !== '') out.reason = input.reason.trim();
    else add('REASON_REQUIRED', 'reason', 'reason must be non-empty text.');
  }

  // ---- type-specific rules
  switch (type) {
    case T.INCOME: {
      account(input.accountId);
      lookup(ctx.sources, input.sourceId, 'sourceId', 'SOURCE');
      out.accountId = input.accountId;
      out.sourceId = input.sourceId;
      out.allocationId = optionalAllocation(input.allocationId, 'allocationId', null);

      const hasExpected = input.expectedAmount !== undefined;
      if (hasExpected) checkAmount(input.expectedAmount, 'expectedAmount', 'EXPECTED_AMOUNT');
      const group = input.expectationId === undefined ? undefined : ctx.state.income.expectations[input.expectationId];

      if (input.expectationId !== undefined && (typeof input.expectationId !== 'string' || input.expectationId === '')) {
        add('EXPECTATION_INVALID', 'expectationId', 'expectationId must be a non-empty string.');
      } else if (hasExpected) {
        if (group) add('EXPECTATION_ALREADY_DEFINED', 'expectedAmount', 'This expectation already has an expected amount.');
        out.expectedAmount = input.expectedAmount;
        out.expectationId = input.expectationId ?? input.id;
      } else if (input.expectationId !== undefined) {
        if (!group) add('EXPECTATION_NOT_FOUND', 'expectationId', 'No such expected income.');
        else if (group.sourceId !== input.sourceId) add('EXPECTATION_SOURCE_MISMATCH', 'sourceId', 'Source differs from the expected income.');
        out.expectationId = input.expectationId;
      }
      break;
    }

    case T.EXPENSE: {
      account(input.accountId);
      lookup(ctx.categories, input.categoryId, 'categoryId', 'CATEGORY');
      out.accountId = input.accountId;
      out.categoryId = input.categoryId;
      out.allocationId = optionalAllocation(input.allocationId, 'allocationId', null);
      break;
    }

    case T.TRANSFER:
    case T.SAVINGS_DEPOSIT:
    case T.SAVINGS_WITHDRAWAL: {
      const from = account(input.fromAccountId, 'fromAccountId');
      const to = account(input.toAccountId, 'toAccountId');
      out.fromAccountId = input.fromAccountId;
      out.toAccountId = input.toAccountId;
      if (from && to && from.id === to.id) add('SAME_ACCOUNT', 'toAccountId', 'Source and destination accounts must differ.');

      if (from && to && from.id !== to.id) {
        const fromSavings = from.kind === ACCOUNT_KINDS.SAVINGS;
        const toSavings = to.kind === ACCOUNT_KINDS.SAVINGS;
        if (type === T.TRANSFER && fromSavings !== toSavings) {
          add('SAVINGS_TYPE_REQUIRED', 'type', 'Moving money into or out of a savings account needs a savings deposit or withdrawal.');
        }
        if (type === T.SAVINGS_DEPOSIT) {
          if (!toSavings) add('SAVINGS_TARGET_NOT_SAVINGS_ACCOUNT', 'toAccountId', 'A savings deposit must go to a savings account.');
          if (fromSavings) add('SAVINGS_SOURCE_IS_SAVINGS_ACCOUNT', 'fromAccountId', 'A savings deposit cannot come from a savings account.');
        }
        if (type === T.SAVINGS_WITHDRAWAL) {
          if (!fromSavings) add('SAVINGS_SOURCE_NOT_SAVINGS_ACCOUNT', 'fromAccountId', 'A savings withdrawal must come from a savings account.');
          if (toSavings) add('SAVINGS_TARGET_IS_SAVINGS_ACCOUNT', 'toAccountId', 'A savings withdrawal cannot go to a savings account.');
        }
      }
      break;
    }

    case T.LOAN_RECEIVABLE_CREATED: {
      account(input.accountId);
      lookup(ctx.people, input.personId, 'personId', 'PERSON');
      out.accountId = input.accountId;
      out.personId = input.personId;
      out.allocationId = optionalAllocation(input.allocationId, 'allocationId', null);
      break;
    }

    case T.RECEIVABLE_SETTLEMENT: {
      account(input.accountId);
      out.accountId = input.accountId;
      const loan = ctx.transactionsById.get(input.receivableId);
      if (!loan || loan.type !== T.LOAN_RECEIVABLE_CREATED) {
        add('RECEIVABLE_NOT_FOUND', 'receivableId', 'No such loan.');
        out.receivableId = input.receivableId;
      } else if (loan.lifecycleStatus !== 'posted') {
        add('RECEIVABLE_NOT_ACTIVE', 'receivableId', 'This loan was voided or reversed.');
      } else {
        const remaining = ctx.state.receivables.byAgreement[loan.id]?.remaining ?? 0;
        if (amountOk && input.amount > remaining) add('OVERPAYMENT', 'amount', 'The settlement is larger than the amount still owed.');
        if (input.personId !== undefined && input.personId !== loan.personId) {
          add('PERSON_MISMATCH', 'personId', 'The person differs from the one who owes this loan.');
        }
        out.receivableId = loan.id;
        out.personId = loan.personId;
        out.allocationId = optionalAllocation(input.allocationId, 'allocationId', loan.allocationId ?? null);
      }
      break;
    }

    case T.MONEY_HELD_FOR_OTHERS: {
      account(input.accountId);
      lookup(ctx.people, input.personId, 'personId', 'PERSON');
      out.accountId = input.accountId;
      out.personId = input.personId;
      break;
    }

    case T.RETURN_HELD_MONEY: {
      account(input.accountId);
      out.accountId = input.accountId;
      const held = ctx.transactionsById.get(input.heldMoneyId);
      if (!held || held.type !== T.MONEY_HELD_FOR_OTHERS) {
        add('HELD_MONEY_NOT_FOUND', 'heldMoneyId', 'No such held-money record.');
        out.heldMoneyId = input.heldMoneyId;
      } else if (held.lifecycleStatus !== 'posted') {
        add('HELD_MONEY_NOT_ACTIVE', 'heldMoneyId', 'This held-money record was voided or reversed.');
      } else {
        const remaining = ctx.state.heldMoney.byAgreement[held.id]?.remaining ?? 0;
        if (amountOk && input.amount > remaining) add('OVER_RETURN', 'amount', 'More than the amount still held was returned.');
        if (input.personId !== undefined && input.personId !== held.personId) {
          add('PERSON_MISMATCH', 'personId', 'The person differs from the one whose money is held.');
        }
        out.heldMoneyId = held.id;
        out.personId = held.personId;
      }
      break;
    }

    case T.ALLOCATION_TRANSFER: {
      const from = requiredAllocation(input.fromAllocationId, 'fromAllocationId');
      const to = requiredAllocation(input.toAllocationId, 'toAllocationId');
      out.fromAllocationId = from;
      out.toAllocationId = to;
      if (input.fromAllocationId !== undefined && input.toAllocationId !== undefined && input.fromAllocationId === input.toAllocationId) {
        add('SAME_ALLOCATION', 'toAllocationId', 'Source and destination allocations must differ.');
      }
      break;
    }

    case T.REFUND: {
      const original = ctx.transactionsById.get(input.refundOf);
      if (!original || original.type !== T.EXPENSE) {
        add('REFUND_TARGET_NOT_FOUND', 'refundOf', 'A refund must refer to an existing expense.');
        break;
      }
      if (original.lifecycleStatus !== 'posted') {
        add('REFUND_TARGET_NOT_ACTIVE', 'refundOf', 'The expense was voided or reversed.');
        break;
      }
      const refunded = -ctx.effects
        .filter((effect) => effect.kind === EFFECT_KINDS.EXPENSE && effect.refundOf === original.id)
        .reduce((sum, effect) => sum + effect.amount, 0);
      if (amountOk && input.amount > original.amount - refunded) {
        add('REFUND_EXCEEDS_ORIGINAL', 'amount', 'The refund is larger than the amount of the expense not yet refunded.');
      }
      const accountId = input.accountId ?? original.accountId;
      account(accountId);
      out.refundOf = original.id;
      out.accountId = accountId;
      out.categoryId = original.categoryId;
      out.allocationId = optionalAllocation(input.allocationId, 'allocationId', original.allocationId ?? null);
      break;
    }

    case T.ADJUSTMENT: {
      account(input.accountId);
      out.accountId = input.accountId;
      if (!Object.values(ADJUSTMENT_DIRECTIONS).includes(input.direction)) {
        add('ADJUSTMENT_DIRECTION_INVALID', 'direction', 'direction must be "increase" or "decrease".');
      }
      out.direction = input.direction;
      if (out.reason === undefined && !errors.some((error) => error.field === 'reason')) {
        add('REASON_REQUIRED', 'reason', 'An adjustment needs a reason.');
      }
      out.allocationId = optionalAllocation(input.allocationId, 'allocationId', null);
      break;
    }

    default:
      break;
  }

  if (errors.length > 0) throw new ValidationError(errors);
  return out;
}

/** void / reverse need a written reason (spec section 10). */
export function requireReason(reason) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new ValidationError([{ code: 'REASON_REQUIRED', field: 'reason', message: 'A reason is required.' }]);
  }
  return reason.trim();
}
