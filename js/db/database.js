/**
 * The production database instance ("FinancialOS").
 * Layer: db (may import: ../config/*, ./*). This layer is the ONLY place that touches `indexedDB`.
 */

import { DB_NAME, DB_VERSION, STORE_DEFINITIONS } from './schema.js';
import { MIGRATIONS } from './migrations.js';
import { createDatabase } from './connection.js';

export const database = createDatabase({
  name: DB_NAME,
  version: DB_VERSION,
  stores: STORE_DEFINITIONS,
  migrations: MIGRATIONS,
});

export const openDatabase = () => database.open();
export const closeDatabase = () => database.close();
export const initializeDatabase = (options) => database.initialize(options);
export const runInTransaction = (storeNames, mode, work) => database.runInTransaction(storeNames, mode, work);
