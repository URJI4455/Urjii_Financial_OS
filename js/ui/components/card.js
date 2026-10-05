/**
 * Reusable cards, badges and list rows.
 * Layer: ui.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';

/** card({ title, subtitle, actions: [Node], tone, id }, ...children) */
export function card({ title, subtitle, actions, tone, id, className = '' } = {}, ...children) {
  return h(
    'section',
    { class: `card ${tone ? `card--${tone}` : ''} ${className}`.trim(), id, 'aria-labelledby': title && id ? `${id}-title` : null },
    title || actions
      ? h(
          'header',
          { class: 'card__header' },
          h('div', { class: 'card__heading' }, title ? h('h2', { class: 'card__title', id: id ? `${id}-title` : null }, title) : null, subtitle ? h('p', { class: 'card__subtitle' }, subtitle) : null),
          actions?.length ? h('div', { class: 'card__actions' }, actions) : null
        )
      : null,
    children
  );
}

/** A labelled figure: statTile({ label, value, hint, tone, href }). `value` is already formatted text or a Node. */
export function statTile({ label, value, hint, tone, href, large = false }) {
  const content = [
    h('span', { class: 'stat__label' }, label),
    h('span', { class: `stat__value ${large ? 'stat__value--large' : ''}` }, value),
    hint ? h('span', { class: 'stat__hint' }, hint) : null,
  ];
  return href
    ? h('a', { class: `stat stat--link ${tone ? `stat--${tone}` : ''}`, href }, content)
    : h('div', { class: `stat ${tone ? `stat--${tone}` : ''}` }, content);
}

export function badge(text, tone = 'neutral') {
  return h('span', { class: `badge badge--${tone}` }, text);
}

/**
 * listRow({ icon, iconTone, title, subtitle, trailing, trailingSub, onClick, href, badges, muted })
 * Rows with onClick/href are focusable buttons/links.
 */
export function listRow({ icon: iconName, iconTone, title, subtitle, trailing, trailingTone, trailingSub, onClick, href, badges, muted = false, strike = false }) {
  const inner = [
    iconName ? h('span', { class: `row__icon ${iconTone ? `row__icon--${iconTone}` : ''}` }, icon(iconName, { size: 18 })) : null,
    h(
      'span',
      { class: 'row__main' },
      h('span', { class: `row__title ${strike ? 'is-struck' : ''}` }, title),
      subtitle ? h('span', { class: 'row__subtitle' }, subtitle) : null,
      badges?.length ? h('span', { class: 'row__badges' }, badges) : null
    ),
    trailing !== undefined && trailing !== null
      ? h(
          'span',
          { class: 'row__trailing' },
          h('span', { class: `row__amount ${trailingTone ? `row__amount--${trailingTone}` : ''} ${strike ? 'is-struck' : ''}` }, trailing),
          trailingSub ? h('span', { class: 'row__subtitle' }, trailingSub) : null
        )
      : null,
    onClick || href ? h('span', { class: 'row__chevron' }, icon('chevron', { size: 16 })) : null,
  ];
  const className = `row ${muted ? 'row--muted' : ''}`.trim();
  const item = href
    ? h('a', { class: `${className} row--action`, href }, inner)
    : onClick
      ? h('button', { class: `${className} row--action`, type: 'button', onClick }, inner)
      : h('div', { class: className }, inner);
  return h('li', { class: 'list__item' }, item);
}

export const list = (rows, { label } = {}) => h('ul', { class: 'list', 'aria-label': label }, rows);

/** A thin progress bar for `part` out of `whole`. The ratio only drives the bar's width (display only). */
export function progressBar(part, whole, label) {
  const clamped = whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
  return h('div', { class: 'progress', role: 'img', 'aria-label': label }, h('span', { class: 'progress__bar', style: `width: ${(clamped * 100).toFixed(1)}%` }));
}
