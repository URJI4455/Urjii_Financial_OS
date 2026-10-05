/**
 * Person records.
 * Spec section 12. Layer: engine.
 *
 * People who take part in loans, settlements and held money. Dynamic; never hard-coded.
 */

import { createReferenceData } from './referenceData.js';
import { STORE_NAMES as S } from '../db/schema.js';

export function createPeople(deps) {
  return createReferenceData({ ...deps, storeName: S.PEOPLE, label: 'Person' });
}
