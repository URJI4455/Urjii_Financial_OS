/**
 * Categories and subcategories.
 * Spec section 17. Layer: engine.
 *
 * Create, rename, archive, reorder, organise (parentId). Archived categories keep every historical
 * transaction valid; they only stop being selectable for new ones.
 */

import { createReferenceData } from './referenceData.js';
import { ENGINE_ERROR_CODES, EngineError, ValidationError } from './errors.js';
import { STORE_NAMES as S } from '../db/schema.js';
import { toIso } from './time.js';

export function createCategories(deps) {
  const { database, audit, clock } = deps;

  const base = createReferenceData({
    ...deps,
    storeName: S.CATEGORIES,
    label: 'Category',
    allowedFields: ['parentId'],
    parseExtras(input, errors) {
      if (input.parentId !== undefined && input.parentId !== null && (typeof input.parentId !== 'string' || input.parentId === '')) {
        errors.push({ code: 'PARENT_INVALID', field: 'parentId', message: 'parentId must be a category id or null.' });
      }
      return { parentId: input.parentId ?? null };
    },
    async finalizeCreate(tx, record) {
      const existing = await tx.store(S.CATEGORIES).getAll();
      if (record.parentId !== null && !existing.some((category) => category.id === record.parentId)) {
        throw new ValidationError([{ code: 'PARENT_NOT_FOUND', field: 'parentId', message: 'The parent category does not exist.' }]);
      }
      const next = existing.reduce((max, category) => Math.max(max, category.sortOrder ?? 0), 0) + 1;
      return { ...record, sortOrder: next };
    },
  });

  /** Put the given categories in this order (sortOrder = position). Unknown ids are rejected. */
  async function reorder(orderedIds, { reason } = {}) {
    if (!Array.isArray(orderedIds) || new Set(orderedIds).size !== orderedIds.length) {
      throw new ValidationError([{ code: 'ORDER_INVALID', field: 'orderedIds', message: 'Provide each category id once.' }]);
    }
    return database.runInTransaction([S.CATEGORIES, S.AUDIT_LOG], 'readwrite', async (tx) => {
      const when = toIso(clock());
      for (const [position, id] of orderedIds.entries()) {
        const current = await tx.store(S.CATEGORIES).get(id);
        if (!current) throw new EngineError(ENGINE_ERROR_CODES.NOT_FOUND, 'Category not found.', { id });
        if (current.sortOrder === position + 1) continue;
        const next = { ...current, sortOrder: position + 1, updatedAt: when };
        await tx.store(S.CATEGORIES).put(next);
        await audit.write(tx, { entity: S.CATEGORIES, entityId: id, action: 'reorder', previousState: current, newState: next, reason: reason ?? null });
      }
      return (await tx.store(S.CATEGORIES).getAll()).sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  return Object.freeze({ ...base, reorder });
}
