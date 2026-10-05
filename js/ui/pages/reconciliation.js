/**
 * Reconciliation page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, badge } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { toast, toastSuccess, toastWarning } from '../components/toast.js';
import { confirmAction } from '../components/modal.js';
import { createForm } from '../components/form.js';
import { icon } from '../icons.js';
import { formatMoney, formatSigned, formatDate, formatDateTime } from '../formatters.js';
import { amountWithUnit } from '../pageKit.js';
import { openAddMenu } from '../flows/entryFlows.js';
import { reconciliationService } from '../../services/reconciliationService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('reconciliation', { onAdd: () => openAddMenu({ onDone: refresh }) });

async function fixDifference(entry) {
  const open = entry.openDiscrepancy;
  const explained = open.currentDifference === 0;
  const direction = open.currentDifference > 0 ? 'up' : 'down';
  const done = await confirmAction({
    title: explained ? 'Close this difference?' : 'Fix the difference?',
    message: explained
      ? 'The entries you added since the check now explain the difference. Nothing will be changed in your records.'
      : `This adds a balance correction that moves the balance of ${entry.account.name} ${direction} by ${formatMoney(Math.abs(open.currentDifference))}, so the app matches what your account really shows. It is not counted as spending or income, and it stays in the history.`,
    confirmLabel: explained ? 'Close it' : 'Add the correction',
    reason: { label: 'Reason', required: true, help: explained ? undefined : 'For example: bank fee not recorded.', defaultValue: explained ? 'Explained by entries added after the check' : '' },
    run: (reason) => reconciliationService.resolveWithAdjustment(open.checkId, reason),
  });
  if (done) {
    toastSuccess(explained ? 'Difference closed.' : 'Balance correction added.');
    refresh();
  }
}

function accountCard(entry, history) {
  const { account, expectedAmount, lastCheck, openDiscrepancy } = entry;
  const form = createForm({
    fields: [{ name: 'actualAmount', label: 'What does your account really show?', type: 'balance', required: true, placeholder: '0.00' }],
    submitLabel: 'Check',
    pendingLabel: 'Checking\u2026',
    onSubmit: async (values) => {
      const { record } = await reconciliationService.check(account.id, values.actualAmount);
      if (record.status === 'matched') toastSuccess('It matches. Nothing to fix.');
      else toastWarning('There is a difference. Decide how to handle it below.');
      refresh();
    },
  });

  let result = null;
  if (openDiscrepancy) {
    const diff = openDiscrepancy.currentDifference;
    result = h(
      'div',
      { class: 'result result--diff' },
      h('div', { class: 'result__title' }, icon('alert', { size: 18 }), diff === 0 ? 'Looks explained now' : 'The balances do not match'),
      h('p', {}, diff === 0 ? 'Entries you added since the last check now explain the difference.' : `Your account shows ${formatMoney(Math.abs(diff))} ${diff < 0 ? 'less' : 'more'} than the app expects (checked ${formatDateTime(lastCheck.checkedAt)}).`),
      h(
        'div',
        { class: 'button-row' },
        h('a', { class: 'button button--small', href: `transactions.html?account=${encodeURIComponent(account.id)}` }, 'Look for a missing entry'),
        h('button', { class: 'button button--small button--primary', type: 'button', onClick: () => fixDifference(entry) }, diff === 0 ? 'Close it' : 'Fix the difference')
      ),
      h('p', { class: 'field__help' }, 'Decide later is fine: this stays flagged on your home screen until you resolve it.')
    );
  } else if (lastCheck && lastCheck.status === 'matched') {
    result = h('div', { class: 'result result--ok' }, h('div', { class: 'result__title' }, icon('check', { size: 18 }), 'It matched'), h('p', { class: 'small' }, `Checked ${formatDateTime(lastCheck.checkedAt)}.`));
  } else if (lastCheck && lastCheck.resolved) {
    result = h('div', { class: 'result result--ok' }, h('div', { class: 'result__title' }, icon('check', { size: 18 }), 'Resolved'), h('p', { class: 'small' }, `Last check ${formatDateTime(lastCheck.checkedAt)}.`));
  }

  return card(
    { id: `account-${account.id}`, className: 'check-card' },
    h('div', { class: 'check-card__head' }, h('h2', { class: 'card__title' }, account.name, account.kind === 'savings' ? h('span', {}, ' ', badge('Savings')) : null), h('span', { class: 'small muted' }, 'The app expects')),
    h('div', { class: 'expected', 'data-expected': account.id }, amountWithUnit(expectedAmount)),
    result,
    form.element,
    history.length
      ? h(
          'details',
          { class: 'form__more' },
          h('summary', {}, `Past checks (${history.length})`),
          h('div', { class: 'form__more-body' }, h('ul', { class: 'bullets' }, history.slice(0, 8).map((record) => h('li', {}, `${formatDate(record.checkedAt)}: ${record.status === 'matched' ? 'matched' : `difference ${formatSigned(record.difference)}${record.resolved ? ', resolved' : ''}`}`))))
        )
      : null
  );
}

function draw({ overview, histories }) {
  if (overview.length === 0) {
    return card({}, emptyState({ icon: 'scale', title: 'No accounts to check yet', message: 'Add an account first, then come back to compare it with your real balance.', action: { label: 'Go to Money', href: 'money.html' } }));
  }
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'callout' }, icon('info', { size: 20 }), h('span', {}, 'Open your bank or wallet app and type the balance it shows. If it differs from what the app expects, you can look for a missing entry or add a clearly labelled correction.')),
    overview.map((entry) => accountCard(entry, histories[entry.account.id] ?? []))
  );
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const overview = await reconciliationService.overview();
      const histories = Object.fromEntries(await Promise.all(overview.map(async (entry) => [entry.account.id, await reconciliationService.history(entry.account.id)])));
      return { overview, histories };
    },
    draw,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ reconciliationService });
