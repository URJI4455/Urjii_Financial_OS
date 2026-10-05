/**
 * Built-in how-to guides shown on the Guides (SOP) page. Plain language, no accounting terms.
 * Layer: ui.
 */

export const GUIDES = Object.freeze([
  {
    id: 'hold',
    title: 'Someone gave me money to hold',
    summary: 'A relative or friend hands you money to keep for them. It is not yours.',
    steps: [
      'Tap Add, then choose \u201cSomeone gave me money to hold\u201d.',
      'Enter the amount, whose money it is, and which account it is in.',
      'It appears under \u201cMoney held for others\u201d. It is not counted as your income or your own money.',
      'When you give some back, choose \u201cI gave held money back\u201d. Giving back part of it is fine.',
    ],
    action: { label: 'Record held money', flow: 'held-received' },
  },
  {
    id: 'lend',
    title: 'I lent money to someone',
    summary: 'You gave someone money and expect it back.',
    steps: [
      'Tap Add, then choose \u201cI gave someone money and they owe me\u201d.',
      'Choose the person, the amount and where the money came from.',
      'It is not counted as spending. It shows under \u201cOwed to me\u201d until they pay you back.',
    ],
    action: { label: 'Record a loan', flow: 'loan' },
  },
  {
    id: 'payback',
    title: 'Someone paid me back',
    summary: 'Part or all of a loan comes back to you.',
    steps: [
      'Tap Add, then choose \u201cSomeone paid me back\u201d.',
      'Pick the loan and enter what they paid. Use \u201cUse the full amount\u201d if it is everything.',
      'The amount owed goes down. It is not counted as income.',
    ],
    action: { label: 'Record a repayment', flow: 'settlement' },
  },
  {
    id: 'mistake',
    title: 'I entered something twice or by mistake',
    summary: 'Wrong entries are cancelled, never deleted.',
    steps: [
      'Open Transactions and tap the entry.',
      'Choose \u201cIt was a mistake\u201d and write a short reason.',
      'It stops counting everywhere. A record that it existed stays in the history.',
    ],
    action: { label: 'Open transactions', href: 'transactions.html' },
  },
  {
    id: 'bounced',
    title: 'A payment bounced or was cancelled',
    summary: 'The money really moved, then was undone.',
    steps: [
      'Open Transactions and tap the original entry.',
      'Choose \u201cIt happened, but was undone\u201d and explain what happened.',
      'A matching \u201cundone\u201d entry is added and your totals return to where they were. The original stays on record.',
    ],
    action: { label: 'Open transactions', href: 'transactions.html' },
  },
  {
    id: 'mismatch',
    title: 'My balance does not match',
    summary: 'The app and your bank or wallet show different numbers.',
    steps: [
      'Open Check balances and type the balance your account really shows.',
      'If there is a difference, look for a missing entry first.',
      'If you cannot find it, add a balance correction with a reason. It is not counted as spending or income.',
    ],
    action: { label: 'Check balances', href: 'reconciliation.html' },
  },
  {
    id: 'savings',
    title: 'Putting money into savings',
    summary: 'Saving is moving your own money, not spending it.',
    steps: [
      'Make sure you have a savings account (Add, then \u201cI put money into savings\u201d lets you add one).',
      'Choose \u201cI put money into savings\u201d, the amount, and where it comes from.',
      'When you take money out, choose \u201cI took money out of savings\u201d. It only counts as spending once you spend it.',
    ],
    action: { label: 'Put money into savings', flow: 'savings-deposit' },
  },
  {
    id: 'month-end',
    title: 'Month-end routine',
    summary: 'A calm ten-minute check at the end of each month.',
    steps: [
      'Check each account against your bank or wallet app (Check balances).',
      'Look at \u201cNeeds attention\u201d on the home screen: money you are waiting for, money you owe back.',
      'Open Reports and look at last month.',
      'Download a backup in Settings and keep it somewhere private.',
    ],
    action: { label: 'Open reports', href: 'reports.html' },
  },
]);
