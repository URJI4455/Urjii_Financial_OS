/**
 * Engine error model.
 * Layer: engine.
 *
 * Expected business failures (invalid input, overpayment, blocked void...) are thrown as
 * EngineError / ValidationError so the surrounding database transaction rolls back untouched.
 * Infrastructure failures stay DbError (see ../db/errors.js).
 *
 * Messages never contain amounts or names (spec section 25); ids and field names are fine.
 */

export const ENGINE_ERROR_CODES = Object.freeze({
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'ENTITY_NOT_FOUND',
  STATE_NOT_ALLOWED: 'STATE_NOT_ALLOWED',
  HAS_DEPENDENTS: 'HAS_DEPENDENTS',
  LEDGER_CORRUPT: 'LEDGER_CORRUPT',
  CONFIG_INVALID: 'ENGINE_CONFIG_INVALID',
});

export class EngineError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.details = details;
  }
}

/** errors: [{ code, field, message }] - every problem found, not just the first. */
export class ValidationError extends EngineError {
  constructor(errors) {
    const codes = errors.map((error) => error.code);
    super(ENGINE_ERROR_CODES.VALIDATION_FAILED, `Validation failed: ${codes.join(', ')}`, { errors });
    this.name = 'ValidationError';
    this.errors = errors;
    this.codes = codes;
  }
}

export function validationError(code, field, message) {
  return new ValidationError([{ code, field, message }]);
}
