# Financial model (as implemented)

Mental model: `MONEY -> SOURCE + OWNER -> ALLOCATION -> TRANSACTION`. The ledger is the source of truth.
Nothing stores a balance: every figure is derived from valid transactions (posted and reversed ones count; voided never).

| Figure | Definition |
| --- | --- |
| Account balance | sum of account effects |
| Liquid money | all account balances (includes money held for others) |
| Liabilities | money held for others still outstanding |
| User-owned money | liquid - liabilities (always equals the sum of allocation balances) |
| Receivables | loans still owed |
| Net financial position | liquid + receivables - liabilities. **Not spendable money**; there is no "spendable" figure |
| Savings | balance of accounts of kind `savings` |
| Spending | expenses minus refunds (adjustments and loans excluded) |
| Income | income transactions; expected vs received vs outstanding per expectation |

Invariants checked by `engine.state.verify()` and by the stress test after every operation:
allocations sum to user-owned money; net position identity; no negative receivable or held amount.

Negative balances are recorded (what happened, happened) and reported as warnings, not errors.
Point in time: `state.get({ asOf })` replays by `occurredAt`; `recordedAt` is when it was entered.
Amounts: integer minor units (two decimals); decimal text is converted only at the edge (`money.js`).
