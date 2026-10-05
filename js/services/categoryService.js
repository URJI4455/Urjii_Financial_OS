/**
 * Categories.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * User-managed categories and subcategories.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createCategoryService(engine = defaultEngine) {
  return Object.freeze({
    list: (options) => engine.categories.list(options),
    create: (input) => engine.categories.create(input),
    rename: (id, name, options) => engine.categories.rename(id, name, options),
    archive: (id, options) => engine.categories.archive(id, options),
    unarchive: (id, options) => engine.categories.unarchive(id, options),
    reorder: (orderedIds, options) => engine.categories.reorder(orderedIds, options),
  });
}

export const categoryService = createCategoryService();
