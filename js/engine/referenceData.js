/**
 * Generic store for user-managed reference data: accounts, people, sources, allocations, categories.
 * Spec sections 11, 12, 15, 16, 17. Layer: engine.
 *
 * Create / rename / archive / unarchive / get / list. There is NO delete: history stays valid and
 * archived records are only hidden from new use. Every change is audited atomically.
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { ENGINE_ERROR_CODES, EngineError, ValidationError } from './errors.js';
import { isPlainObject } from './util.js';
import { toIso } from './time.js';

const NAME_MAX = 120;

export function cleanName(value, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push({ code: 'NAME_REQUIRED', field: 'name', message: 'A name is required.' });
    return undefined;
  }
  const name = value.trim();
  if (name.length > NAME_MAX) {
    errors.push({ code: 'NAME_TOO_LONG', field: 'name', message: `The name is longer than ${NAME_MAX} characters.` });
    return undefined;
  }
  return name;
}

export function createReferenceData({ database, audit, clock, newId, storeName, label, allowedFields = [], parseExtras, finalizeCreate }) {
  const nowIso = () => toIso(clock());
  const stores = [storeName, S.AUDIT_LOG];
  const notFound = (id) => new EngineError(ENGINE_ERROR_CODES.NOT_FOUND, `${label} not found.`, { id });

  async function create(input = {}) {
    const errors = [];
    if (!isPlainObject(input)) throw new ValidationError([{ code: 'INPUT_INVALID', field: null, message: 'Input must be an object.' }]);

    const allowed = new Set(['id', 'name', ...allowedFields]);
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) errors.push({ code: 'UNKNOWN_FIELD', field: key, message: `${key} is not a valid field.` });
    }
    if (input.id !== undefined && (typeof input.id !== 'string' || input.id === '')) {
      errors.push({ code: 'ID_INVALID', field: 'id', message: 'id must be a non-empty string.' });
    }
    const name = cleanName(input.name, errors);
    const extras = parseExtras ? parseExtras(input, errors) : {};
    if (errors.length > 0) throw new ValidationError(errors);

    return database.runInTransaction(stores, 'readwrite', async (tx) => {
      const id = input.id ?? newId();
      if (await tx.store(storeName).get(id)) {
        throw new ValidationError([{ code: 'DUPLICATE_ID', field: 'id', message: 'A record with this id already exists.' }]);
      }

      let record = { id, name, ...extras, archived: false, createdAt: nowIso() };
      if (finalizeCreate) record = await finalizeCreate(tx, record);

      await tx.store(storeName).add(record);
      await audit.write(tx, { entity: storeName, entityId: id, action: 'create', previousState: null, newState: record });
      return record;
    });
  }

  async function mutate(id, { action, reason = null, change }) {
    return database.runInTransaction(stores, 'readwrite', async (tx) => {
      const current = await tx.store(storeName).get(id);
      if (!current) throw notFound(id);

      const next = { ...change(current), updatedAt: nowIso() };
      await tx.store(storeName).put(next);
      await audit.write(tx, { entity: storeName, entityId: id, action, previousState: current, newState: next, reason });
      return next;
    });
  }

  const rename = (id, newName, { reason } = {}) => {
    const errors = [];
    const name = cleanName(newName, errors);
    if (errors.length > 0) return Promise.reject(new ValidationError(errors));
    return mutate(id, { action: 'rename', reason, change: (current) => ({ ...current, name }) });
  };

  const archive = (id, { reason } = {}) =>
    mutate(id, {
      action: 'archive',
      reason,
      change: (current) => {
        if (current.archived) throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, `${label} is already archived.`, { id });
        return { ...current, archived: true };
      },
    });

  const unarchive = (id, { reason } = {}) =>
    mutate(id, {
      action: 'unarchive',
      reason,
      change: (current) => {
        if (!current.archived) throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, `${label} is not archived.`, { id });
        return { ...current, archived: false };
      },
    });

  const get = (id) => database.runInTransaction([storeName], 'readonly', async (tx) => (await tx.store(storeName).get(id)) ?? null);

  const list = ({ includeArchived = false } = {}) =>
    database.runInTransaction([storeName], 'readonly', async (tx) =>
      (await tx.store(storeName).getAll())
        .filter((record) => includeArchived || !record.archived)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    );

  return Object.freeze({ create, rename, archive, unarchive, get, list });
}
