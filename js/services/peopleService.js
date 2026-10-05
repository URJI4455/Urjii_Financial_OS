/**
 * People.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * People who owe the user money or whose money the user holds.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createPeopleService(engine = defaultEngine) {
  return Object.freeze({
    list: (options) => engine.people.list(options),
    create: (input) => engine.people.create(input),
    rename: (id, name, options) => engine.people.rename(id, name, options),
    archive: (id, options) => engine.people.archive(id, options),
    unarchive: (id, options) => engine.people.unarchive(id, options),
  });
}

export const peopleService = createPeopleService();
