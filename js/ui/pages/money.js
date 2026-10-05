/**
 * Money page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, badge, list, listRow, progressBar } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney, formatDate } from '../formatters.js';
import { amountWithUnit, scrollToHash } from '../pageKit.js';
import { openAddMenu, openEntryFlow } from '../flows/entryFlows.js';
import { createReference } from '../flows/quickCreate.js';
import { openManageSheet } from '../flows/manage.js';
import { accountService } from '../../services/accountService.js';
import { savingsService } from '../../services/savingsService.js';
import { allocationService } from '../../services/allocationService.js';
import { heldMoneyService } from '../../services/heldMoneyService.js';
import { peopleService } from '../../services/peopleService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('money', { onAdd: () => openAddMenu({ onDone: refresh }) });

function manageAccount(row) {
  openManageSheet({
    title: row.account.name,
    record: row.account,
    entityLabel: 'account',
    service: accountService,
    onChange: refresh,
    details: [
      h('div', { class: 'stat' }, h('span', { class: 'stat__label' }, row.account.kind === 'savings' ? 'Savings balance' : 'Balance'), h('span', { class: 'stat__value' }, amountWithUnit(row.balance))),
    ],
    extraActions: [
      h('a', { class: 'button', href: `transactions.html?account=${encodeURIComponent(row.account.id)}` }, 'See entries'),
      h('a', { class: 'button', href: 'reconciliation.html' }, 'Check balance'),
    ],
  });
}

function managePurpose(row) {
  openManageSheet({
    title: row.allocation.name,
    record: row.allocation,
    entityLabel: 'purpose',
    service: allocationService,
    onChange: refresh,
    details: [h('div', { class: 'stat' }, h('span', { class: 'stat__label' }, 'Set aside for this'), h('span', { class: 'stat__value' }, amountWithUnit(row.balance)))],
  });
}

function draw({ accounts, savings, purposes, held }) {
  const accountsCard = card(
    { title: 'Accounts', id: 'accounts', className: 'card--tight', subtitle: undefined, actions: [h('button', { class: 'button button--small', type: 'button', onClick: async () => { if (await createReference('account')) refresh(); } }, '+ Add account')] },
    accounts.rows.length
      ? list(accounts.rows.map((row) => listRow({ icon: row.account.kind === 'savings' ? 'lock' : 'wallet', title: row.account.name, subtitle: row.account.kind === 'savings' ? 'Savings' : undefined, badges: row.account.archived ? [badge('Archived', 'warn')] : [], trailing: formatMoney(row.balance), onClick: () => manageAccount(row) })), { label: 'Accounts' })
      : emptyState({ icon: 'wallet', title: 'No accounts yet', message: 'Add a bank account, a mobile wallet or cash.', action: { label: 'Add an account', onClick: async () => { if (await createReference('account')) refresh(); } } }),
    accounts.rows.length ? h('p', { class: 'small muted', style: 'padding: 0 1rem 1rem' }, `Total in your accounts: ${formatMoney(accounts.totals.liquidMoney)}${accounts.totals.liabilities !== 0 ? `, of which ${formatMoney(accounts.totals.liabilities)} is held for others.` : '.'}`) : null
  );

  const savingsCard = card(
    { title: 'Savings', id: 'savings', subtitle: 'Money you have put aside in savings accounts.' },
    h('div', { class: 'section-total' }, amountWithUnit(savings.total)),
    savings.rows.length
      ? list(savings.rows.map((row) => listRow({ icon: 'lock', title: row.account.name, trailing: formatMoney(row.balance), onClick: () => manageAccount(row) })), { label: 'Savings accounts' })
      : h('p', { class: 'muted' }, 'You have no savings account yet.'),
    h(
      'div',
      { class: 'button-row' },
      savings.rows.length
        ? [
            h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('savings-deposit', { onDone: refresh }) }, 'Put money in'),
            h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('savings-withdrawal', { onDone: refresh }) }, 'Take money out'),
          ]
        : h('button', { class: 'button button--small', type: 'button', onClick: async () => { if (await createReference('account', { accountKind: 'savings' })) refresh(); } }, '+ Add a savings account')
    )
  );

  const purposesCard = card(
    { title: 'What your money is for', id: 'purposes', className: 'card--tight', subtitle: 'Plans for your own money. This is not an account and not a spending category.' },
    list(
      [
        ...purposes.rows.map((row) => listRow({ icon: 'book', iconTone: 'brand', title: row.allocation.name, badges: row.allocation.archived ? [badge('Archived', 'warn')] : [], trailing: formatMoney(row.balance), onClick: () => managePurpose(row) })),
        listRow({ icon: 'info', title: 'Not set aside yet', subtitle: 'Your money without a plan', trailing: formatMoney(purposes.unallocated) }),
      ],
      { label: 'Purposes' }
    ),
    h(
      'div',
      { class: 'button-row', style: 'padding: 0 1rem 1rem' },
      h('button', { class: 'button button--small', type: 'button', onClick: async () => { if (await createReference('allocation')) refresh(); } }, '+ Add a purpose'),
      h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('allocation-transfer', { onDone: refresh }) }, 'Set money aside')
    )
  );

  const heldCard = card(
    { title: 'Money I am holding for others', id: 'held', className: 'card--tight', subtitle: 'In your accounts, but not yours. Not counted as your income.' },
    held.people.length
      ? held.people.map((group) =>
          h(
            'div',
            {},
            h('div', { class: 'person-head' }, h('span', { class: 'person-head__name' }, held.names[group.personId] ?? 'Someone'), h('span', {}, `You hold ${formatMoney(group.remaining)}`)),
            group.items.map((item) =>
              h(
                'div',
                { class: 'holder' },
                h('div', { class: 'holder__head' }, h('span', {}, `Given ${formatDate(item.history[0].occurredAt)}`), h('span', {}, formatMoney(item.remainingAmount))),
                h('div', { class: 'holder__meta' }, `Received ${formatMoney(item.originalAmount)} \u00b7 Given back ${formatMoney(item.returnedAmount)}`),
                progressBar(item.returnedAmount, item.originalAmount, 'Share given back'),
                h('div', { class: 'holder__actions' }, h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('held-return', { prefill: { heldMoneyId: item.agreementId }, onDone: refresh }) }, 'Give some back'))
              )
            )
          )
        )
      : h('p', { class: 'muted', style: 'padding: 0 1rem' }, 'You are not holding money for anyone.'),
    h('div', { class: 'button-row', style: 'padding: 0 1rem 1rem' }, h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('held-received', { onDone: refresh }) }, 'Someone gave me money to hold')),
    held.settled.length
      ? h('details', { class: 'form__more', style: 'margin: 0 1rem 1rem' }, h('summary', {}, `Given back in full (${held.settled.length})`), h('div', { class: 'form__more-body' }, held.settled.map((item) => h('p', { class: 'small' }, `${held.names[item.personId] ?? 'Someone'}: ${formatMoney(item.originalAmount)}, given back`))))
      : null
  );

  return h('div', { class: 'stack' }, accountsCard, savingsCard, purposesCard, heldCard);
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const [accounts, savings, purposes, heldOverview, people] = await Promise.all([accountService.overview(), savingsService.overview(), allocationService.overview(), heldMoneyService.overview(), peopleService.list({ includeArchived: true })]);
      return { accounts, savings, purposes, held: { ...heldOverview, names: Object.fromEntries(people.map((person) => [person.id, person.name])) } };
    },
    draw,
    skeletonBlocks: 4,
  });
  await view.refresh();
  scrollToHash();
}

export const pageServices = Object.freeze({ accountService, savingsService, allocationService, heldMoneyService, peopleService });
