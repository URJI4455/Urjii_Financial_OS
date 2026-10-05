/**
 * Toast notifications (never alert()).
 * Layer: ui. Toast text must not contain amounts or names that could be logged.
 */

import { h, uid } from '../dom.js';
import { icon } from '../icons.js';

const MAX_VISIBLE = 3;
const DURATIONS = { success: 4000, info: 4500, warning: 8000, error: 9000 };
const ICONS = { success: 'check', info: 'info', warning: 'alert', error: 'alert' };

function region() {
  let element = document.getElementById('toast-region');
  if (!element) {
    element = h('div', { id: 'toast-region', class: 'toast-region', 'aria-live': 'polite', 'aria-atomic': 'false' });
    document.body.append(element);
  }
  return element;
}

/** toast('Saved', { tone: 'success' | 'info' | 'warning' | 'error', action: { label, onClick } }) */
export function toast(message, { tone = 'info', duration, action } = {}) {
  const container = region();
  const id = uid('toast');
  let timer = null;

  const dismiss = () => {
    clearTimeout(timer);
    element.classList.add('toast--leaving');
    setTimeout(() => element.remove(), 180);
  };

  const element = h(
    'div',
    { class: `toast toast--${tone}`, id, role: tone === 'error' || tone === 'warning' ? 'alert' : 'status' },
    h('span', { class: 'toast__icon' }, icon(ICONS[tone] ?? 'info', { size: 18 })),
    h('span', { class: 'toast__message' }, message),
    action
      ? h('button', { class: 'toast__action', type: 'button', onClick: () => { dismiss(); action.onClick(); } }, action.label)
      : null,
    h('button', { class: 'toast__close', type: 'button', 'aria-label': 'Dismiss', onClick: dismiss }, icon('close', { size: 16 }))
  );

  const start = () => {
    clearTimeout(timer);
    timer = setTimeout(dismiss, duration ?? DURATIONS[tone] ?? 4500);
  };
  element.addEventListener('mouseenter', () => clearTimeout(timer));
  element.addEventListener('mouseleave', start);

  container.append(element);
  while (container.children.length > MAX_VISIBLE) container.firstElementChild.remove();
  start();
  return { dismiss };
}

export const toastSuccess = (message, options) => toast(message, { ...options, tone: 'success' });
export const toastError = (message, options) => toast(message, { ...options, tone: 'error' });
export const toastWarning = (message, options) => toast(message, { ...options, tone: 'warning' });
