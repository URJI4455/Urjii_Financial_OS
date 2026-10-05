/**
 * Time helpers. All stored timestamps are ISO 8601 UTC strings (sortable as text).
 * Layer: engine.
 */

export function toIso(value) {
  if (value === null || value === undefined) throw new RangeError('Invalid date');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');
  return date.toISOString();
}
