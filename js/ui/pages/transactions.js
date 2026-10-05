/**
 * Transactions page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h, render } from '../dom.js';
import { createView } from '../components/view.js';
import { card, badge, list, listRow } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney, formatDay, dayKey } from '../formatters.js';
import { flowSign, toneForFlow, queryParam } from '../pageKit.js';
import { openAddMenu } from '../flows/entryFlows.js';
import { openTransactionDetail, statusBadges } from '../views/transactionDetail.js';
import { TYPE_ICONS, describeTransaction } from '../labels.js';
import { transactionService } from '../../services/transactionService.js';
import { catalogService } from '../../services/catalogService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('transactions', { onAdd: () => openAddMenu({ onDone: refresh }) });

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Money in' },
  { id: 'out', label: 'Money out' },
  { id: 'neutral', label: 'Moves' },
];
const state = { flow: 'all', accountId: queryParam('account') ?? '', showCancelled: false, limit: 50 };
const PAGE = 50;

const involves = (t, accountId) => [t.accountId, t.fromAccountId, t.toAccountId].includes(accountId);

function draw({ rows, catalog }) {
  if (rows.length === 0) {
    return card({}, emptyState({ icon: 'list', title: 'No entries yet', message: 'Everything you record will appear here, newest first.', action: { label: 'Add an entry', onClick: () => openAddMenu({ onDone: refresh }) } }));
  }
  const rowsById = new Map(rows.map((row) => [row.transaction.id, row]));
  const results = h('div');

  function filtered() {
    return rows
      .filter((row) => state.showCancelled || row.transaction.lifecycleStatus !== 'voided')
      .filter((row) => state.flow === 'all' || row.flow === state.flow)
      .filter((row) => !state.accountId || involves(row.transaction, state.accountId));
  }

  function redraw() {
    const matches = filtered();
    if (matches.length === 0) {
      render(results, card({}, emptyState({ icon: 'list', title: 'Nothing matches these filters', action: { label: 'Show everything', onClick: () => { state.flow = 'all'; state.accountId = ''; state.showCancelled = false; refresh(); } } })));
      return;
    }
    const shown = matches.slice(0, state.limit);
    const groups = [];
    for (const row of shown) {
      const key = dayKey(row.transaction.occurredAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else groups.push({ key, day: row.transaction.occurredAt, rows: [row] });
    }
    render(
      results,
      h(
        'section',
        { class: 'card card--tight', 'aria-label': 'Transactions' },
        groups.map((group) =>
          h(
            'div',
            {},
            h('h3', { class: 'group-title' }, formatDay(group.day)),
            list(
              group.rows.map((row) => {
                const t = row.transaction;
                const info = describeTransaction(t, catalog.names, rowsById);
                return listRow({
                  icon: TYPE_ICONS[t.type],
                  iconTone: toneForFlow(row.flow),
                  title: info.title,
                  subtitle: [info.subtitle, t.note].filter(Boolean).join(' \u00b7 '),
                  badges: statusBadges(t),
                  trailing: `${flowSign(row.flow)}${formatMoney(t.amount)}`,
                  trailingTone: toneForFlow(row.flow),
                  strike: t.lifecycleStatus === 'voided',
                  onClick: () => openTransactionDetail(t.id, { onChange: refresh }),
                });
              })
            )
          )
        )
      ),
      matches.length > shown.length
        ? h('div', { class: 'state__actions' }, h('button', { class: 'button', type: 'button', onClick: () => { state.limit += PAGE; redraw(); } }, `Show more (${matches.length - shown.length} left)`))
        : null
    );
  }

  const chips = h(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'Filter by kind of movement' },
    FILTERS.map((filter) =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.flow === filter.id), onClick: (event) => {
        state.flow = filter.id;
        state.limit = PAGE;
        chips.querySelectorAll('.chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip === event.currentTarget)));
        redraw();
      } }, filter.label)
    )
  );

  const accountSelect = h(
    'select',
    { class: 'input input--select', 'aria-label': 'Filter by account', onChange: (event) => { state.accountId = event.target.value; state.limit = PAGE; redraw(); } },
    h('option', { value: '' }, 'All accounts'),
    catalog.accounts.map((account) => h('option', { value: account.id, selected: account.id === state.accountId }, account.archived ? `${account.name} (archived)` : account.name))
  );

  const cancelledToggle = h(
    'label',
    { class: 'switch' },
    h('input', { type: 'checkbox', checked: state.showCancelled, onChange: (event) => { state.showCancelled = event.target.checked; redraw(); } }),
    'Show cancelled entries'
  );

  redraw();
  return h('div', { class: 'stack' }, h('div', { class: 'filters' }, chips, h('div', { class: 'filters__row' }, accountSelect, cancelledToggle)), results);
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const [rows, catalog] = await Promise.all([transactionService.list(), catalogService.load()]);
      return { rows, catalog };
    },
    draw,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ transactionService, catalogService });
