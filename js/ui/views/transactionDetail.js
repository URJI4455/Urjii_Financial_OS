/**
 * Transaction detail sheet: what it is, what it did, its history, and how to undo it.
 * Layer: ui.
 */

import { h } from '../dom.js';
import { openSheet, confirmAction } from '../components/modal.js';
import { loadingState, errorState } from '../components/states.js';
import { badge, list, listRow } from '../components/card.js';
import { toastSuccess } from '../components/toast.js';
import { catalogService } from '../../services/catalogService.js';
import { transactionService } from '../../services/transactionService.js';
import { formatMoney, formatDate, formatDateTime } from '../formatters.js';
import { AUDIT_ACTIONS, TYPE_HELP, TYPE_ICONS, TYPE_LABELS, describeTransaction, explainMeaning } from '../labels.js';
import { friendlyError } from '../messages.js';
import { flowSign, toneForFlow } from '../pageKit.js';

const CONFIDENCE_LABELS = { confirmed: 'Confirmed', estimated: 'Estimated', reconstructed: 'Reconstructed from memory' };

export function statusBadges(transaction) {
  const badges = [];
  if (transaction.lifecycleStatus === 'voided') badges.push(badge('Cancelled', 'bad'));
  if (transaction.lifecycleStatus === 'reversed') badges.push(badge('Undone', 'warn'));
  if (transaction.confidenceStatus === 'estimated') badges.push(badge('Estimated', 'warn'));
  if (transaction.confidenceStatus === 'reconstructed') badges.push(badge('Reconstructed', 'info'));
  return badges;
}

function metaRows(t, names) {
  const rows = [['Date', formatDate(t.occurredAt)], ['Recorded', formatDateTime(t.recordedAt)]];
  const add = (label, value) => value && rows.push([label, value]);
  add('Account', names.accounts[t.accountId]);
  add('From account', names.accounts[t.fromAccountId]);
  add('To account', names.accounts[t.toAccountId]);
  add('Source', names.sources[t.sourceId]);
  add('Category', names.categories[t.categoryId]);
  add('Person', names.people[t.personId]);
  if (t.type === 'allocation_transfer') {
    add('From purpose', names.allocations[t.fromAllocationId] ?? 'Not set aside yet');
    add('To purpose', names.allocations[t.toAllocationId] ?? 'Not set aside yet');
  } else if ('allocationId' in t) {
    add('Purpose', names.allocations[t.allocationId] ?? 'Not set aside yet');
  }
  add('Note', t.note);
  add('Reason', t.reason);
  add('How sure', CONFIDENCE_LABELS[t.confidenceStatus]);
  return rows;
}

