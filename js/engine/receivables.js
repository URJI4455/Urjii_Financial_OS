/**
 * Receivables (money other people owe the user).
 * Spec section 14. Layer: engine (pure).
 *
 * A loan creates a receivable and is NOT an expense. Settlements (including partial ones)
 * reduce it. Outstanding amounts are derived from the ledger, never stored.
 */

import { TRANSACTION_TYPES as T } from '../config/constants.js';
import { EFFECT_KINDS } from './transactionTypes.js';
import { agreementStatement, deriveOutstanding } from './agreements.js';

export const deriveReceivables = (effects) => deriveOutstanding(effects, EFFECT_KINDS.RECEIVABLE);

/** Original, settled and remaining amount for one loan, with its history. Returns null if unknown. */
export function receivableStatement(agreementId, transactions) {
  return agreementStatement({
    agreementId,
    agreementType: T.LOAN_RECEIVABLE_CREATED,
    childType: T.RECEIVABLE_SETTLEMENT,
    childField: 'receivableId',
    effectKind: EFFECT_KINDS.RECEIVABLE,
    transactions,
  });
}
