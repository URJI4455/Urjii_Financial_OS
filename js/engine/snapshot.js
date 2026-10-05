/**
 * Consistent read of everything the engine needs, taken INSIDE one database transaction so that
 * validation and the write that follows see the same data.
 * Layer: engine (may import ../db/schema.js).
 */

import { STORE_NAMES as S } from '../db/schema.js';
import { deriveState } from './financialPosition.js';

export const READ_STORES = Object.freeze([S.TRANSACTIONS, S.ACCOUNTS, S.PEOPLE, S.SOURCES, S.ALLOCATIONS, S.CATEGORIES]);
export const WRITE_STORES = Object.freeze([...READ_STORES, S.AUDIT_LOG]);

const byId = (records) => new Map(records.map((record) => [record.id, record]));

export async function loadSnapshot(tx) {
  const [transactions, accountList, people, sources, allocations, categories] = await Promise.all(
    READ_STORES.map((name) => tx.store(name).getAll())
  );
  const transactionsById = byId(transactions);
  const state = deriveState(transactions, accountList);

  return {
    transactions,
    transactionsById,
    lookup: (id) => transactionsById.get(id),
    accountList,
    accounts: byId(accountList),
    people: byId(people),
    sources: byId(sources),
    allocations: byId(allocations),
    categories: byId(categories),
    state,
    effects: state.effects,
  };
}
