/**
 * Loading, empty and error states.
 * Layer: ui.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';

export function loadingState(label = 'Loading\u2026') {
  return h(
    'div',
    { class: 'state state--loading', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'spinner', 'aria-hidden': 'true' }),
    h('span', label)
  );
}

/** Placeholder blocks shown while data loads (feels faster than a spinner). */
export function skeleton(blocks = 3) {
  return h(
    'div',
    { class: 'skeleton-group', role: 'status', 'aria-label': 'Loading' },
    Array.from({ length: blocks }, () =>
      h('div', { class: 'skeleton-card', 'aria-hidden': 'true' }, h('span', { class: 'skeleton-line skeleton-line--short' }), h('span', { class: 'skeleton-line' }), h('span', { class: 'skeleton-line skeleton-line--medium' }))
    )
  );
}

/** emptyState({ icon, title, message, action: { label, onClick, href } }) */
export function emptyState({ icon: iconName = 'info', title, message, action, secondary } = {}) {
  const button = (spec, className) =>
    spec.href
      ? h('a', { class: className, href: spec.href }, spec.label)
      : h('button', { class: className, type: 'button', onClick: spec.onClick }, spec.label);
  return h(
    'div',
    { class: 'state state--empty' },
    h('span', { class: 'state__icon' }, icon(iconName, { size: 26 })),
    h('h3', { class: 'state__title' }, title),
    message ? h('p', { class: 'state__message' }, message) : null,
    action || secondary
      ? h('div', { class: 'state__actions' }, action ? button(action, 'button button--primary') : null, secondary ? button(secondary, 'button button--quiet') : null)
      : null
  );
}

/** errorState({ title, message, onRetry }) */
export function errorState({ title = 'Something went wrong', message, onRetry } = {}) {
  return h(
    'div',
    { class: 'state state--error', role: 'alert' },
    h('span', { class: 'state__icon state__icon--error' }, icon('alert', { size: 26 })),
    h('h3', { class: 'state__title' }, title),
    message ? h('p', { class: 'state__message' }, message) : null,
    onRetry ? h('div', { class: 'state__actions' }, h('button', { class: 'button button--primary', type: 'button', onClick: onRetry }, 'Try again')) : null
  );
}
