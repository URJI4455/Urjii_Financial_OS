/**
 * Navigation: bottom bar on phones (Home, Transactions, Money, Reports, More), sidebar on wide screens.
 * Layer: ui.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { ROUTES } from '../routes.js';

export function renderNavigation(container, activePageId) {
  const active = ROUTES.find((route) => route.id === activePageId);
  const activeIsSecondary = Boolean(active) && !active.primaryNav;

  const link = (route, extraClass = '') => {
    const isCurrent = route.id === activePageId || (route.id === 'more' && activeIsSecondary && extraClass === '');
    return h(
      'a',
      { class: `app-nav__link ${extraClass}`.trim(), href: route.href, 'aria-current': isCurrent ? 'page' : null },
      icon(route.icon, { size: 22 }),
      h('span', { class: 'app-nav__label' }, route.navLabel)
    );
  };

  container.replaceChildren(
    h('a', { class: 'app-nav__brand', href: 'index.html' }, h('span', { class: 'app-nav__mark', 'aria-hidden': 'true' }, 'U'), h('span', {}, 'Urji Finance')),
    ...ROUTES.filter((route) => route.primaryNav).map((route) => link(route, route.id === 'more' ? 'app-nav__link--more' : '')),
    h('div', { class: 'app-nav__divider', 'aria-hidden': 'true' }),
    ...ROUTES.filter((route) => !route.primaryNav).map((route) => link(route, 'app-nav__link--secondary'))
  );
}
