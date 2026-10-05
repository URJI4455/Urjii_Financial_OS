/**
 * Reports page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, statTile } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney, formatSigned, formatDate, todayInput } from '../formatters.js';
import { reportService } from '../../services/reportService.js';
import { catalogService } from '../../services/catalogService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('reports', { onAdd: undefined });

const PRESETS = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
  { id: 'custom', label: 'Choose dates' },
];
const state = { preset: 'this-month', fromDay: todayInput(), toDay: todayInput() };

const bar = (part, whole, kind = '') => h('div', { class: 'bar', role: 'presentation' }, h('span', { class: `bar__fill ${kind}`, style: `width: ${whole > 0 ? Math.min(100, (part / whole) * 100).toFixed(1) : 0}%` }));

function barList(entries, total, names, kind) {
  return h(
    'div',
    { class: 'bars' },
    entries.map(([id, value]) => h('div', { class: 'bar-row' }, h('div', { class: 'bar-row__head' }, h('span', { class: 'bar-row__name' }, names[id] ?? 'Other'), h('span', {}, formatMoney(value))), bar(value, total, kind)))
  );
}

function periodControls() {
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Choose a period' }, PRESETS.map((preset) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.preset === preset.id), onClick: () => { state.preset = preset.id; refresh(); } }, preset.label)));
  if (state.preset !== 'custom') return h('div', { class: 'period-bar' }, chips);
  const from = h('input', { class: 'input', type: 'date', value: state.fromDay, 'aria-label': 'From' });
  const to = h('input', { class: 'input', type: 'date', value: state.toDay, 'aria-label': 'To' });
  return h('div', { class: 'period-bar' }, chips, h('div', { class: 'custom-range' }, from, to, h('button', { class: 'button button--primary', type: 'button', onClick: () => { state.fromDay = from.value || state.fromDay; state.toDay = to.value || state.toDay; refresh(); } }, 'Show')));
}

function draw({ report, catalog }) {
  const spendingEntries = Object.entries(report.spending.byCategory).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  const incomeEntries = Object.entries(report.income.bySource).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  const movementEntries = Object.entries(report.accountMovement);
  const empty = spendingEntries.length === 0 && incomeEntries.length === 0 && movementEntries.length === 0;

  return h(
    'div',
    { class: 'stack' },
    periodControls(),
    h('p', { class: 'muted small', 'data-period': '' }, `${formatDate(report.from)} \u2013 ${formatDate(report.to)}`),
    empty
      ? card({}, emptyState({ icon: 'chart', title: 'Nothing recorded in this period', message: 'Choose another period, or add entries to see them here.' }))
      : [
          card(
            { title: 'What happened', id: 'summary' },
            h(
              'div',
              { class: 'summary-grid' },
              statTile({ label: 'Money received', value: formatMoney(report.income.total) }),
              statTile({ label: 'Spent', value: formatMoney(report.spending.total) }),
              h('div', { class: 'span-2' }, statTile({ label: 'Received minus spent', value: formatSigned(report.incomeMinusSpending), hint: 'Loans, savings, held money and moves between accounts are not included.' }))
            ),
            h(
              'div',
              { class: 'summary-grid' },
              statTile({ label: 'In your accounts at the start', value: formatMoney(report.opening.liquidMoney) }),
              statTile({ label: 'In your accounts at the end', value: formatMoney(report.closing.liquidMoney) }),
              statTile({ label: 'Overall position at the start', value: formatMoney(report.opening.netFinancialPosition) }),
              statTile({ label: 'Overall position at the end', value: formatMoney(report.closing.netFinancialPosition) })
            )
          ),
          spendingEntries.length ? card({ title: 'Where it went', id: 'spending' }, barList(spendingEntries, report.spending.total, catalog.names.categories, '')) : null,
          incomeEntries.length ? card({ title: 'Where it came from', id: 'income' }, barList(incomeEntries, report.income.total, catalog.names.sources, 'bar__fill--income')) : null,
          movementEntries.length
            ? card(
                { title: 'Movement by account', id: 'movement', className: 'card--tight' },
                h(
                  'div',
                  { class: 'table-wrap' },
                  h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Account'), h('th', { scope: 'col' }, 'In'), h('th', { scope: 'col' }, 'Out'), h('th', { scope: 'col' }, 'Net'))), h('tbody', {}, movementEntries.map(([id, m]) => h('tr', {}, h('th', { scope: 'row' }, catalog.names.accounts[id] ?? 'Account'), h('td', {}, formatMoney(m.moneyIn)), h('td', {}, formatMoney(m.moneyOut)), h('td', {}, formatSigned(m.net))))))
                )
              )
            : null,
        ]
  );
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const range = state.preset === 'custom' ? reportService.customRange(state.fromDay, state.toDay) : reportService.periodRange(state.preset);
      const [report, catalog] = await Promise.all([reportService.period(range), catalogService.load()]);
      return { report, catalog };
    },
    draw,
    skeletonBlocks: 3,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ reportService, catalogService });
