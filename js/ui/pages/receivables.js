/**
 * Receivables page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, list, progressBar } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney, formatDate } from '../formatters.js';
import { amountWithUnit } from '../pageKit.js';
import { openEntryFlow } from '../flows/entryFlows.js';
import { TYPE_LABELS } from '../labels.js';
import { receivableService } from '../../services/receivableService.js';
import { peopleService } from '../../services/peopleService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('receivables', { onAdd: () => openEntryFlow('loan', { onDone: refresh }) });

function loanBlock(item, names) {
  return h(
    'div',
    { class: 'loan' },
    h('div', { class: 'loan__head' }, h('span', {}, `Lent ${formatDate(item.history[0].occurredAt)}`), h('span', {}, `${formatMoney(item.remainingAmount)} still owed`)),
    progressBar(item.settledAmount, item.originalAmount, 'Share paid back'),
    h('div', { class: 'loan__meta' }, h('span', {}, `Lent ${formatMoney(item.originalAmount)}`), h('span', {}, `Paid back ${formatMoney(item.settledAmount)}`)),
    h(
      'div',
      { class: 'holder__actions' },
      h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('settlement', { prefill: { receivableId: item.agreementId }, onDone: refresh }) }, 'Record a repayment')
    ),
    h(
      'details',
      { class: 'form__more' },
      h('summary', {}, 'History'),
      h('div', { class: 'form__more-body' }, h('ul', { class: 'bullets' }, item.history.map((entry) => h('li', {}, `${formatDate(entry.occurredAt)}: ${TYPE_LABELS[entry.type]}, ${formatMoney(entry.amount)}${entry.lifecycleStatus === 'voided' ? ' (cancelled)' : entry.lifecycleStatus === 'reversed' ? ' (undone)' : ''}`))))
    )
  );
}

function draw({ data, names }) {
  const total = card(
    { title: 'People who owe you', id: 'total' },
    h('div', { class: 'section-total' }, amountWithUnit(data.total)),
    h('div', { class: 'button-row' }, h('button', { class: 'button button--primary', type: 'button', onClick: () => openEntryFlow('loan', { onDone: refresh }) }, 'I gave someone money and they owe me'))
  );

  const owed = data.people.length
    ? card(
        { className: 'card--tight' },
        data.people.map((group) => h('div', {}, h('div', { class: 'person-head' }, h('span', { class: 'person-head__name' }, names[group.personId] ?? 'Someone'), h('span', {}, `owes you ${formatMoney(group.remaining)}`)), group.items.map((item) => loanBlock(item, names))))
      )
    : card({}, emptyState({ icon: 'users', title: 'Nobody owes you money', message: 'When you lend money, it appears here until it is paid back. A loan is never counted as spending.', action: { label: 'I gave someone money', onClick: () => openEntryFlow('loan', { onDone: refresh }) } }));

  const settled = data.settled.length
    ? card(
        { className: 'card--tight' },
        h('details', {}, h('summary', { style: 'padding: 1rem; cursor: pointer; font-weight: 650' }, `Fully paid back (${data.settled.length})`), data.settled.map((item) => h('div', { class: 'loan' }, h('div', { class: 'loan__head' }, h('span', {}, `${names[item.personId] ?? 'Someone'} \u00b7 ${formatDate(item.history[0].occurredAt)}`), h('span', {}, formatMoney(item.originalAmount))), h('div', { class: 'loan__meta' }, 'Paid back in full'))))
      )
    : null;

  return h('div', { class: 'stack' }, total, owed, settled);
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const [data, people] = await Promise.all([receivableService.overview(), peopleService.list({ includeArchived: true })]);
      return { data, names: Object.fromEntries(people.map((person) => [person.id, person.name])) };
    },
    draw,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ receivableService, peopleService });
