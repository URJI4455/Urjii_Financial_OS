/**
 * Audit log viewing.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Read-only views of the audit trail: what changed, and why.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createAuditService(engine = defaultEngine) {
  return Object.freeze({
    forEntity: (entity, entityId) => engine.audit.forEntity(entity, entityId),
    /** Newest first. */
    async recent(limit = 50) {
      const all = await engine.audit.all();
      return all.reverse().slice(0, limit);
    },
  });
}

export const auditService = createAuditService();
