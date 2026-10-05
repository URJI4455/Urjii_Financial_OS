/**
 * More page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h, render } from '../dom.js';
import { card, list, listRow } from '../components/card.js';
import { icon } from '../icons.js';
import { ROUTES } from '../routes.js';

const boot = await bootPage('more');

if (boot.ok) {
  render(
    boot.main,
    h(
      'div',
      { class: 'stack' },
      h('p', { class: 'muted' }, 'Everything else in Urji Finance.'),
      card(
        { className: 'card--tight more-list' },
        list(ROUTES.filter((route) => !route.primaryNav).map((route) => listRow({ icon: route.icon, iconTone: 'brand', title: route.title === 'SOP' ? 'Guides' : route.title === 'Reconciliation' ? 'Check balances' : route.title === 'Receivables' ? 'Owed to me' : route.title, subtitle: route.summary, href: route.href })), { label: 'More pages' })
      ),
      h('p', { class: 'small muted' }, 'Private by design: your data stays on this device and the app works without internet.')
    )
  );
}

export const pageServices = Object.freeze({});
