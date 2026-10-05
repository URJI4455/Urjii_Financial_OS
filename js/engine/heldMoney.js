/**
 * Money held for others (a liability, never the user's income).
 * Spec section 13. Layer: engine (pure).
 */

import { TRANSACTION_TYPES as T } from '../config/constants.js';
import { EFFECT_KINDS } from './transactionTypes.js';
import { agreementStatement, deriveOutstanding } from './agreements.js';

export const deriveHeldMoney = (effects) => deriveOutstanding(effects, EFFECT_KINDS.HELD_MONEY);

/** Original, returned and remaining amount, person, account and history. Returns null if unknown. */
export function heldMoneyStatement(agreementId, transactions) {
  const statement = agreementStatement({
    agreementId,
    agreementType: T.MONEY_HELD_FOR_OTHERS,
    childType: T.RETURN_HELD_MONEY,
    childField: 'heldMoneyId',
    effectKind: EFFECT_KINDS.HELD_MONEY,
    transactions,
  });
  if (!statement) return null;
  const { settledAmount, ...rest } = statement;
  return { ...rest, returnedAmount: settledAmount };
}
