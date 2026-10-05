/**
 * Friendly, plain-language messages for every error the engine and database can raise.
 * Layer: ui. Messages never contain amounts or names (spec section 25).
 * tests/unit/ui/messages.test.js checks that every code used by the engine has a message here.
 */

const ENTITY = { ACCOUNT: 'account', SOURCE: 'source', CATEGORY: 'category', PERSON: 'person', ALLOCATION: 'purpose' };

const fieldWords = (field) =>
  ({
    fromAccountId: 'the account the money comes from',
    toAccountId: 'the account the money goes to',
    accountId: 'an account',
    fromAllocationId: 'where the money is now',
    toAllocationId: 'where the money should go',
  })[field];

const entityMessages = {};
for (const [code, noun] of Object.entries(ENTITY)) {
  entityMessages[`${code}_REQUIRED`] = (field) => `Choose ${fieldWords(field) ?? `a ${noun}`}.`;
  entityMessages[`${code}_NOT_FOUND`] = () => `That ${noun} could not be found. Pick another one.`;
  entityMessages[`${code}_ARCHIVED`] = () => `That ${noun} has been archived. Pick another one or restore it in Settings.`;
}

const MESSAGES = {
  ...entityMessages,
  INPUT_INVALID: 'Something is missing from this form.',
  TYPE_NOT_RECORDABLE: 'This kind of entry cannot be created directly.',
  TYPE_UNKNOWN: 'This kind of entry is not supported.',
  UNKNOWN_FIELD: 'The form sent something unexpected. Please reload the app and try again.',
  AMOUNT_REQUIRED: 'Enter an amount.',
  AMOUNT_INVALID: 'Enter an amount like 250 or 1,250.50.',
  AMOUNT_NOT_POSITIVE: 'Enter an amount greater than zero.',
  EXPECTED_AMOUNT_REQUIRED: 'Enter the total you expected.',
  EXPECTED_AMOUNT_INVALID: 'Enter the expected total like 7,500.',
  EXPECTED_AMOUNT_NOT_POSITIVE: 'The expected total must be greater than zero.',
  OCCURRED_AT_INVALID: 'Choose a valid date.',
  CONFIDENCE_STATUS_INVALID: 'Choose how sure you are about this entry.',
  ID_INVALID: 'This entry has an invalid reference. Please try again.',
  DUPLICATE_ID: 'This has already been saved.',
  NOTE_INVALID: 'The note must be plain text.',
  REASON_REQUIRED: 'Please write a short reason. It is kept in the history.',
  EXPECTATION_INVALID: 'Choose which expected payment this belongs to.',
  EXPECTATION_ALREADY_DEFINED: 'That expected payment already has a total. Leave the expected total empty.',
  EXPECTATION_NOT_FOUND: 'That expected payment could not be found.',
  EXPECTATION_SOURCE_MISMATCH: 'This payment comes from a different source than the expected one.',
  SAME_ACCOUNT: 'Choose two different accounts.',
  SAVINGS_TYPE_REQUIRED: 'Use "put money into savings" or "take money out of savings" for savings accounts.',
  SAVINGS_TARGET_NOT_SAVINGS_ACCOUNT: 'Choose a savings account to put the money into.',
  SAVINGS_SOURCE_IS_SAVINGS_ACCOUNT: 'The money must come from an everyday account, not from savings.',
  SAVINGS_SOURCE_NOT_SAVINGS_ACCOUNT: 'Choose a savings account to take the money out of.',
  SAVINGS_TARGET_IS_SAVINGS_ACCOUNT: 'The money must go to an everyday account.',
  RECEIVABLE_NOT_FOUND: 'Choose which loan this payment is for.',
  RECEIVABLE_NOT_ACTIVE: 'That loan was cancelled, so it cannot be paid back.',
  OVERPAYMENT: 'That is more than is still owed. Enter the remaining amount or less.',
  PERSON_MISMATCH: 'That person does not match the loan.',
  HELD_MONEY_NOT_FOUND: 'Choose whose money you are giving back.',
  HELD_MONEY_NOT_ACTIVE: 'That record was cancelled, so nothing can be given back.',
  OVER_RETURN: 'That is more than you are holding. Enter the remaining amount or less.',
  SAME_ALLOCATION: 'Choose two different places for the money.',
  REFUND_TARGET_NOT_FOUND: 'Choose which purchase was refunded.',
  REFUND_TARGET_NOT_ACTIVE: 'That purchase was cancelled, so it cannot be refunded.',
  REFUND_EXCEEDS_ORIGINAL: 'That is more than can still be refunded for this purchase.',
  ADJUSTMENT_DIRECTION_INVALID: 'Choose whether the balance goes up or down.',
  REVERSAL_BEFORE_ORIGINAL: 'The undo cannot be dated before the original entry.',
  NAME_REQUIRED: 'Enter a name.',
  NAME_TOO_LONG: 'That name is too long. Please shorten it.',
  ACCOUNT_KIND_INVALID: 'Choose what kind of account this is.',
  PARENT_INVALID: 'Choose a valid group.',
  PARENT_NOT_FOUND: 'That group could not be found.',
  ORDER_INVALID: 'The order could not be saved. Please try again.',
  PERIOD_INVALID: 'Choose a start date that is before the end date.',
  ACTUAL_AMOUNT_INVALID: 'Enter the balance your account really shows, like 1,941.00.',
  SETTING_UNKNOWN: 'That setting does not exist.',
  SETTING_INVALID: 'That value is not allowed. Use up to 8 characters, for example ETB.',
  TITLE_REQUIRED: 'Enter a title.',
  TITLE_TOO_LONG: 'That title is too long. Please shorten it.',
  BODY_INVALID: 'The text must be plain text.',
  BODY_TOO_LONG: 'That text is too long. Please shorten it.',
  NOTHING_TO_UPDATE: 'Nothing was changed.',
};

