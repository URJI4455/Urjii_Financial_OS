/**
 * Money / amount handling (decision ADR-010, resolves OPEN-001).
 * Layer: engine.
 *
 * Every amount inside the engine and the database is a positive INTEGER NUMBER OF MINOR UNITS
 * (two decimals, so 1,500.50 is stored as 150050). Floats never enter the ledger. Decimal text is
 * converted only at the edge with toMinorUnits / fromMinorUnits. Currency is not hard-coded.
 */

export const MINOR_UNIT_DIGITS = 2;
const FACTOR = 10 ** MINOR_UNIT_DIGITS;

/** True for a safe integer greater than zero. */
export function isValidAmount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/**
 * Exact decimal parse. Accepts "1500", "1,500.5", " 12.05 " or a number whose text form has at most
 * two decimals. Rejects negatives, more than two decimals, exponents and anything else (RangeError).
 */
export function toMinorUnits(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new RangeError('Invalid amount');
    input = String(input);
  }
  if (typeof input !== 'string') throw new RangeError('Invalid amount');

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim().replace(/,/g, ''));
  if (!match) throw new RangeError('Invalid amount format');

  const minor = Number(match[1]) * FACTOR + Number((match[2] ?? '').padEnd(MINOR_UNIT_DIGITS, '0'));
  if (!Number.isSafeInteger(minor)) throw new RangeError('Amount too large');
  return minor;
}

/** Integer minor units -> decimal text, e.g. 150050 -> "1500.50"; negative values keep their sign. */
export function fromMinorUnits(minor) {
  if (!Number.isSafeInteger(minor)) throw new RangeError('Invalid minor-unit amount');
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(minor);
  const whole = Math.floor(absolute / FACTOR);
  const fraction = String(absolute % FACTOR).padStart(MINOR_UNIT_DIGITS, '0');
  return `${sign}${whole}.${fraction}`;
}

/** Sum of integers that must stay inside the safe-integer range. */
export function sumAmounts(values) {
  let total = 0;
  for (const value of values) {
    total += value;
    if (!Number.isSafeInteger(total)) throw new RangeError('Amount overflow');
  }
  return total;
}
