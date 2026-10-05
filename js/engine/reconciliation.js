/**
 * Reconciliation: expected system balance vs the real balance.
 * Spec section 19. Layer: engine.
 *
 * check()  compares the derived balance with what the account really shows and stores the result.
 *          A difference is marked as a DISCREPANCY. No expense (or any transaction) is ever invented.
 * resolveWithAdjustment()  the explicit way out: records an adjustment for the CURRENT difference and
 *          marks the check resolved, atomically. If the difference has disappeared meanwhile (the
 *          missing entry was added), the check is marked "explained" and nothing is adjusted.
 * Records keep the numbers as they were when checked; "current" figures are always re-derived.
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { ENGINE_ERROR_CODES, EngineError, ValidationError } from './errors.js';
import { WRITE_STORES, loadSnapshot } from './snapshot.js';
import { requireReason } from './validation.js';
import { isPlainObject } from './util.js';
import { toIso } from './time.js';

const STORES = Object.freeze([...WRITE_STORES, S.RECONCILIATIONS]);

export function createReconciliation({ database, clock, newId, audit, ledger }) {
  const nowIso = () => toIso(clock());

  async function check(input) {
    if (!isPlainObject(input)) throw new ValidationError([{ code: 'INPUT_INVALID', field: null, message: 'Input must be an object.' }]);
    const errors = [];
    for (const key of Object.keys(input)) {
      if (!['accountId', 'actualAmount', 'note'].includes(key)) errors.push({ code: 'UNKNOWN_FIELD', field: key, message: `${key} is not a valid field.` });
    }
    if (!Number.isSafeInteger(input.actualAmount)) {
      errors.push({ code: 'ACTUAL_AMOUNT_INVALID', field: 'actualAmount', message: 'The real balance must be a whole number of minor units.' });
    }
    if (input.note !== undefined && typeof input.note !== 'string') errors.push({ code: 'NOTE_INVALID', field: 'note', message: 'note must be text.' });

    return database.runInTransaction(STORES, 'readwrite', async (tx) => {
      const snapshot = await loadSnapshot(tx);
      if (typeof input.accountId !== 'string' || input.accountId === '') {
        errors.push({ code: 'ACCOUNT_REQUIRED', field: 'accountId', message: 'accountId is required.' });
      } else if (!snapshot.accounts.has(input.accountId)) {
        errors.push({ code: 'ACCOUNT_NOT_FOUND', field: 'accountId', message: 'accountId does not refer to an existing record.' });
      }
      if (errors.length > 0) throw new ValidationError(errors);

      const expectedAmount = snapshot.state.accounts[input.accountId] ?? 0;
      const difference = input.actualAmount - expectedAmount;
      const record = {
        id: newId(),
        accountId: input.accountId,
        expectedAmount,
        actualAmount: input.actualAmount,
        difference,
        status: difference === 0 ? 'matched' : 'discrepancy',
        resolved: difference === 0,
        checkedAt: nowIso(),
      };
      if (input.note !== undefined && input.note.trim() !== '') record.note = input.note.trim();

      await tx.store(S.RECONCILIATIONS).add(record);
      await audit.write(tx, { entity: S.RECONCILIATIONS, entityId: record.id, action: 'create', previousState: null, newState: record });
      return { ok: true, record };
    });
  }

  async function resolveWithAdjustment(id, options = {}) {
    return database.runInTransaction(STORES, 'readwrite', async (tx) => {
      const reason = requireReason(options.reason);
      const record = await tx.store(S.RECONCILIATIONS).get(id);
      if (!record) throw new EngineError(ENGINE_ERROR_CODES.NOT_FOUND, 'Reconciliation check not found.', { id });
      if (record.status !== 'discrepancy' || record.resolved) {
        throw new EngineError(ENGINE_ERROR_CODES.STATE_NOT_ALLOWED, 'Only an open discrepancy can be resolved.', { id });
      }

      const snapshot = await loadSnapshot(tx);
      const differenceNow = record.actualAmount - (snapshot.state.accounts[record.accountId] ?? 0);
      const when = nowIso();

      let adjustment = null;
      let updated;
      if (differenceNow === 0) {
        updated = { ...record, resolved: true, resolvedAt: when, resolution: 'explained' };
      } else {
        const input = {
          type: 'adjustment',
          accountId: record.accountId,
          direction: differenceNow > 0 ? 'increase' : 'decrease',
          amount: Math.abs(differenceNow),
          reason,
        };
        if (options.allocationId !== undefined) input.allocationId = options.allocationId;
        adjustment = await ledger.recordWithin(tx, input);
        updated = { ...record, resolved: true, resolvedAt: when, resolution: 'adjusted', adjustmentId: adjustment.transaction.id };
      }

      await tx.store(S.RECONCILIATIONS).put(updated);
      await audit.write(tx, { entity: S.RECONCILIATIONS, entityId: id, action: 'resolve', previousState: record, newState: updated, reason });
      return { ok: true, record: updated, adjustment };
    });
  }

  /** Checks, newest first, optionally for one account. */
  const list = ({ accountId } = {}) =>
    database.runInTransaction([S.RECONCILIATIONS], 'readonly', async (tx) =>
      (await tx.store(S.RECONCILIATIONS).getAll())
        .filter((record) => accountId === undefined || record.accountId === accountId)
        .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt) || b.id.localeCompare(a.id))
    );

  /**
   * One entry per account worth showing: the balance the system expects NOW, the latest check, and
   * (if that check is an open discrepancy) the difference as it stands now. Archived accounts
   * appear only while they still hold a balance.
   */
  const overview = () =>
    database.runInTransaction([...STORES], 'readonly', async (tx) => {
      const snapshot = await loadSnapshot(tx);
      const checks = (await tx.store(S.RECONCILIATIONS).getAll()).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt) || b.id.localeCompare(a.id));
      return snapshot.accountList
        .filter((account) => !account.archived || (snapshot.state.accounts[account.id] ?? 0) !== 0)
        .map((account) => {
          const expectedAmount = snapshot.state.accounts[account.id] ?? 0;
          const lastCheck = checks.find((record) => record.accountId === account.id) ?? null;
          const open = lastCheck && lastCheck.status === 'discrepancy' && !lastCheck.resolved;
          return {
            account,
            expectedAmount,
            lastCheck,
            openDiscrepancy: open ? { checkId: lastCheck.id, actualAmount: lastCheck.actualAmount, currentDifference: lastCheck.actualAmount - expectedAmount } : null,
          };
        });
    });

  /** Accounts whose latest check is an unresolved discrepancy (what the dashboard warns about). */
  const openDiscrepancies = async () => (await overview()).filter((entry) => entry.openDiscrepancy !== null);

  return Object.freeze({ check, resolveWithAdjustment, list, overview, openDiscrepancies });
}
