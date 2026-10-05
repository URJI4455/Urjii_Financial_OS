/**
 * Accounts: where money is.
 * Spec section 11. Layer: engine.
 *
 * Accounts are dynamic. They carry NO balance (balances are derived). `kind` is 'standard' or
 * 'savings' and cannot be changed after creation (it decides how past transactions are read).
 * Archiving hides an account from new transactions; its balance still counts in totals.
 */

import { createReferenceData } from './referenceData.js';
import { ACCOUNT_KINDS } from './savings.js';
import { STORE_NAMES as S } from '../db/schema.js';

export function createAccounts(deps) {
  return createReferenceData({
    ...deps,
    storeName: S.ACCOUNTS,
    label: 'Account',
    allowedFields: ['kind'],
    parseExtras(input, errors) {
      const kind = input.kind ?? ACCOUNT_KINDS.STANDARD;
      if (!Object.values(ACCOUNT_KINDS).includes(kind)) {
        errors.push({ code: 'ACCOUNT_KIND_INVALID', field: 'kind', message: 'kind must be "standard" or "savings".' });
      }
      return { kind };
    },
  });
}
