/**
 * Small shared helpers for pages. Presentation only.
 * Layer: ui.
 */

import { h } from './dom.js';
import { formatMoney, getCurrency } from './formatters.js';

/** "1,946.00" followed by a small currency label. */
export const amountWithUnit = (minor) => h('span', {}, formatMoney(minor), h('span', { class: 'unit' }, getCurrency()));

/** Sign shown in front of an amount, chosen by the engine's flow ('in' | 'out' | 'neutral' | 'none'). */
export const flowSign = (flow) => (flow === 'in' ? '+' : flow === 'out' ? '\u2212' : '');

export const toneForFlow = (flow) => (flow === 'in' ? 'in' : flow === 'neutral' ? 'neutral' : undefined);

export const queryParam = (name) => new URLSearchParams(window.location.search).get(name);

/** Scroll to the element named in the URL hash (after content has rendered). */
export function scrollToHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function downloadText(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(count) {
  if (count === null || count === undefined) return 'unknown';
  if (count < 1024) return `${count} B`;
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(0)} KB`;
  if (count < 1024 * 1024 * 1024) return `${(count / (1024 * 1024)).toFixed(1)} MB`;
  return `${(count / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