export function openTransactionDetail(id, { onChange } = {}) {
  const sheet = openSheet({ title: 'Entry', content: loadingState(), size: 'lg' });

  async function show(entryId) {
    sheet.setContent(loadingState());
    try {
      const [detail, catalog] = await Promise.all([transactionService.detail(entryId), catalogService.load()]);
      if (!detail.row) {
        sheet.setContent(errorState({ title: 'Entry not found', message: 'It may have been removed. Close this and reload the page.' }));
        return;
      }
      draw(detail, catalog);
    } catch (error) {
      sheet.setContent(errorState({ message: friendlyError(error).message, onRetry: () => show(entryId) }));
    }
  }

  function draw(detail, catalog) {
    const { row, history, related } = detail;
    const t = row.transaction;
    const rowsById = new Map([row, ...related].map((entry) => [entry.transaction.id, entry]));
    const info = describeTransaction(t, catalog.names, rowsById);
    sheet.setTitle(TYPE_LABELS[t.type]);

    const cancelled = t.lifecycleStatus === 'voided';
    const amountText = `${flowSign(row.flow)}${formatMoney(t.amount)}`;
    const explanation = explainMeaning(row.meaning, formatMoney);

    const undoActions = [];
    if (t.lifecycleStatus === 'posted' && t.type !== 'reversal') {
      undoActions.push(
        h(
          'section',
          { class: 'sheet-section' },
          h('h3', { class: 'sheet-section__title' }, 'Something wrong?'),
          h(
            'div',
            { class: 'button-row' },
            h('button', { class: 'button button--outline', type: 'button', onClick: () => cancelEntry(t, info) }, 'It was a mistake'),
            h('button', { class: 'button button--outline', type: 'button', onClick: () => undoEntry(t, info) }, 'It happened, but was undone')
          ),
          h('p', { class: 'field__help' }, 'Nothing is ever deleted. Both options keep a record in the history.')
        )
      );
    }

    sheet.setContent(
      h(
        'div',
        { class: 'confirm' },
        h(
          'div',
          { class: 'detail-head' },
          h('div', { class: `detail-amount ${row.flow === 'in' ? 'detail-amount--in' : ''} ${cancelled ? 'is-struck' : ''}` }, amountText),
          h('p', { class: 'row__title' }, info.title),
          info.subtitle ? h('p', { class: 'muted' }, info.subtitle) : null,
          h('p', { class: 'row__badges' }, statusBadges(t))
        ),
        cancelled
          ? h('p', { class: 'callout callout--warn' }, 'This entry was cancelled. It is kept for the record but does not count in any total.')
          : h(
              'section',
              { class: 'sheet-section' },
              h('h3', { class: 'sheet-section__title' }, 'What this did'),
              h('ul', { class: 'bullets' }, explanation.map((line) => h('li', {}, line))),
              h('p', { class: 'field__help' }, TYPE_HELP[t.type])
            ),
        h('dl', { class: 'meta' }, metaRows(t, catalog.names).map(([label, value]) => h('div', { class: 'meta__row' }, h('dt', {}, label), h('dd', {}, value)))),
        related.length
          ? h(
              'section',
              { class: 'sheet-section' },
              h('h3', { class: 'sheet-section__title' }, 'Connected entries'),
              h(
                'div',
                { class: 'card card--tight' },
                list(
                  related.map((entry) => {
                    const relatedInfo = describeTransaction(entry.transaction, catalog.names, rowsById);
                    return listRow({
                      icon: TYPE_ICONS[entry.transaction.type],
                      iconTone: toneForFlow(entry.flow),
                      title: relatedInfo.title,
                      subtitle: formatDate(entry.transaction.occurredAt),
                      trailing: `${flowSign(entry.flow)}${formatMoney(entry.transaction.amount)}`,
                      onClick: () => show(entry.transaction.id),
                    });
                  })
                )
              )
            )
          : null,
        ...undoActions,
        h(
          'section',
          { class: 'sheet-section' },
          h('h3', { class: 'sheet-section__title' }, 'History'),
          h(
            'ol',
            { class: 'timeline' },
            history.map((entry) =>
              h(
                'li',
                { class: 'timeline__item' },
                h('strong', {}, AUDIT_ACTIONS[entry.action] ?? entry.action),
                entry.reason ? h('span', {}, `\u201c${entry.reason}\u201d`) : null,
                h('span', { class: 'timeline__when' }, formatDateTime(entry.timestamp))
              )
            )
          )
        )
      )
    );
  }

  async function cancelEntry(t, info) {
    const done = await confirmAction({
      title: 'Cancel this entry?',
      message: `Use this when the entry should never have been recorded, for example you entered it twice. It stops counting in every total, as if it never happened. A record that it existed stays in the history.`,
      confirmLabel: 'Cancel this entry',
      tone: 'danger',
      reason: { label: 'Why is it a mistake?', required: true, help: 'For example: entered twice.' },
      run: (reason) => transactionService.voidTransaction(t.id, reason),
    });
    if (done) finished('Entry cancelled.');
  }

  async function undoEntry(t, info) {
    const done = await confirmAction({
      title: 'Mark this as undone?',
      message: 'Use this when the money really did move but was later undone, for example a payment that bounced. The original stays on record and a matching "undone" entry is added, so your totals go back to where they were.',
      confirmLabel: 'Mark as undone',
      reason: { label: 'What happened?', required: true, help: 'For example: payment bounced.' },
      run: (reason) => transactionService.reverseTransaction(t.id, reason),
    });
    if (done) finished('Entry marked as undone.');
  }

  function finished(message) {
    toastSuccess(message);
    sheet.close(true);
    onChange?.();
  }

  show(id);
  return sheet;
}
