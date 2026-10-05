/**
 * Database error model.
 * Layer: db (imports nothing).
 *
 * Every failure leaving the db layer is a DbError with a stable `code`.
 * Messages are generic on purpose: they may name a store or index but NEVER contain record
 * contents, amounts or names (spec section 25). The original error is kept on `cause`.
 */

export const DB_ERROR_CODES = Object.freeze({
  UNAVAILABLE: 'DB_UNAVAILABLE',
  VERSION_DOWNGRADE: 'DB_VERSION_DOWNGRADE',
  UPGRADE_FAILED: 'DB_UPGRADE_FAILED',
  SCHEMA_CONFLICT: 'DB_SCHEMA_CONFLICT',
  INVALID_CONFIG: 'DB_INVALID_CONFIG',
  INVALID_ARGUMENT: 'DB_INVALID_ARGUMENT',
  NOT_FOUND: 'DB_NOT_FOUND',
  CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  QUOTA_EXCEEDED: 'DB_QUOTA_EXCEEDED',
  READ_ONLY: 'DB_READ_ONLY',
  TRANSACTION_INACTIVE: 'DB_TRANSACTION_INACTIVE',
  INVALID_STATE: 'DB_INVALID_STATE',
  ABORTED: 'DB_ABORTED',
  UNKNOWN: 'DB_UNKNOWN',
});

export class DbError extends Error {
  constructor(code, message, { cause, context } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'DbError';
    this.code = code;
    this.context = context ?? null;
  }
}

const MESSAGES = Object.freeze({
  [DB_ERROR_CODES.UNAVAILABLE]: 'IndexedDB is not available in this environment.',
  [DB_ERROR_CODES.VERSION_DOWNGRADE]: 'The stored database is newer than this version of the app. Reload the app to get the latest version.',
  [DB_ERROR_CODES.UPGRADE_FAILED]: 'The database upgrade failed and was rolled back. Existing data is unchanged.',
  [DB_ERROR_CODES.SCHEMA_CONFLICT]: 'The stored database structure conflicts with the expected one. The upgrade was rolled back.',
  [DB_ERROR_CODES.INVALID_CONFIG]: 'The database configuration is invalid.',
  [DB_ERROR_CODES.INVALID_ARGUMENT]: 'The database operation received an invalid argument or an unstorable value.',
  [DB_ERROR_CODES.NOT_FOUND]: 'The requested store or index does not exist.',
  [DB_ERROR_CODES.CONSTRAINT_VIOLATION]: 'A record with the same key already exists, or a unique constraint was violated.',
  [DB_ERROR_CODES.QUOTA_EXCEEDED]: 'Not enough storage space. Nothing was saved.',
  [DB_ERROR_CODES.READ_ONLY]: 'A write was attempted in a read-only transaction.',
  [DB_ERROR_CODES.TRANSACTION_INACTIVE]: 'The transaction is no longer active. Only await database operations inside a transaction.',
  [DB_ERROR_CODES.INVALID_STATE]: 'The database connection is closed or in an invalid state.',
  [DB_ERROR_CODES.ABORTED]: 'The transaction was aborted. No changes were saved.',
  [DB_ERROR_CODES.UNKNOWN]: 'An unexpected database error occurred.',
});

const CODE_BY_DOM_ERROR_NAME = Object.freeze({
  VersionError: DB_ERROR_CODES.VERSION_DOWNGRADE,
  ConstraintError: DB_ERROR_CODES.CONSTRAINT_VIOLATION,
  QuotaExceededError: DB_ERROR_CODES.QUOTA_EXCEEDED,
  ReadOnlyError: DB_ERROR_CODES.READ_ONLY,
  TransactionInactiveError: DB_ERROR_CODES.TRANSACTION_INACTIVE,
  InvalidStateError: DB_ERROR_CODES.INVALID_STATE,
  NotFoundError: DB_ERROR_CODES.NOT_FOUND,
  DataError: DB_ERROR_CODES.INVALID_ARGUMENT,
  DataCloneError: DB_ERROR_CODES.INVALID_ARGUMENT,
  AbortError: DB_ERROR_CODES.ABORTED,
});

export function createDbError(code, { cause, context } = {}) {
  const suffix = context ? ` (${context})` : '';
  return new DbError(code, `${MESSAGES[code] ?? MESSAGES[DB_ERROR_CODES.UNKNOWN]}${suffix}`, { cause, context });
}

/** Convert anything thrown by IndexedDB into a DbError. DbErrors pass through unchanged. */
export function toDbError(error, { context, fallbackCode = DB_ERROR_CODES.UNKNOWN } = {}) {
  if (error instanceof DbError) return error;
  const code = CODE_BY_DOM_ERROR_NAME[error?.name] ?? fallbackCode;
  return createDbError(code, { cause: error, context });
}
