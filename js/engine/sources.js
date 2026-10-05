/**
 * Income source records.
 * Spec section 15. Layer: engine.
 *
 * Income sources. Dynamic; never hard-coded.
 */

import { createReferenceData } from './referenceData.js';
import { STORE_NAMES as S } from '../db/schema.js';

export function createSources(deps) {
  return createReferenceData({ ...deps, storeName: S.SOURCES, label: 'Income source' });
}
