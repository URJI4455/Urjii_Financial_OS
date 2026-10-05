/**
 * "What happened?" - plain-language entry flows for every kind of transaction.
 * Layer: ui (talks to services only).
 *
 * Each flow lists its form fields (named exactly like the engine's fields), and how to turn the
 * form values into an engine input. The engine decides what the entry MEANS; this file only asks
 * the questions in everyday words.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet } from '../components/modal.js';
import { createForm } from '../components/form.js';
import { emptyState, errorState, loadingState } from '../components/states.js';
import { listRow } from '../components/card.js';
import { toastSuccess, toastWarning } from '../components/toast.js';
import { catalogService } from '../../services/catalogService.js';
import { transactionService } from '../../services/transactionService.js';
import { moneyService } from '../../services/moneyService.js';
import { formatMoney, formatDate, todayInput, dateInputToIso } from '../formatters.js';
import { TYPE_LABELS } from '../labels.js';
import { friendlyError } from '../messages.js';
import { createReference } from './quickCreate.js';

const NOT_SET_ASIDE = 'Not set aside yet';

// ---------------------------------------------------------------- option builders
const accountOptions = (catalog, kind) =>
  catalog.active.accounts
    .filter((account) => kind === undefined || (kind === 'savings') === (account.kind === 'savings'))
    .map((account) => ({ value: account.id, label: account.name }));

function categoryOptions(catalog) {
  const byId = new Map(catalog.categories.map((category) => [category.id, category]));
  return catalog.active.categories.map((category) => ({
    value: category.id,
    label: category.parentId && byId.get(category.parentId) ? `${byId.get(category.parentId).name} \u203a ${category.name}` : category.name,
  }));
}

const sourceOptions = (catalog) => catalog.active.sources.map((s) => ({ value: s.id, label: s.name }));
const personOptions = (catalog) => catalog.active.people.map((p) => ({ value: p.id, label: p.name }));
const purposeOptions = (catalog) => [{ value: null, label: NOT_SET_ASIDE }, ...catalog.active.allocations.map((a) => ({ value: a.id, label: a.name }))];

const creatable = (label, kind, options) => ({
  label,
  create: async () => {
    const record = await createReference(kind, options);
    return record ? { value: record.id, label: record.name } : null;
  },
});

const amountField = (label, extra = {}) => ({ name: 'amount', label, type: 'amount', required: true, ...extra });
const dateField = (label = 'When did it happen?') => ({ name: 'occurredAt', label, type: 'date', required: true, value: todayInput() });
const noteField = () => ({ name: 'note', label: 'Note', type: 'text', placeholder: 'Anything that helps you remember' });
const accountField = (name, label, ctx, kind, extra = {}) => ({
  name,
  label,
  type: 'select',
  required: true,
  options: accountOptions(ctx.catalog, kind),
  creatable: creatable(kind === 'savings' ? '+ Add a savings account\u2026' : '+ Add an account\u2026', 'account', kind === 'savings' ? { accountKind: 'savings' } : { accountKind: 'standard' }),
  ...extra,
});
const purposeField = (ctx, label = 'What is this money for?') => ({
  name: 'allocationId',
  label,
  type: 'select',
  advanced: true,
  options: purposeOptions(ctx.catalog),
  creatable: creatable('+ Add a purpose\u2026', 'allocation'),
});

const oneOf = (list, predicate) => list.find(predicate);

// ---------------------------------------------------------------- flow definitions
export const FLOWS = [
  {
    id: 'income',
    type: 'income',
    group: 'in',
    icon: 'arrowIn',
    title: 'I received money',
    hint: 'A salary, a payment, a gift to you.',
    unavailable: () => null,
    fields: (ctx) => [
      amountField('How much did you receive?'),
      { name: 'sourceId', label: 'Who or what paid you?', type: 'select', required: true, options: sourceOptions(ctx.catalog), creatable: creatable('+ Add a source\u2026', 'source') },
      accountField('accountId', 'Where did the money go?', ctx),
      dateField(),
      noteField(),
      purposeField(ctx),
      { name: 'expectedAmount', label: 'Total you expected (if you are owed more)', type: 'amount', advanced: true, help: 'Fill this in if this is only part of a payment. You can record the rest later.', showIf: (values) => !values.expectationId },
      {
        name: 'expectationId',
        label: 'This completes an expected payment',
        type: 'select',
        advanced: true,
        options: ctx.choices.expectations.map((entry) => ({ value: entry.id, label: `${ctx.catalog.names.sources[entry.sourceId] ?? 'Income'} \u2014 ${formatMoney(entry.outstanding)} still expected` })),
        showIf: () => ctx.choices.expectations.length > 0,
      },
    ],
    afterCreate(form, ctx) {
      form.onChange((values) => {
        const expectation = oneOf(ctx.choices.expectations, (entry) => entry.id === values.expectationId);
        if (expectation && values.sourceId !== expectation.sourceId) form.setValue('sourceId', expectation.sourceId);
      });
    },
  },
  {
    id: 'refund',
    type: 'refund',
    group: 'in',
    icon: 'arrowIn',
    title: 'I got a refund',
    hint: 'A shop gave back money for something you bought.',
    unavailable: (ctx) => (ctx.choices.refundable.length === 0 ? 'There is nothing to refund yet. Record the purchase first.' : null),
    fields: (ctx) => [
      {
        name: 'refundOf',
        label: 'Which purchase was refunded?',
        type: 'select',
        required: true,
        options: ctx.choices.refundable.map((entry) => ({
          value: entry.expense.id,
          label: `${ctx.catalog.names.categories[entry.expense.categoryId] ?? 'Purchase'} \u00b7 ${formatMoney(entry.expense.amount)} \u00b7 ${formatDate(entry.expense.occurredAt)}`,
        })),
      },
      amountField('How much was refunded?', {
        dynamic: (values) => {
          const entry = oneOf(ctx.choices.refundable, (candidate) => candidate.expense.id === values.refundOf);
          return entry
            ? { help: `Up to ${formatMoney(entry.refundableAmount)} can still be refunded.`, shortcut: { label: 'Refund everything left', text: moneyService.toDecimalString(entry.refundableAmount) } }
            : { help: '', shortcut: null };
        },
      }),
      dateField('When was it refunded?'),
      noteField(),
      accountField('accountId', 'Into a different account', ctx, undefined, { required: false, advanced: true, help: 'Leave empty to use the account you paid from.', creatable: undefined }),
    ],
  },
  {
    id: 'settlement',
    type: 'receivable_settlement',
    group: 'in',
    icon: 'arrowIn',
    title: 'Someone paid me back',
    hint: 'A person returns money you lent them, all at once or in parts.',
    unavailable: (ctx) => (ctx.choices.loans.length === 0 ? 'Nobody owes you money right now.' : null),
    fields: (ctx) => [
      {
        name: 'receivableId',
        label: 'Who is paying you back?',
        type: 'select',
        required: true,
        options: ctx.choices.loans.map((loan) => ({ value: loan.agreementId, label: `${ctx.catalog.names.people[loan.personId] ?? 'Someone'} \u2014 owes ${formatMoney(loan.remainingAmount)}` })),
      },
      amountField('How much did they pay?', {
        dynamic: (values) => {
          const loan = oneOf(ctx.choices.loans, (candidate) => candidate.agreementId === values.receivableId);
          return loan
            ? { help: `Still owed: ${formatMoney(loan.remainingAmount)}. A part payment is fine.`, shortcut: { label: 'Use the full amount', text: moneyService.toDecimalString(loan.remainingAmount) } }
            : { help: '', shortcut: null };
        },
      }),
      accountField('accountId', 'Where did the money arrive?', ctx),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'held-received',
    type: 'money_held_for_others',
    group: 'in',
    icon: 'lock',
    title: 'Someone gave me money to hold',
    hint: 'The money is in your hands but it is not yours. It will not count as your income.',
    unavailable: () => null,
    fields: (ctx) => [
      amountField('How much did they give you?'),
      { name: 'personId', label: 'Whose money is it?', type: 'select', required: true, options: personOptions(ctx.catalog), creatable: creatable('+ Add a person\u2026', 'person') },
      accountField('accountId', 'Where is the money now?', ctx),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'expense',
    type: 'expense',
    group: 'out',
    icon: 'arrowOut',
    title: 'I spent money',
    hint: 'Something you bought or paid for.',
    unavailable: () => null,
    fields: (ctx) => [
      amountField('How much did you spend?'),
      { name: 'categoryId', label: 'What was it for?', type: 'select', required: true, options: categoryOptions(ctx.catalog), creatable: creatable('+ Add a category\u2026', 'category') },
      accountField('accountId', 'Which account did you pay from?', ctx),
      dateField(),
      noteField(),
      purposeField(ctx, 'Which purpose does it come out of?'),
    ],
  },
  {
    id: 'loan',
    type: 'loan_receivable_created',
    group: 'out',
    icon: 'users',
    title: 'I gave someone money and they owe me',
    hint: 'A loan. It is not spending: you expect it back.',
    unavailable: () => null,
    fields: (ctx) => [
      amountField('How much did you give?'),
      { name: 'personId', label: 'Who did you give it to?', type: 'select', required: true, options: personOptions(ctx.catalog), creatable: creatable('+ Add a person\u2026', 'person') },
      accountField('accountId', 'Where did the money come from?', ctx),
      dateField(),
      noteField(),
      purposeField(ctx, 'Which purpose did it come from?'),
    ],
  },
  {
    id: 'held-return',
    type: 'return_held_money',
    group: 'out',
    icon: 'lock',
    title: 'I gave held money back',
    hint: 'You return money you were holding for someone, all or part of it.',
    unavailable: (ctx) => (ctx.choices.held.length === 0 ? 'You are not holding money for anyone right now.' : null),
    fields: (ctx) => [
      {
        name: 'heldMoneyId',
        label: 'Whose money are you giving back?',
        type: 'select',
        required: true,
        options: ctx.choices.held.map((held) => ({ value: held.agreementId, label: `${ctx.catalog.names.people[held.personId] ?? 'Someone'} \u2014 you hold ${formatMoney(held.remainingAmount)}` })),
      },
      amountField('How much are you giving back?', {
        dynamic: (values) => {
          const held = oneOf(ctx.choices.held, (candidate) => candidate.agreementId === values.heldMoneyId);
          return held
            ? { help: `You hold ${formatMoney(held.remainingAmount)}. Giving back part of it is fine.`, shortcut: { label: 'Give back everything', text: moneyService.toDecimalString(held.remainingAmount) } }
            : { help: '', shortcut: null };
        },
      }),
      accountField('accountId', 'Where is it coming from?', ctx),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'transfer',
    type: 'transfer',
    group: 'move',
    icon: 'swap',
    title: 'I moved money between my accounts',
    hint: 'From one of your accounts to another. Not spending, not income.',
    unavailable: (ctx) => (accountOptions(ctx.catalog, 'standard').length < 2 ? 'You need at least two everyday accounts.' : null),
    fields: (ctx) => [
      amountField('How much did you move?'),
      accountField('fromAccountId', 'Move it from', ctx, 'standard', { creatable: undefined }),
      accountField('toAccountId', 'Move it to', ctx, 'standard', { creatable: undefined }),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'savings-deposit',
    type: 'savings_deposit',
    group: 'move',
    icon: 'swap',
    title: 'I put money into savings',
    hint: 'Moves your money into a savings account. Not spending.',
    unavailable: (ctx) => (accountOptions(ctx.catalog, 'standard').length < 1 ? 'Add an everyday account first.' : null),
    fields: (ctx) => [
      amountField('How much are you saving?'),
      accountField('fromAccountId', 'Take it from', ctx, 'standard', { creatable: undefined }),
      accountField('toAccountId', 'Put it into', ctx, 'savings'),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'savings-withdrawal',
    type: 'savings_withdrawal',
    group: 'move',
    icon: 'swap',
    title: 'I took money out of savings',
    hint: 'Moves money back to an everyday account. It is only spending once you spend it.',
    unavailable: (ctx) => (accountOptions(ctx.catalog, 'savings').length < 1 ? 'You have no savings account yet.' : null),
    fields: (ctx) => [
      amountField('How much are you taking out?'),
      accountField('fromAccountId', 'Take it from', ctx, 'savings', { creatable: undefined }),
      accountField('toAccountId', 'Put it into', ctx, 'standard', { creatable: undefined }),
      dateField(),
      noteField(),
    ],
  },
  {
    id: 'allocation-transfer',
    type: 'allocation_transfer',
    group: 'move',
    icon: 'swap',
    title: 'I set money aside for a purpose',
    hint: 'Changes what your money is for. No money moves and nothing is spent.',
    unavailable: () => null,
    fields: (ctx) => [
      amountField('How much?'),
      { name: 'fromAllocationId', label: 'Take it from', type: 'select', required: true, options: purposeOptions(ctx.catalog), value: null },
      { name: 'toAllocationId', label: 'Set it aside for', type: 'select', required: true, options: purposeOptions(ctx.catalog), creatable: creatable('+ Add a purpose\u2026', 'allocation') },
      dateField(),
      noteField(),
    ],
  },
];

export const FLOW_BY_ID = Object.fromEntries(FLOWS.map((flow) => [flow.id, flow]));

const GROUPS = [
  { id: 'in', title: 'Money in' },
  { id: 'out', title: 'Money out' },
  { id: 'move', title: 'Moving money around' },
];

// ---------------------------------------------------------------- context + form sheet plumbing
async function loadContext() {
  const [catalog, choices] = await Promise.all([catalogService.load(), transactionService.choices()]);
  return { catalog, choices };
}

function announce(result) {
  toastSuccess(`${TYPE_LABELS[result.transaction.type]} saved.`);
  if (result.warnings.some((warning) => warning.code === 'ACCOUNT_BALANCE_NEGATIVE')) {
    toastWarning('That account now shows a negative balance. If that is not right, check your entries.');
  }
}

function showFlow(sheet, flow, ctx, { prefill = {}, onBack } = {}) {
  sheet.setTitle(flow.title);
  const fields = flow.fields(ctx).map((field) => (field.name in prefill ? { ...field, value: prefill[field.name] } : field));
  const form = createForm({
    fields,
    submitLabel: 'Save',
    cancelLabel: onBack ? 'Back' : 'Cancel',
    onCancel: onBack ?? (() => sheet.close()),
    intro: h('p', { class: 'muted small' }, flow.hint),
    onSubmit: async (values) => {
      const input = { type: flow.type, ...values };
      if (values.occurredAt) input.occurredAt = dateInputToIso(values.occurredAt);
      const result = await transactionService.record(input);
      announce(result);
      sheet.close(result);
    },
  });
  flow.afterCreate?.(form, ctx);
  sheet.setContent(form.element);
  form.focus(fields.find((field) => field.type === 'amount')?.name);
}

function showFirstAccount(sheet, onCreated) {
  sheet.setTitle('Let\u2019s add your first account');
  sheet.setContent(
    h(
      'div',
      { class: 'confirm' },
      h('p', { class: 'confirm__message' }, 'Before you record anything, tell the app where your money is kept: a bank account, a mobile wallet, cash. You can add more at any time.'),
      h('button', { class: 'button button--primary', type: 'button', onClick: async () => { const record = await createReference('account'); if (record) onCreated(); } }, 'Add my first account')
    )
  );
}

function showMenu(sheet, ctx, { onPick }) {
  sheet.setTitle('What happened?');
  sheet.setContent(
    h(
      'div',
      { class: 'menu-stack' },
      ...GROUPS.map((group) =>
        h(
          'section',
          { class: 'menu-group' },
          h('h3', { class: 'menu-group__title' }, group.title),
          h(
            'ul',
            { class: 'list menu-list' },
            FLOWS.filter((flow) => flow.group === group.id).map((flow) => {
              const reason = flow.unavailable(ctx);
              const item = listRow({
                icon: flow.icon,
                iconTone: group.id === 'in' ? 'in' : undefined,
                title: flow.title,
                subtitle: reason ?? flow.hint,
                muted: Boolean(reason),
                onClick: reason ? undefined : () => onPick(flow),
              });
              if (reason) item.querySelector('.row').setAttribute('aria-disabled', 'true');
              return item;
            })
          )
        )
      )
    )
  );
}

function openFlowSheet(title, start, onDone) {
  const sheet = openSheet({ title, content: loadingState() });
  start(sheet).catch((error) => {
    const info = friendlyError(error);
    sheet.setContent(errorState({ title: 'We could not open this', message: info.message, onRetry: () => start(sheet).catch(() => {}) }));
  });
  sheet.closed.then((result) => {
    if (result && result.ok) onDone?.(result);
  });
  return sheet;
}

/** The "Add" button: choose what happened, then fill in a short form. */
export function openAddMenu({ onDone } = {}) {
  async function start(sheet) {
    const ctx = await loadContext();
    if (ctx.catalog.active.accounts.length === 0) return showFirstAccount(sheet, () => start(sheet));
    const pick = (flow) => showFlow(sheet, flow, ctx, { onBack: () => showMenu(sheet, ctx, { onPick: pick }) });
    showMenu(sheet, ctx, { onPick: pick });
  }
  return openFlowSheet('What happened?', start, onDone);
}

/** Open one flow directly (quick actions, "Record repayment" buttons...). prefill: { fieldName: value }. */
export function openEntryFlow(flowId, { prefill, onDone } = {}) {
  const flow = FLOW_BY_ID[flowId];
  if (!flow) throw new Error(`Unknown flow: ${flowId}`);
  async function start(sheet) {
    const ctx = await loadContext();
    if (ctx.catalog.active.accounts.length === 0) return showFirstAccount(sheet, () => start(sheet));
    const reason = flow.unavailable(ctx);
    if (reason) {
      sheet.setTitle(flow.title);
      sheet.setContent(emptyState({ icon: 'info', title: 'Not available yet', message: reason }));
      return undefined;
    }
    showFlow(sheet, flow, ctx, { prefill });
    return undefined;
  }
  return openFlowSheet(flow.title, start, onDone);
}
