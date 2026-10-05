/**
 * Settings page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, badge, list, listRow } from '../components/card.js';
import { toast, toastSuccess, toastError, toastWarning } from '../components/toast.js';
import { createForm } from '../components/form.js';
import { icon } from '../icons.js';
import { formatDate, formatDateTime } from '../formatters.js';
import { downloadText, formatBytes } from '../pageKit.js';
import { friendlyError } from '../messages.js';
import { createReference } from '../flows/quickCreate.js';
import { openManageSheet } from '../flows/manage.js';
import { catalogService } from '../../services/catalogService.js';
import { settingsService } from '../../services/settingsService.js';
import { backupService } from '../../services/backupService.js';
import { auditService } from '../../services/auditService.js';
import { systemService } from '../../services/systemService.js';
import { accountService } from '../../services/accountService.js';
import { peopleService } from '../../services/peopleService.js';
import { incomeService } from '../../services/incomeService.js';
import { allocationService } from '../../services/allocationService.js';
import { categoryService } from '../../services/categoryService.js';
import { setCurrency } from '../formatters.js';
import { AUDIT_ACTIONS, ENTITY_LABELS } from '../labels.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('settings', { onAdd: undefined });

const GROUPS = [
  { key: 'accounts', title: 'Accounts', kind: 'account', service: accountService, label: 'account', icon: 'wallet' },
  { key: 'people', title: 'People', kind: 'person', service: peopleService, label: 'person', icon: 'users' },
  { key: 'sources', title: 'Income sources', kind: 'source', service: { rename: incomeService.renameSource, archive: incomeService.archiveSource, unarchive: incomeService.unarchiveSource }, label: 'income source', icon: 'inbox' },
  { key: 'allocations', title: 'Purposes', kind: 'allocation', service: allocationService, label: 'purpose', icon: 'book' },
  { key: 'categories', title: 'Categories', kind: 'category', service: categoryService, label: 'category', icon: 'list' },
];

function categoryExtras(record, catalog) {
  const active = catalog.active.categories;
  const index = active.findIndex((category) => category.id === record.id);
  if (index < 0) return [];
  const move = async (offset) => {
    const order = active.map((category) => category.id);
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    try {
      await categoryService.reorder(order, { reason: 'Reordered in settings' });
      refresh();
    } catch (error) {
      toastError(friendlyError(error).message);
    }
  };
  return [
    index > 0 ? h('button', { class: 'button', type: 'button', onClick: () => move(-1) }, 'Move up') : null,
    index < active.length - 1 ? h('button', { class: 'button', type: 'button', onClick: () => move(1) }, 'Move down') : null,
  ].filter(Boolean);
}

function groupCard(group, catalog) {
  const records = catalog[group.key];
  const options = group.key === 'categories' ? { categories: catalog.active.categories } : group.key === 'accounts' ? {} : undefined;
  return card(
    { title: group.title, id: `names-${group.key}`, className: 'card--tight manage-list', actions: [h('button', { class: 'button button--small', type: 'button', onClick: async () => { if (await createReference(group.kind, options)) refresh(); } }, '+ Add')] },
    records.length
      ? list(
          records.map((record) =>
            listRow({
              icon: group.icon,
              title: record.name,
              subtitle: group.key === 'accounts' && record.kind === 'savings' ? 'Savings' : group.key === 'categories' && record.parentId ? `Inside ${catalog.names.categories[record.parentId] ?? 'another category'}` : undefined,
              badges: record.archived ? [badge('Archived', 'warn')] : [],
              muted: record.archived,
              onClick: () => openManageSheet({ title: record.name, record, entityLabel: group.label, service: group.service, onChange: refresh, extraActions: group.key === 'categories' ? categoryExtras(record, catalog) : [] }),
            })
          ),
          { label: group.title }
        )
      : h('p', { class: 'muted', style: 'padding: 0 1rem 1rem' }, `No ${group.title.toLowerCase()} yet.`)
  );
}

function currencyCard(settings) {
  const form = createForm({
    fields: [{ name: 'value', label: 'Currency label', type: 'text', required: true, value: settings.currencyLabel, help: 'Shown next to amounts, for example ETB or USD (up to 8 characters).' }],
    submitLabel: 'Save',
    onSubmit: async (values) => {
      const saved = await settingsService.set('currencyLabel', values.value);
      setCurrency(saved.value);
      toastSuccess('Currency label saved.');
      refresh();
    },
  });
  return card({ title: 'Currency', id: 'currency' }, form.element);
}

function backupCard(storage) {
  const exportButton = h('button', { class: 'button button--primary', type: 'button', onClick: async () => {
    exportButton.disabled = true;
    try {
      const file = await backupService.exportJson();
      downloadText(file.filename, file.text);
      toastSuccess(`Backup downloaded (${file.totalRecords} records).`);
    } catch (error) {
      toastError(friendlyError(error).message);
    } finally {
      exportButton.disabled = false;
    }
  } }, icon('download', { size: 18 }), h('span', {}, 'Download a backup'));

  return card(
    { title: 'Backup', id: 'backup', subtitle: 'A copy of everything, as one file.' },
    h('p', { class: 'file-note' }, 'The file contains all of your financial records and is not encrypted. Keep it somewhere private.'),
    h('div', { class: 'button-row' }, exportButton, h('button', { class: 'button', type: 'button', disabled: true }, 'Restore (coming soon)')),
    h('p', { class: 'file-note' }, storage.persisted === true ? 'Your browser has agreed to keep this data. It will not be cleared automatically.' : storage.persisted === false ? 'Your browser may clear this data if the device runs low on space. Download backups regularly.' : 'Storage protection status is not available in this browser.'),
    storage.persisted === false ? h('div', { class: 'button-row' }, h('button', { class: 'button button--small', type: 'button', onClick: async () => { const granted = await systemService.requestPersistence(); (granted ? toastSuccess : toastWarning)(granted ? 'Your data is now protected from automatic clearing.' : 'The browser did not grant extra protection. Keep backups.'); refresh(); } }, 'Ask the browser to protect my data')) : null,
    storage.usage !== null ? h('p', { class: 'file-note' }, `Storage used by this app: ${formatBytes(storage.usage)}.`) : null
  );
}

function historyCard(entries, catalog) {
  const nameOf = (entry) => catalog.names[entry.entity]?.[entry.entityId] ?? ENTITY_LABELS[entry.entity] ?? 'Item';
  return card(
    { title: 'History', id: 'history', className: 'card--tight', subtitle: 'What changed, and why. The newest 30 changes.' },
    entries.length
      ? h('div', {}, entries.map((entry) => h('div', { class: 'audit-entry' }, h('strong', {}, `${AUDIT_ACTIONS[entry.action] ?? entry.action}: ${entry.entity === 'transactions' ? 'an entry' : nameOf(entry)}`), entry.reason ? h('span', {}, `\u201c${entry.reason}\u201d`) : null, h('span', { class: 'audit-entry__meta' }, `${ENTITY_LABELS[entry.entity] ?? entry.entity} \u00b7 ${formatDateTime(entry.timestamp)}`))))
      : h('p', { class: 'muted', style: 'padding: 0 1rem 1rem' }, 'Nothing has changed yet.')
  );
}

function draw({ catalog, settings, storage, audit }) {
  return h(
    'div',
    { class: 'stack' },
    currencyCard(settings),
    backupCard(storage),
    GROUPS.map((group) => groupCard(group, catalog)),
    historyCard(audit, catalog),
    card({ title: 'About', id: 'about' }, h('p', { class: 'muted' }, 'Urji Finance OS v0.4.0. Private and offline: your records stay on this device, there are no accounts, no tracking and no servers.'))
  );
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const [catalog, settings, storage, audit] = await Promise.all([catalogService.load(), settingsService.getAll(), systemService.storageStatus(), auditService.recent(30)]);
      return { catalog, settings, storage, audit };
    },
    draw,
    skeletonBlocks: 4,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ catalogService, settingsService, backupService, auditService });
