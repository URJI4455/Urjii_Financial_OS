/**
 * Page route table (single source for navigation and page ids).
 * Layer: ui.
 *
 * Primary navigation order (spec section 21): Home, Transactions, Money, Reports, More.
 * Pages with primaryNav: false are reached through the More page (and the desktop sidebar).
 * `add: true` shows the "Add" button in the header. All pages are flat HTML files at the project root.
 */

export const ROUTES = Object.freeze([
  { id: 'dashboard', title: 'Dashboard', navLabel: 'Home', href: 'index.html', primaryNav: true, icon: 'home', add: true, summary: 'Your money at a glance' },
  { id: 'transactions', title: 'Transactions', navLabel: 'Transactions', href: 'transactions.html', primaryNav: true, icon: 'list', add: true, summary: 'Everything that happened' },
  { id: 'money', title: 'Money', navLabel: 'Money', href: 'money.html', primaryNav: true, icon: 'wallet', add: true, summary: 'Accounts, savings and what money is for' },
  { id: 'reports', title: 'Reports', navLabel: 'Reports', href: 'reports.html', primaryNav: true, icon: 'chart', add: false, summary: 'What happened over a period' },
  { id: 'more', title: 'More', navLabel: 'More', href: 'more.html', primaryNav: true, icon: 'more', add: false, summary: 'Everything else' },
  { id: 'income', title: 'Income', navLabel: 'Income', href: 'income.html', primaryNav: false, icon: 'inbox', add: true, summary: 'Who pays you, and what you are still waiting for' },
  { id: 'receivables', title: 'Receivables', navLabel: 'Owed to me', href: 'receivables.html', primaryNav: false, icon: 'users', add: true, summary: 'Money other people owe you' },
  { id: 'reconciliation', title: 'Reconciliation', navLabel: 'Check balances', href: 'reconciliation.html', primaryNav: false, icon: 'scale', add: false, summary: 'Make sure the app matches your real accounts' },
  { id: 'sop', title: 'SOP', navLabel: 'Guides', href: 'sop.html', primaryNav: false, icon: 'book', add: false, summary: 'How-tos and your own procedures' },
  { id: 'settings', title: 'Settings', navLabel: 'Settings', href: 'settings.html', primaryNav: false, icon: 'sliders', add: false, summary: 'Names, backup and history' },
]);
