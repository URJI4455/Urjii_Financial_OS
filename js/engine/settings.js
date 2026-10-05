/**
 * Application settings (non-financial preferences).
 * Spec sections 21, 24. Layer: engine.
 *
 * Only known keys are accepted. Every change is audited.
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { ValidationError } from './errors.js';
import { toIso } from './time.js';

export const SETTING_DEFAULTS = Object.freeze({ currencyLabel: 'ETB' });

const VALIDATORS = Object.freeze({
  currencyLabel: (value) => typeof value === 'string' && value.trim() !== '' && value.trim().length <= 8,
});

export function createSettings({ database, clock, audit }) {
  const stores = [S.SETTINGS, S.AUDIT_LOG];

  const getAll = () =>
    database.runInTransaction([S.SETTINGS], 'readonly', async (tx) => {
      const stored = await tx.store(S.SETTINGS).getAll();
      return { ...SETTING_DEFAULTS, ...Object.fromEntries(stored.map((record) => [record.id, record.value])) };
    });

  const get = async (key) => (await getAll())[key];

  async function set(key, value, { reason } = {}) {
    if (!Object.hasOwn(VALIDATORS, key)) {
      throw new ValidationError([{ code: 'SETTING_UNKNOWN', field: 'key', message: 'Unknown setting.' }]);
    }
    if (!VALIDATORS[key](value)) {
      throw new ValidationError([{ code: 'SETTING_INVALID', field: 'value', message: 'This value is not allowed for the setting.' }]);
    }
    const clean = typeof value === 'string' ? value.trim() : value;

    return database.runInTransaction(stores, 'readwrite', async (tx) => {
      const previous = (await tx.store(S.SETTINGS).get(key)) ?? null;
      const next = { id: key, value: clean, updatedAt: toIso(clock()) };
      await tx.store(S.SETTINGS).put(next);
      await audit.write(tx, { entity: S.SETTINGS, entityId: key, action: previous ? 'update' : 'create', previousState: previous, newState: next, reason: reason ?? null });
      return next;
    });
  }

  return Object.freeze({ get, getAll, set });
}
