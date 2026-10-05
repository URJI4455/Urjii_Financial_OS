/**
 * Income page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, statTile, badge, list, listRow, progressBar } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { icon } from '../icons.js';
import { formatMoney } from '../formatters.js';
import { amountWithUnit } from '../pageKit.js';
import { openAddMenu, openEntryFlow } from '../flows/entryFlows.js';
import { createReference } from '../flows/quickCreate.js';
import { openManageSheet } from '../flows/manage.js';
import { incomeService } from '../../services/incomeService.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('income', { onAdd: () => openAddMenu({ onDone: refresh }) });

function manageSource(row) {
  openManageSheet({
    title: row.source.name,
    record: row.source,
    entityLabel: 'income source',
    service: { rename: incomeService.renameSource, archive: incomeService.archiveSource, unarchive: incomeService.unarchiveSource },
    onChange: refresh,
    details: [h('div', { class: 'stat' }, h('span', { class: 'stat__label' }, 'Received from this source'), h('span', { class: 'stat__value' }, amountWithUnit(row.received)))],
  });
}

function draw(data) {
  const names = Object.fromEntries(data.sources.map((row) => [row.source.id, row.source.name]));

  const summary = card(
    { title: 'Income', id: 'summary' },
    h(
      'div',
      { class: 'summary-grid' },
      statTile({ label: 'Received so far', value: amountWithUnit(data.total), large: false }),
      statTile({ label: 'Still expected', value: amountWithUnit(data.outstandingTotal), tone: data.outstandingTotal > 0 ? 'warn' : undefined })
    ),
    h('div', { class: 'button-row' }, h('button', { class: 'button button--primary', type: 'button', onClick: () => openEntryFlow('income', { onDone: refresh }) }, 'I received money'))
  );

  const expected = card(
    { title: 'Still expected', id: 'expected', className: 'card--tight', subtitle: 'Payments you are still waiting for.' },
    data.openExpectations.length
      ? data.openExpectations.map((entry) =>
          h(
            'div',
            { class: 'expectation' },
            h('div', { class: 'expectation__head' }, h('span', {}, names[entry.sourceId] ?? 'Income'), h('span', {}, `${formatMoney(entry.outstanding)} to come`)),
            progressBar(entry.received, entry.expected, 'Share received'),
            h('div', { class: 'expectation__meta' }, h('span', {}, `Expected ${formatMoney(entry.expected)}`), h('span', {}, `Received ${formatMoney(entry.received)}`)),
            h('div', { class: 'holder__actions' }, h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow('income', { prefill: { expectationId: entry.id, sourceId: entry.sourceId }, onDone: refresh }) }, 'Record this payment'))
          )
        )
      : emptyState({ icon: 'check', title: 'Nothing is outstanding', message: 'When you record income with an expected total, the part still to come shows here.' }),
    data.settledExpectations.length
      ? h('details', { class: 'form__more', style: 'margin: 0 1rem 1rem' }, h('summary', {}, `Fully received (${data.settledExpectations.length})`), h('div', { class: 'form__more-body' }, data.settledExpectations.map((entry) => h('p', { class: 'small' }, `${names[entry.sourceId] ?? 'Income'}: ${formatMoney(entry.expected)} received in full`))))
      : null
  );

  const sources = card(
    { title: 'Where your income comes from', id: 'sources', className: 'card--tight', actions: [h('button', { class: 'button button--small', type: 'button', onClick: async () => { if (await createReference('source')) refresh(); } }, '+ Add source')] },
    data.sources.length
      ? list(data.sources.map((row) => listRow({ icon: 'inbox', iconTone: 'brand', title: row.source.name, badges: row.source.archived ? [badge('Archived', 'warn')] : [], trailing: formatMoney(row.received), trailingSub: 'received', onClick: () => manageSource(row) })), { label: 'Income sources' })
      : emptyState({ icon: 'inbox', title: 'No income sources yet', message: 'Add who pays you, for example an employer or a client.', action: { label: 'Add a source', onClick: async () => { if (await createReference('source')) refresh(); } } })
  );

  return h('div', { class: 'stack' }, summary, expected, sources);
}

if (boot.ok) {
  view = createView(boot.main, { load: () => incomeService.overview(), draw });
  await view.refresh();
}

export const pageServices = Object.freeze({ incomeService });
