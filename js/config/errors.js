/**
 * Shared error helpers.
 * Layer: config.
 *
 * Error messages must never contain financial amounts, balances or person names
 * that could end up in logs (spec section 25).
 */

export class NotImplementedError extends Error {
  constructor(featureName) {
    super(`Not implemented yet: ${featureName}`);
    this.name = 'NotImplementedError';
  }
}

/** Convenience factory used by scaffolded stubs. */
export function notImplemented(featureName) {
  return new NotImplementedError(featureName);
}
