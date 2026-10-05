/**
 * Savings.
 * Spec section 18. Layer: engine (pure).
 *
 * Savings is real money movement into and out of accounts of kind 'savings' (ADR-010, OPEN-005).
 * It is never an expense category. The expense occurs only when withdrawn money is spent.
 */

export const ACCOUNT_KINDS = Object.freeze({ STANDARD: 'standard', SAVINGS: 'savings' });

export function deriveSavings(accountBalances, accounts) {
  const byAccount = {};
  let total = 0;
  for (const account of accounts) {
    if (account.kind !== ACCOUNT_KINDS.SAVINGS) continue;
    const balance = accountBalances[account.id] ?? 0;
    byAccount[account.id] = balance;
    total += balance;
  }
  return { total, byAccount };
}
