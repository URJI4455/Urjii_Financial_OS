/**
 * Plain-language wording for transactions. Presentation only: it chooses words and icons;
 * every number and every sign comes from the engine (meaning, flow).
 * Layer: ui.
 */

export const TYPE_LABELS = Object.freeze({
  income: 'Money received',
  expense: 'Spent',
  transfer: 'Moved between accounts',
  savings_deposit: 'Put into savings',
  savings_withdrawal: 'Taken out of savings',
  loan_receivable_created: 'Lent to someone',
  receivable_settlement: 'Paid back to me',
  money_held_for_others: 'Money held for someone',
  return_held_money: 'Held money given back',
  allocation_transfer: 'Set aside for a purpose',
  refund: 'Refund',
  adjustment: 'Balance correction',
  reversal: 'Undone entry',
});

/** One calm sentence per type explaining what it means. */
export const TYPE_HELP = Object.freeze({
  income: 'Counted as income. It increases the money in your account.',
  expense: 'Counted as spending. It decreases the money in your account.',
  transfer: 'Only moves your own money. It is not spending and not income.',
  savings_deposit: 'Moves your money into savings. It is not spending.',
  savings_withdrawal: 'Moves your money out of savings. It is not income. It only becomes spending when you spend it.',
  loan_receivable_created: 'Someone now owes you this money. A loan is not spending, so your overall position does not change.',
  receivable_settlement: 'Reduces what the person owes you. It is not new income.',
  money_held_for_others: 'The money is in your account but it is not yours. It is not income and is not counted as your own money.',
  return_held_money: 'Reduces what you are holding for the person. It is not spending.',
  allocation_transfer: 'Changes what your money is intended for. No money moves between accounts and nothing is spent.',
  refund: 'Reduces your spending for the purchase. It is not income.',
  adjustment: 'Fixes a difference between the app and your real balance. It is not spending and not income.',
  reversal: 'Undoes another entry. The original entry is kept for the record.',
});

export const TYPE_ICONS = Object.freeze({
  income: 'arrowIn',
  expense: 'arrowOut',
  transfer: 'swap',
  savings_deposit: 'swap',
  savings_withdrawal: 'swap',
  loan_receivable_created: 'arrowOut',
  receivable_settlement: 'arrowIn',
  money_held_for_others: 'arrowIn',
  return_held_money: 'arrowOut',
  allocation_transfer: 'swap',
  refund: 'arrowIn',
  adjustment: 'edit',
  reversal: 'undo',
});

export const AUDIT_ACTIONS = Object.freeze({
  create: 'Added',
  void: 'Cancelled (entered by mistake)',
  reverse: 'Marked as undone',
  rename: 'Renamed',
  archive: 'Archived',
  unarchive: 'Restored',
  reorder: 'Reordered',
  update: 'Changed',
  resolve: 'Resolved',
});

export const ENTITY_LABELS = Object.freeze({
  transactions: 'Entry',
  accounts: 'Account',
  people: 'Person',
  sources: 'Income source',
  allocations: 'Purpose',
  categories: 'Category',
  reconciliations: 'Balance check',
  sops: 'Procedure',
  settings: 'Setting',
});

const name = (map, id, fallback = 'Unknown') => (id === null || id === undefined ? fallback : (map?.[id] ?? fallback));

/**
 * { title, subtitle } for a row. `names` is catalogService.load().names; `rowsById` lets a reversal
 * mention what it undid.
 */
export function describeTransaction(transaction, names, rowsById) {
  const accounts = names.accounts;
  const t = transaction;
  switch (t.type) {
    case 'income':
      return { title: name(names.sources, t.sourceId), subtitle: `Into ${name(accounts, t.accountId)}` };
    case 'expense':
      return { title: name(names.categories, t.categoryId), subtitle: `From ${name(accounts, t.accountId)}` };
    case 'transfer':
      return { title: 'Moved between accounts', subtitle: `${name(accounts, t.fromAccountId)} \u2192 ${name(accounts, t.toAccountId)}` };
    case 'savings_deposit':
      return { title: 'Put into savings', subtitle: `${name(accounts, t.fromAccountId)} \u2192 ${name(accounts, t.toAccountId)}` };
    case 'savings_withdrawal':
      return { title: 'Taken out of savings', subtitle: `${name(accounts, t.fromAccountId)} \u2192 ${name(accounts, t.toAccountId)}` };
    case 'loan_receivable_created':
      return { title: `Lent to ${name(names.people, t.personId)}`, subtitle: `From ${name(accounts, t.accountId)}` };
    case 'receivable_settlement':
      return { title: `${name(names.people, t.personId)} paid back`, subtitle: `Into ${name(accounts, t.accountId)}` };
    case 'money_held_for_others':
      return { title: `Holding for ${name(names.people, t.personId)}`, subtitle: `In ${name(accounts, t.accountId)}` };
    case 'return_held_money':
      return { title: `Gave back to ${name(names.people, t.personId)}`, subtitle: `From ${name(accounts, t.accountId)}` };
    case 'allocation_transfer':
      return {
        title: 'Set aside for a purpose',
        subtitle: `${name(names.allocations, t.fromAllocationId, 'Not set aside yet')} \u2192 ${name(names.allocations, t.toAllocationId, 'Not set aside yet')}`,
      };
    case 'refund':
      return { title: `Refund: ${name(names.categories, t.categoryId)}`, subtitle: `Into ${name(accounts, t.accountId)}` };
    case 'adjustment':
      return { title: 'Balance correction', subtitle: name(accounts, t.accountId) };
    case 'reversal': {
      const original = rowsById?.get(t.reverses);
      const what = original ? describeTransaction(original.transaction, names, rowsById).title : 'an entry';
      return { title: `Undone: ${what}`, subtitle: t.reason ?? '' };
    }
    default:
      return { title: 'Entry', subtitle: '' };
  }
}

/**
 * Sentences about what an action did, from the engine's meaning numbers (signs only - no arithmetic).
 * `fmt` formats minor units, e.g. formatMoney.
 */
export function explainMeaning(meaning, fmt) {
  if (!meaning) return [];
  const lines = [];
  const move = (value, up, down) => {
    if (value > 0) lines.push(up(fmt(Math.abs(value))));
    else if (value < 0) lines.push(down(fmt(Math.abs(value))));
  };
  move(meaning.liquidMoneyChange, (v) => `Money in your accounts went up by ${v}.`, (v) => `Money in your accounts went down by ${v}.`);
  move(meaning.receivableChange, (v) => `People owe you ${v} more.`, (v) => `People owe you ${v} less.`);
  move(meaning.liabilityChange, (v) => `You hold ${v} more for other people.`, (v) => `You hold ${v} less for other people.`);
  move(meaning.incomeAmount, (v) => `Counted as income: ${v}.`, (v) => `Income reduced by ${v}.`);
  move(meaning.expenseAmount, (v) => `Counted as spending: ${v}.`, (v) => `Spending reduced by ${v}.`);
  if (meaning.netPositionChange === 0) lines.push('Your overall position did not change.');
  else move(meaning.netPositionChange, (v) => `Your overall position went up by ${v}.`, (v) => `Your overall position went down by ${v}.`);
  return lines;
}
