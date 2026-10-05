# Transaction types and their economic meaning

Implemented in `js/engine/transactionTypes.js` (`interpretTransaction`), the single place that decides meaning.
Effects are derived from stored transactions; they are never stored. Amounts are integer minor units, always positive;
direction comes from the type. Effect kinds: account, allocation, income, expense, receivable, held money.

| Type | Effects | Never |
| --- | --- | --- |
| Income | account +A, allocation +A, income +A | |
| Expense | account -A, allocation -A, expense +A | |
| Transfer | account(from) -A, account(to) +A | income, expense, touching a savings account |
| Savings Deposit | account -A, savings account +A | expense |
| Savings Withdrawal | savings account -A, account +A | income, expense |
| Loan / Receivable Created | account -A, allocation -A, receivable +A | expense |
| Receivable Settlement | account +A, allocation +A, receivable -A (partial allowed, never above what is owed) | income |
| Money Held for Others | account +A, held money (liability) +A | income, user-owned, allocated |
| Return Held Money | account -A, held money -A (never above what is held) | expense |
| Allocation Transfer | allocation(from) -A, allocation(to) +A | expense, account movement |
| Refund | account +A, allocation +A, expense -A (of one expense, never above it) | income |
| Adjustment | account +/-A, allocation +/-A, reason required | income, expense |
| Reversal | exact negation of the reversed transaction | |

`null` allocation means "unallocated". Void is a status change (the entry contributes nothing), not a transaction.

Lifecycle (`posted`, `voided`, `reversed`), confidence and reconciliation status are three separate fields.
`draft` exists as a constant but drafts are not implemented yet.

Void and reverse are blocked while posted transactions depend on the target (settlements on a loan, returns on held
money, refunds on an expense, later receipts on an expected income). Reversed dependents do not block.
