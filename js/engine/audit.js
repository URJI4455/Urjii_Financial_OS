/**
 * Audit trail.
 * Spec section 10. Layer: engine.
 *
 * Every material change writes one append-only record in the SAME database transaction as the
 * change itself: { entity, entityId, action, previousState, newState, timestamp, reason }.
 * `seq` orders records created within the same millisecond by the same engine instance.
 * The engine exposes no way to update or delete audit records.
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { toIso } from './time.js';

export function createAuditTrail({ database, clock, newId }) {
  let sequence = 0;

  function build({ entity, entityId, action, previousState = null, newState = null, reason = null }) {
    return {
      id: newId(),
      entity,
      entityId,
      action,
      previousState,
      newState,
      reason,
      timestamp: toIso(clock()),
      seq: ++sequence,
    };
  }

  /** Append a record inside an open transaction. Returns the stored record. */
  async function write(tx, entry) {
    const record = build(entry);
    await tx.store(S.AUDIT_LOG).add(record);
    return record;
  }

  const order = (records) => [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.seq - b.seq);

  /** "What changed, and why" for one entity, oldest first. */
  function forEntity(entity, entityId) {
    return database.runInTransaction([S.AUDIT_LOG], 'readonly', async (tx) =>
      order(await tx.store(S.AUDIT_LOG).getAllByIndex('entity_entityId', [entity, entityId]))
    );
  }

  function all() {
    return database.runInTransaction([S.AUDIT_LOG], 'readonly', async (tx) => order(await tx.store(S.AUDIT_LOG).getAll()));
  }

  return Object.freeze({ write, forEntity, all });
}
