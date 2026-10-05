/**
 * Dashboard page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, statTile, list, listRow } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney } from '../formatters.js';
import { amountWithUnit } from '../pageKit.js';
import { openAddMenu, openEntryFlow } from '../flows/entryFlows.js';
import { createReference } from '../flows/quickCreate.js';
import { dashboardService } from '../../services/dashboardService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('dashboard', { onAdd: () => openAddMenu({ onDone: refresh }) });

const QUICK = [
  { flow: 'expense', icon: 'arrowOut', label: 'I spent money' },
  { flow: 'income', icon: 'arrowIn', label: 'I received money' },
  { flow: 'transfer', icon: 'swap', label: 'I moved money between my accounts' },
  { flow: 'held-received', icon: 'lock', label: 'Someone gave me money to hold' },
  { flow: 'loan', icon: 'users', label: 'I gave someone money and they owe me' },
];

function pendingRow(item, data) {
  switch (item.kind) {
    case 'discrepancy': {
      const name = data.accountNames[item.accountId] ?? 'An account';
      return listRow({
        icon: 'alert',
        iconTone: 'warn',
        title: `${name} does not match`,
        subtitle: item.amount === 0 ? 'Entries you added since may explain it. Review and close it.' : `Your account shows ${formatMoney(Math.abs(item.amount))} ${item.amount < 0 ? 'less' : 'more'} than the app expects.`,
        href: 'reconciliation.html',
      });
    }
    case 'expected-income':
      return listRow({ icon: 'inbox', iconTone: 'brand', title: `${data.sourceNames[item.sourceId] ?? 'Income'} still to come`, subtitle: 'Expected income not received yet', trailing: formatMoney(item.amount), href: 'income.html' });
    case 'receivable':
      return listRow({ icon: 'users', iconTone: 'brand', title: `${data.peopleNames[item.personId] ?? 'Someone'} owes you`, subtitle: 'Waiting to be paid back', trailing: formatMoney(item.amount), href: 'receivables.html' });
    default:
      return listRow({ icon: 'lock', iconTone: 'brand', title: `You hold money for ${data.peopleNames[item.personId] ?? 'someone'}`, subtitle: 'Not yours; to be given back', trailing: formatMoney(item.amount), href: 'money.html#held' });
  }
}

function draw(data) {
  if (data.isEmpty) {
    return card(
      {},
      emptyState({
        icon: 'wallet',
        title: 'Welcome to Urji Finance',
        message: 'Start by adding where your money is kept: a bank account, a mobile wallet or cash. Everything stays on this device and works without internet.',
        action: { label: 'Add my first account', onClick: async () => { if (await createReference('account')) refresh(); } },
      })
    );
  }

  const t = data.totals;
  const discrepancyBanners = data.discrepancies.map((entry) =>
    h('a', { class: 'callout callout--warn', href: 'reconciliation.html' }, icon('alert', { size: 20 }), h('span', {}, `${entry.account.name} does not match your real balance. Review it.`))
  );

  return h(
    'div',
    { class: 'stack' },
    ...discrepancyBanners,
    h(
      'section',
      { class: 'card hero', 'aria-label': 'Money in your accounts' },
      h('div', { class: 'hero__block' }, h('span', { class: 'hero__label' }, 'In your accounts'), h('span', { class: 'hero__figure', 'data-figure': 'liquid' }, amountWithUnit(t.liquidMoney))),
      h(
        'div',
        { class: 'hero__split' },
        h('div', { class: 'hero__block' }, h('span', { class: 'hero__label' }, 'Yours'), h('span', { class: 'hero__small', 'data-figure': 'yours' }, formatMoney(t.userOwnedMoney))),
        h('div', { class: 'hero__block' }, h('span', { class: 'hero__label' }, 'Held for others'), h('span', { class: 'hero__small', 'data-figure': 'held' }, formatMoney(t.liabilities)))
      )
    ),
    h('div', { class: 'quick' }, QUICK.map((q) => h('button', { class: 'quick__button', type: 'button', onClick: () => openEntryFlow(q.flow, { onDone: refresh }) }, icon(q.icon, { size: 20 }), h('span', {}, q.label)))),
    h(
      'div',
      { class: 'tiles' },
      statTile({ label: 'Savings', value: formatMoney(data.savings.total), href: 'money.html#savings' }),
      statTile({ label: 'Owed to you', value: formatMoney(data.receivables.total), href: 'receivables.html' }),
      statTile({ label: 'Income still expected', value: formatMoney(data.outstandingIncome), href: 'income.html' }),
      statTile({ label: 'Spent today', value: formatMoney(data.spending.today), href: 'transactions.html' }),
      statTile({ label: 'Spent this month', value: formatMoney(data.spending.monthToDate), href: 'reports.html' })
    ),
    h(
      'div',
      { class: 'dash-grid' },
      card(
        { title: 'Needs attention', id: 'attention', className: 'card--tight' },
        data.pending.length
          ? list(data.pending.map((item) => pendingRow(item, data)), { label: 'Needs attention' })
          : h('p', { class: 'muted', style: 'padding: 0 1rem 1rem' }, 'Nothing needs your attention right now.')
      ),
      card(
        { title: 'Accounts', id: 'accounts', className: 'card--tight', actions: [h('a', { class: 'button button--small', href: 'money.html' }, 'Manage')] },
        list(
          data.accounts.map((row) =>
            listRow({
              icon: row.account.kind === 'savings' ? 'lock' : 'wallet',
              title: row.account.name,
              subtitle: row.account.kind === 'savings' ? 'Savings' : row.account.archived ? 'Archived' : undefined,
              trailing: formatMoney(row.balance),
              href: `transactions.html?account=${encodeURIComponent(row.account.id)}`,
            })
          ),
          { label: 'Accounts' }
        )
      ),
      data.allocations.length || data.unallocated !== 0
        ? card(
            { title: 'What your money is for', id: 'purposes', className: 'card--tight', actions: [h('a', { class: 'button button--small', href: 'money.html#purposes' }, 'Manage')] },
            list(
              [
                ...data.allocations.map((row) => listRow({ icon: 'book', iconTone: 'brand', title: row.allocation.name, trailing: formatMoney(row.balance), href: 'money.html#purposes' })),
                data.unallocated !== 0 ? listRow({ icon: 'info', title: 'Not set aside yet', trailing: formatMoney(data.unallocated), href: 'money.html#purposes' }) : null,
              ],
              { label: 'Purposes' }
            )
          )
        : null,
      card(
        { title: 'Your overall position', id: 'position' },
        h('div', { class: 'stat__value stat__value--large', 'data-figure': 'net' }, amountWithUnit(t.netFinancialPosition)),
        h('p', { class: 'position-note' }, 'Money in your accounts, plus money people owe you, minus money you are holding for others. This is not the same as money you can spend.')
      )
    )
  );
}

if (boot.ok) {
  view = createView(boot.main, { load: () => dashboardService.load(), draw, skeletonBlocks: 4 });
  await view.refresh();
}

export const pageServices = Object.freeze({ dashboardService });
