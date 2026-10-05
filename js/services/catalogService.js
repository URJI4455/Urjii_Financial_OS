/**
 * Reference-data catalog (names for ids).
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * One call returns every account, person, source, allocation and category (archived ones included, so history can always be labelled).
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

const COLLECTIONS = ['accounts', 'people', 'sources', 'allocations', 'categories'];

export function createCatalogService(engine = defaultEngine) {
  async function load() {
    const lists = await Promise.all(COLLECTIONS.map((name) => engine[name].list({ includeArchived: true })));
    const catalog = Object.fromEntries(COLLECTIONS.map((name, index) => [name, lists[index]]));
    const names = Object.fromEntries(
      COLLECTIONS.map((name) => [name, Object.fromEntries(catalog[name].map((record) => [record.id, record.name]))])
    );
    return {
      ...catalog,
      names,
      active: Object.fromEntries(COLLECTIONS.map((name) => [name, catalog[name].filter((record) => !record.archived)])),
    };
  }
  return Object.freeze({ load });
}

export const catalogService = createCatalogService();
