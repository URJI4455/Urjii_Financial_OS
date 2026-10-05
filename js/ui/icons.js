/**
 * Inline SVG icons (stroke style, 24x24). No external assets, so they work offline.
 * Layer: ui.
 */

import { svg } from './dom.js';

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  wallet: 'M4 7a2 2 0 0 1 2-2h12v4M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2zM16 14.5h.01',
  chart: 'M5 20V11M12 20V4M19 20v-6M3 20h18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 9v4M12 17h.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  arrowIn: 'M12 5v14M6 13l6 6 6-6',
  arrowOut: 'M12 19V5M6 11l6-6 6 6',
  swap: 'M7 8h12l-3-3M17 16H5l3 3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  inbox: 'M3 13l3-8h12l3 8M3 13v6h18v-6M3 13h5l1 3h6l1-3h5',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 7M19 15a6 6 0 0 1 3 6',
  scale: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l3 3 5-6',
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5zM4 20a2 2 0 0 0 2 1h13v-3',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  download: 'M12 4v11M7 11l5 5 5-5M4 20h16',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
};

export function icon(name, { size = 20, label } = {}) {
  const path = PATHS[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  const element = svg('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'icon',
    focusable: 'false',
  }, svg('path', { d: path }));
  if (label) {
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', label);
  } else {
    element.setAttribute('aria-hidden', 'true');
  }
  return element;
}
