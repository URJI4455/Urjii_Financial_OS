/**
 * Settings.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * Non-financial preferences (currently the currency label).
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

export function createSettingsService(engine = defaultEngine) {
  return Object.freeze({
    getAll: () => engine.settings.getAll(),
    set: (key, value, options) => engine.settings.set(key, value, options),
  });
}

export const settingsService = createSettingsService();
