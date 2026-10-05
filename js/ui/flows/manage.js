/**
 * "Manage" sheet for any named record (account, person, source, purpose, category):
 * rename, archive, restore. Nothing is ever deleted.
 * Layer: ui.
 */

import { h } from '../dom.js';
import { openSheet, confirmAction } from '../components/modal.js';
import { toastSuccess } from '../components/toast.js';
import { openNameForm } from './quickCreate.js';
import { badge } from '../components/card.js';

/**
 * openManageSheet({ title, record, entityLabel, service: { rename, archive, unarchive }, details: [Node], extraActions: [Node], onChange })
 */
export function openManageSheet({ title, record, entityLabel, service, details = [], extraActions = [], onChange }) {
  const sheet = openSheet({ title, size: 'sm', content: '' });

  const changed = () => {
    sheet.close();
    onChange?.();
  };

  const rename = async () => {
    const result = await openNameForm({
      title: `Rename ${entityLabel}`,
      initialName: record.name,
      submitLabel: 'Save name',
      onSubmit: (values) => service.rename(record.id, values.name),
    });
    if (result) {
      toastSuccess('Name saved.');
      changed();
    }
  };

  const archive = async () => {
    const done = await confirmAction({
      title: `Archive ${record.name}?`,
      message: `It will be hidden when you add new entries. Everything already recorded stays exactly as it is, and you can restore it any time.`,
      confirmLabel: 'Archive',
      reason: { label: 'Reason (optional)', required: false },
      run: (reason) => service.archive(record.id, { reason: reason || undefined }),
    });
    if (done) {
      toastSuccess('Archived.');
      changed();
    }
  };

  const unarchive = async () => {
    const done = await confirmAction({
      title: `Restore ${record.name}?`,
      message: 'It will be available for new entries again.',
      confirmLabel: 'Restore',
      run: () => service.unarchive(record.id, {}),
    });
    if (done) {
      toastSuccess('Restored.');
      changed();
    }
  };

  sheet.setContent(
    h(
      'div',
      { class: 'confirm' },
      record.archived ? h('p', {}, badge('Archived', 'warn')) : null,
      ...details,
      h(
        'div',
        { class: 'button-row' },
        h('button', { class: 'button', type: 'button', onClick: rename }, 'Rename'),
        record.archived
          ? h('button', { class: 'button', type: 'button', onClick: unarchive }, 'Restore')
          : h('button', { class: 'button', type: 'button', onClick: archive }, 'Archive'),
        ...extraActions
      )
    )
  );
  return sheet;
}