const ENGINE_MESSAGES = {
  ENTITY_NOT_FOUND: 'That item no longer exists. Reload the page and try again.',
  STATE_NOT_ALLOWED: 'That cannot be done in the current state of this item. It may already have been changed.',
  HAS_DEPENDENTS: (error) => {
    const count = error?.details?.dependentIds?.length ?? 0;
    return count > 1
      ? `${count} other entries depend on this one. Cancel or undo those first, then try again.`
      : 'Another entry depends on this one. Cancel or undo that one first, then try again.';
  },
  LEDGER_CORRUPT: 'Something in your records looks inconsistent. Export a backup and check the history in Settings.',
  VALIDATION_FAILED: 'Please check the highlighted fields.',
  ENGINE_CONFIG_INVALID: 'The app could not start correctly. Please reload.',
};

const DB_MESSAGES = {
  DB_UNAVAILABLE: 'Your browser is not allowing this app to store data on this device. Private browsing or a restrictive setting may be the cause.',
  DB_VERSION_DOWNGRADE: 'Your stored data was written by a newer version of this app. Reload the page to get the latest version.',
  DB_UPGRADE_FAILED: 'The app could not update your stored data. Nothing was lost. Reload and try again.',
  DB_SCHEMA_CONFLICT: 'Your stored data does not match what the app expects. Nothing was changed. Please contact support before continuing.',
  DB_INVALID_CONFIG: 'The app is not set up correctly. Please reload.',
  DB_INVALID_ARGUMENT: 'Something could not be saved because of an invalid value.',
  DB_NOT_FOUND: 'Something the app needs is missing from the stored data.',
  DB_CONSTRAINT_VIOLATION: 'That has already been saved.',
  DB_QUOTA_EXCEEDED: 'This device is out of storage space. Nothing was saved. Free some space and try again.',
  DB_READ_ONLY: 'The app tried to save in the wrong mode. Nothing was saved.',
  DB_TRANSACTION_INACTIVE: 'The save was interrupted. Nothing was saved. Please try again.',
  DB_INVALID_STATE: 'The connection to your stored data was closed. Reload the page.',
  DB_ABORTED: 'The save was interrupted. Nothing was saved. Please try again.',
  DB_UNKNOWN: 'Something went wrong while saving. Nothing was saved.',
};

export const KNOWN_VALIDATION_CODES = Object.freeze(Object.keys(MESSAGES));
export const KNOWN_ENGINE_CODES = Object.freeze(Object.keys(ENGINE_MESSAGES));
export const KNOWN_DB_CODES = Object.freeze(Object.keys(DB_MESSAGES));

const resolve = (entry, ...args) => (typeof entry === 'function' ? entry(...args) : entry);

/**
 * -> { title, message, fieldErrors: { [field]: text }, general: [text], fatal }
 * `fieldErrors` map straight onto form fields (the form field names are the engine field names).
 */
export function friendlyError(error) {
  const result = { title: 'Nothing was saved', message: 'Something went wrong. Nothing was saved.', fieldErrors: {}, general: [], fatal: false };

  if (error?.name === 'ValidationError' && Array.isArray(error.errors)) {
    for (const entry of error.errors) {
      const text = resolve(MESSAGES[entry.code], entry.field) ?? 'This value is not valid.';
      if (entry.field && !(entry.field in result.fieldErrors)) result.fieldErrors[entry.field] = text;
      else if (!entry.field) result.general.push(text);
    }
    result.message = result.general[0] ?? Object.values(result.fieldErrors)[0] ?? result.message;
    return result;
  }

  if (typeof error?.code === 'string' && error.code in ENGINE_MESSAGES) {
    result.message = resolve(ENGINE_MESSAGES[error.code], error);
    return result;
  }

  if (typeof error?.code === 'string' && error.code in DB_MESSAGES) {
    result.message = DB_MESSAGES[error.code];
    result.fatal = ['DB_UNAVAILABLE', 'DB_VERSION_DOWNGRADE', 'DB_UPGRADE_FAILED', 'DB_SCHEMA_CONFLICT', 'DB_INVALID_STATE'].includes(error.code);
    result.title = result.fatal ? 'The app cannot open your data' : result.title;
    return result;
  }

  return result;
}
