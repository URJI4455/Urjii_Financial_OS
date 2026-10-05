# Interface design (as implemented, v0.4.0)

## Principles
- **Plain words, no accounting terms.** "Someone gave me money to hold", "I gave someone money and they owe me", "Someone paid me back". The engine handles meaning; the screen never says liability, receivable, debit or credit (an end-to-end test checks the Transactions page).
- **Calm and trustworthy.** Warm paper background, deep green, serif numerals for headline figures, hairline borders, no decoration without meaning, light and dark themes.
- **One obvious next step.** Every page has one primary action; empty pages say what to do.
- **Never duplicate the engine.** The UI formats and arranges numbers; every figure, sign and total comes from the engine through the services (guarded by `tests/unit/ui/no-calculations.test.js`).
- **Nothing is ever deleted.** Wrong entries are "cancelled" (mistake) or "marked as undone" (it happened, then was undone); both keep a record.

## Layout
- Phones: header with an Add button, bottom bar Home / Transactions / Money / Reports / More. Wide screens (900px+): sidebar with every page.
- Pages: Home, Transactions, Money, Reports, More, Income, Owed to me (receivables), Check balances (reconciliation), Guides (SOP), Settings.

## Components (`js/ui/components/`)
card, stat tile, badge, list row, progress bar; form builder (field errors land next to the field, in plain words); sheet (native `<dialog>`: focus trap, Esc, focus returns); confirmation dialog (optional required reason, errors shown inside, never `confirm()`); toast (never `alert()`); loading skeleton, empty state, error state; `createView` (skeleton, render, refresh, retry).

## Flows (`js/ui/flows/`)
"What happened?" menu with eleven everyday actions; each is a short form whose fields are named like the engine's. Choices that cannot apply yet say why (for example "Nobody owes you money right now."). Missing sources, people, categories, purposes and accounts can be added from inside the form.

## Safety
- All user text is inserted as text, never HTML.
- Storage problems (private mode, blocked IndexedDB, quota) show a clear page message, not a blank screen.
- Money is parsed strictly ("1,250.50" yes, "12.345" no); nothing is rounded.
