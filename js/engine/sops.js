/**
 * Standard operating procedures: the user's own written procedures.
 * Spec sections 21, 24. Layer: engine.
 *
 * Plain text records (title + body). No deletes: archive instead. Changes are audited.
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { ENGINE_ERROR_CODES, EngineError, ValidationError } from './errors.js';
import { isPlainObject } from './util.js';
import { toIso } from './time.js';

const TITLE_MAX = 120;
const BODY_MAX = 5000;

function check(input, { partial }) {
  const errors = [];
  if (!isPlainObject(input)) throw new ValidationError([{ code: 'INPUT_INVALID', field: null, message: 'Input must be an object.' }]);
  for (const key of Object.keys(input)) {
    if (!['id', 'title', 'body'].includes(key)) errors.push({ code: 'UNKNOWN_FIELD', field: key, message: `${key} is not a valid field.` });
  }
  const out = {};
  if (!partial || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim() === '') errors.push({ code: 'TITLE_REQUIRED', field: 'title', message: 'A title is required.' });
    else if (input.title.trim().length > TITLE_MAX) errors.push({ code: 'TITLE_TOO_LONG', field: 'title', message: 'The title is too long.' });
    else out.title = input.title.trim();
  }
  if (!partial || input.body !== undefined) {
    const body = input.body ?? '';
    if (typeof body !== 'string') errors.push({ code: 'BODY_INVALID', field: 'body', message: 'The text must be plain text.' });
    else if (body.length > BODY_MAX) errors.push({ code: 'BODY_TOO_LONG', field: 'body', message: 'The text is too long.' });
    else out.body = body;
  }
  if (partial && Object.keys(out).length === 0 && errors.length === 0) {
    errors.push({ code: 'NOTHING_TO_UPDATE', field: null, message: 'Nothing to change.' });
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return out;
}

export function createSops({ database, clock, newId, audit }) {
  const stores = [S.SOPS, S.AUDIT_LOG];
  const nowIso = () => toIso(clock());
  const notFound = (id) => new EngineError(ENGINE_ERROR_CODES.NOT_FOUND, 'Procedure not found.', { id });

  async function create(input) {
    const fields = check(input, { partial: false });
    return database.runInTransaction(stores, 'readwrite', async (tx) => {
      const record = { id: input.id ?? newId(), ...fields, archived: false, createdAt: nowIso() };
      if (await tx.store(S.SOPS).get(record.id)) throw new ValidationError([{ code: 'DUPLICATE_ID', field: 'id', message: 'A record with this id already exists.' }]);
      await tx.store(S.SOPS).add(record);
      await audit.write(tx, { entity: S.SOPS, entityId: record.id, action: 'create', previousState: null, newState: record });
      return record;
    });
  }

  async function mutate(id, action, change, reason) {
    return database.runInTransaction(stores, 'readwrite', async (tx) => {
      const current = await tx.store(S.SOPS).get(id);
      if (!current) throw notFound(id);
      const next = { ...change(current), updatedAt: nowIso() };
      await tx.store(S.SOPS).put(next);
      await audit.write(tx, { entity: S.SOPS, entityId: id, action, previousState: current, newState: next, reason: reason ?? null });
      return next;
    });
  }

  const update = async (id, patch, { reason } = {}) => {
    const fields = check({ ...patch }, { partial: true });
    return mutate(id, 'update', (current) => ({ ...current, ...fields }), reason);
  };
  const archive = (id, { reason } = {}) =>
    mutate(id, 'archive', (current) => {
      if (current.archived) throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, 'Procedure is already archived.', { id });
      return { ...current, archived: true };
    }, reason);
  const unarchive = (id, { reason } = {}) =>
    mutate(id, 'unarchive', (current) => {
      if (!current.archived) throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, 'Procedure is not archived.', { id });
      return { ...current, archived: false };
    }, reason);

  const get = (id) => database.runInTransaction([S.SOPS], 'readonly', async (tx) => (await tx.store(S.SOPS).get(id)) ?? null);
  const list = ({ includeArchived = false } = {}) =>
    database.runInTransaction([S.SOPS], 'readonly', async (tx) =>
      (await tx.store(S.SOPS).getAll())
        .filter((record) => includeArchived || !record.archived)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    );

  return Object.freeze({ create, update, archive, unarchive, get, list });
}
