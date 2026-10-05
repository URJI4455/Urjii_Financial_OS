/**
 * Shared constants for Urji Finance OS.
 *
 * Layer: config (bottom of the stack; imports nothing; importable by every layer).
 *
 * Every enumeration below is taken directly from the governing specification.
 * Do NOT add or rename values without recording a decision in project/DECISIONS.md.
 * The string values are PROVISIONAL until the IndexedDB schema is finalised (see DECISIONS.md, ADR-005).
 */

export const APP_INFO = Object.freeze({
  name: 'Urji Finance OS',
  shortName: 'Urji Finance',
  projectName: 'urji-finance-os',
  tagline: 'Your personal financial operating system.',
});

/** Spec section 7 - minimum supported transaction types (plus REVERSAL, ADR-010). */
export const TRANSACTION_TYPES = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  SAVINGS_DEPOSIT: 'savings_deposit',
  SAVINGS_WITHDRAWAL: 'savings_withdrawal',
  LOAN_RECEIVABLE_CREATED: 'loan_receivable_created',
  RECEIVABLE_SETTLEMENT: 'receivable_settlement',
  MONEY_HELD_FOR_OTHERS: 'money_held_for_others',
  RETURN_HELD_MONEY: 'return_held_money',
  ALLOCATION_TRANSFER: 'allocation_transfer',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  // Added by ADR-010: a reversal is a new linked transaction (spec section 9, OPEN-007).
  REVERSAL: 'reversal',
});

/** Spec section 8 - lifecycle status (separate dimension). */
export const LIFECYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  POSTED: 'posted',
  VOIDED: 'voided',
  REVERSED: 'reversed',
});

/** Spec section 8 - confidence status (separate dimension). */
export const CONFIDENCE_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  ESTIMATED: 'estimated',
  RECONSTRUCTED: 'reconstructed',
});

/** Spec section 8 - reconciliation status (separate dimension). */
export const RECONCILIATION_STATUS = Object.freeze({
  UNRECONCILED: 'unreconciled',
  MATCHED: 'matched',
  DISCREPANCY: 'discrepancy',
});
