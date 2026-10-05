/**
 * Small shared helpers for the engine.
 * Layer: engine.
 */

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** A map keyed by arbitrary ids without prototype surprises (an id such as "__proto__" is just a key). */
export function dict() {
  return Object.create(null);
}
