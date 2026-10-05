/**
 * Reports.
 * Layer: services (may import: ../engine/index.js, ../config/*; must NOT import ../db/* or ../ui/*).
 *
 * What happened financially over a period. Only the period boundaries are computed here; every amount comes from the engine.
 * Services orchestrate engine calls and return display-ready data. They contain NO financial rules:
 * every number comes from the engine. The factory takes the engine so tests can inject a test engine.
 */

import { engine as defaultEngine } from '../engine/index.js';

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export const PERIOD_PRESETS = Object.freeze(['this-month', 'last-month', 'last-30-days', 'this-year']);

/** Local-time boundaries for a preset, as ISO strings. */
export function periodRange(preset, now = new Date()) {
  switch (preset) {
    case 'this-month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: endOfDay(now).toISOString() };
    case 'last-month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)).toISOString(),
      };
    case 'last-30-days':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)).toISOString(), to: endOfDay(now).toISOString() };
    case 'this-year':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: endOfDay(now).toISOString() };
    default:
      throw new RangeError('Unknown period preset');
  }
}

/** Range for two calendar days chosen by the user (YYYY-MM-DD, local time). */
export function customRange(fromDay, toDay) {
  const [fy, fm, fd] = fromDay.split('-').map(Number);
  const [ty, tm, td] = toDay.split('-').map(Number);
  return { from: startOfDay(new Date(fy, fm - 1, fd)).toISOString(), to: endOfDay(new Date(ty, tm - 1, td)).toISOString() };
}

export function createReportService(engine = defaultEngine) {
  return Object.freeze({
    periodRange,
    customRange,
    period: (range) => engine.state.periodReport(range),
  });
}

export const reportService = createReportService();
