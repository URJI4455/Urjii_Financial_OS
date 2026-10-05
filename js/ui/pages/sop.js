/**
 * Sop page controller.
 * Layer: ui (talks to services only; never to the engine or IndexedDB).
 */

import { bootPage } from '../app.js';
import { h } from '../dom.js';
import { createView } from '../components/view.js';
import { card, list } from '../components/card.js';
import { emptyState } from '../components/states.js';
import { toast, toastSuccess } from '../components/toast.js';
import { openSheet, confirmAction } from '../components/modal.js';
import { createForm } from '../components/form.js';
import { icon } from '../icons.js';
import { openEntryFlow } from '../flows/entryFlows.js';
import { sopService } from '../../services/sopService.js';
import { GUIDES } from '../content/guides.js';

let view;
const refresh = () => view.refresh();
const boot = await bootPage('sop', { onAdd: undefined });

function openProcedureForm(existing) {
  const sheet = openSheet({ title: existing ? 'Edit procedure' : 'Add a procedure', content: '' });
  const form = createForm({
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, value: existing?.title ?? '', placeholder: 'e.g. Month-end checklist' },
      { name: 'body', label: 'Steps or notes', type: 'textarea', value: existing?.body ?? '', placeholder: 'Write the steps in your own words' },
    ],
    submitLabel: 'Save',
    onCancel: () => sheet.close(),
    onSubmit: async (values) => {
      if (existing) await sopService.update(existing.id, { title: values.title, body: values.body ?? '' });
      else await sopService.create({ title: values.title, body: values.body ?? '' });
      sheet.close(true);
    },
  });
  sheet.setContent(form.element);
  form.focus('title');
  sheet.closed.then((saved) => {
    if (saved) {
      toastSuccess('Procedure saved.');
      refresh();
    }
  });
}

async function archiveProcedure(sop) {
  const done = await confirmAction({
    title: `Archive \u201c${sop.title}\u201d?`,
    message: 'It will be hidden from this list. You can restore it later.',
    confirmLabel: 'Archive',
    run: () => sopService.archive(sop.id, {}),
  });
  if (done) {
    toastSuccess('Archived.');
    refresh();
  }
}

function guideCard(guide) {
  const action = guide.action.flow
    ? h('button', { class: 'button button--small', type: 'button', onClick: () => openEntryFlow(guide.action.flow) }, guide.action.label)
    : h('a', { class: 'button button--small', href: guide.action.href }, guide.action.label);
  return card({ id: `guide-${guide.id}`, className: 'guide' }, h('h3', {}, guide.title), h('p', { class: 'muted' }, guide.summary), h('ol', { class: 'guide__steps' }, guide.steps.map((step) => h('li', {}, step))), h('div', { class: 'button-row' }, action));
}

function draw({ procedures, archived }) {
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'muted' }, 'Short how-tos for everyday situations, and your own procedures.'),
    h('h2', {}, 'Quick guides'),
    GUIDES.map(guideCard),
    h('h2', { style: 'margin-top: 0.5rem' }, 'My procedures'),
    procedures.length
      ? procedures.map((sop) =>
          card(
            { id: `sop-${sop.id}`, title: sop.title, actions: [h('button', { class: 'button button--small', type: 'button', onClick: () => openProcedureForm(sop) }, 'Edit'), h('button', { class: 'button button--small button--quiet', type: 'button', onClick: () => archiveProcedure(sop) }, 'Archive')] },
            sop.body ? h('p', { class: 'procedure-body' }, sop.body) : h('p', { class: 'muted' }, 'No notes yet.')
          )
        )
      : card({}, emptyState({ icon: 'book', title: 'No procedures of your own yet', message: 'Write down how you like to do things, for example your month-end routine.', action: { label: 'Add a procedure', onClick: () => openProcedureForm() } })),
    h('div', { class: 'button-row' }, h('button', { class: 'button button--primary', type: 'button', onClick: () => openProcedureForm() }, '+ Add a procedure')),
    archived.length
      ? h('details', { class: 'form__more' }, h('summary', {}, `Archived (${archived.length})`), h('div', { class: 'form__more-body' }, archived.map((sop) => h('div', { class: 'button-row' }, h('span', {}, sop.title), h('button', { class: 'link-button', type: 'button', onClick: async () => { await sopService.unarchive(sop.id, {}); refresh(); } }, 'Restore')))))
      : null
  );
}

if (boot.ok) {
  view = createView(boot.main, {
    load: async () => {
      const all = await sopService.list({ includeArchived: true });
      return { procedures: all.filter((sop) => !sop.archived), archived: all.filter((sop) => sop.archived) };
    },
    draw,
  });
  await view.refresh();
}

export const pageServices = Object.freeze({ sopService });
