/**
 * Standard operating procedures.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * The user's own written procedures.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createSopService(engine = defaultEngine) {
  return Object.freeze({
    list: (options) => engine.sops.list(options),
    create: (input) => engine.sops.create(input),
    update: (id, patch, options) => engine.sops.update(id, patch, options),
    archive: (id, options) => engine.sops.archive(id, options),
    unarchive: (id, options) => engine.sops.unarchive(id, options),
  });
}

export const sopService = createSopService();
