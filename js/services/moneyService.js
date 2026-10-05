/**
 * Money parsing and currency.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * The only door to amount conversion for the UI (the engine owns the rules: whole minor units, two decimals).
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

import { money as defaultMoney } from '../engine/index.js';

export function createMoneyService(engine = defaultEngine, money = defaultMoney) {
  return Object.freeze({
    /** Decimal text -> integer minor units, or null when the text is not a valid positive amount. */
    parseAmount(text) {
      try {
        const value = money.toMinorUnits(String(text ?? ''));
        return money.isValidAmount(value) ? value : null;
      } catch {
        return null;
      }
    },
    /** Same, but accepts zero and negative values (a real balance may be 0 or overdrawn). */
    parseBalance(text) {
      const trimmed = String(text ?? '').trim();
      const negative = trimmed.startsWith('-');
      try {
        const value = money.toMinorUnits(negative ? trimmed.slice(1) : trimmed);
        return negative ? -value : value;
      } catch {
        return null;
      }
    },
    /** Integer minor units -> "1500.50" (grouping and the currency label are presentation, done by the UI). */
    toDecimalString: (minor) => money.fromMinorUnits(minor),
    currencyLabel: () => engine.settings.get('currencyLabel'),
  });
}

export const moneyService = createMoneyService();
