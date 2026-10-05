/**
 * Small "add a name" dialogs: new account, person, income source, purpose, category.
 * Layer: ui (talks to services only).
 */

import { h } from '../dom.js';
import { openSheet } from '../components/modal.js';
import { createForm } from '../components/form.js';
import { accountService } from '../../services/accountService.js';
import { peopleService } from '../../services/peopleService.js';
import { incomeService } from '../../services/incomeService.js';
import { allocationService } from '../../services/allocationService.js';
import { categoryService } from '../../services/categoryService.js';

/** openNameForm({ title, nameLabel, initialName, extraFields, onSubmit(values) -> record }) -> Promise<record | null> */
export function openNameForm({ title, intro, nameLabel = 'Name', initialName = '', placeholder, submitLabel = 'Save', extraFields = [], onSubmit }) {
  return new Promise((resolve) => {
    const sheet = openSheet({ title, size: 'sm', content: '' });
    const form = createForm({
      fields: [{ name: 'name', label: nameLabel, type: 'text', required: true, value: initialName, placeholder }, ...extraFields],
      submitLabel,
      intro: intro ? h('p', { class: 'muted' }, intro) : null,
      onSubmit: async (values) => {
        const record = await onSubmit(values);
        sheet.close(record ?? true);
      },
      onCancel: () => sheet.close(null),
    });
    sheet.setContent(form.element);
    form.focus('name');
    sheet.closed.then((result) => resolve(result ?? null));
  });
}

const KINDS = [
  { value: 'standard', label: 'Everyday account (bank, mobile wallet, cash)' },
  { value: 'savings', label: 'Savings' },
];

/**
 * createReference('account' | 'person' | 'source' | 'allocation' | 'category', options) -> Promise<record | null>
 * options.accountKind fixes the kind of a new account (no kind question is asked).
 */
export function createReference(kind, { accountKind, categories = [] } = {}) {
  switch (kind) {
    case 'account':
      return openNameForm({
        title: accountKind === 'savings' ? 'Add a savings account' : 'Add an account',
        nameLabel: 'What is it called?',
        placeholder: 'e.g. CBE, Telebirr, Cash',
        intro: 'An account is any place your money is kept. You can add more later.',
        submitLabel: 'Add account',
        extraFields: accountKind ? [] : [{ name: 'kind', label: 'What kind is it?', type: 'select', required: true, value: 'standard', options: KINDS, placeholder: 'Choose\u2026' }],
        onSubmit: (values) => accountService.create({ name: values.name, kind: accountKind ?? values.kind ?? 'standard' }),
      });
    case 'person':
      return openNameForm({ title: 'Add a person', nameLabel: 'Their name', submitLabel: 'Add person', onSubmit: (v) => peopleService.create({ name: v.name }) });
    case 'source':
      return openNameForm({
        title: 'Add an income source',
        nameLabel: 'Who or what pays you?',
        placeholder: 'e.g. Kemer, a client, a gift',
        submitLabel: 'Add source',
        onSubmit: (v) => incomeService.createSource({ name: v.name }),
      });
    case 'allocation':
      return openNameForm({
        title: 'Add a purpose',
        nameLabel: 'What is the money for?',
        placeholder: 'e.g. House repair, Emergency',
        intro: 'A purpose is a plan for your money. It is not an account and not a spending category.',
        submitLabel: 'Add purpose',
        onSubmit: (v) => allocationService.create({ name: v.name }),
      });
    case 'category':
      return openNameForm({
        title: 'Add a category',
        nameLabel: 'What do you spend on?',
        placeholder: 'e.g. Food, Transport',
        submitLabel: 'Add category',
        extraFields: categories.length
          ? [{ name: 'parentId', label: 'Inside another category', type: 'select', options: categories.map((c) => ({ value: c.id, label: c.name })), placeholder: 'No, this is a main category' }]
          : [],
        onSubmit: (v) => categoryService.create({ name: v.name, ...(v.parentId ? { parentId: v.parentId } : {}) }),
      });
    default:
      throw new Error(`Unknown reference kind: ${kind}`);
  }
}
