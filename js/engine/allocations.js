/**
 * Allocation records.
 * Spec section 16. Layer: engine.
 *
 * Allocations: what money is intended for. Not an account and not an expense category.
 */

import { createReferenceData } from './referenceData.js';
import { STORE_NAMES as S } from '../db/schema.js';

export function createAllocations(deps) {
  return createReferenceData({ ...deps, storeName: S.ALLOCATIONS, label: 'Allocation' });
}
