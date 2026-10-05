/**
 * Public surface of the financial engine. Only ../services/ may import from here.
 *
 * `engine` is the production instance bound to the FinancialOS IndexedDB database.
 * Pure derivation modules are exported as namespaces; unimplemented ones remain stubs.
 */

import { database } from '../db/index.js';
import { createEngine } from './engine.js';

export { createEngine } from './engine.js';
export { initializeDatabase } from '../db/index.js';
export const engine = createEngine({ database });

export { EngineError, ValidationError, ENGINE_ERROR_CODES } from './errors.js';

export * as money from './money.js';
export * as transactionTypes from './transactionTypes.js';
export * as balances from './balances.js';
export * as financialPosition from './financialPosition.js';
export * as receivables from './receivables.js';
export * as heldMoney from './heldMoney.js';
export * as income from './income.js';
export * as savings from './savings.js';
export * as reporting from './reporting.js';

export * as reconciliation from './reconciliation.js';
export * as backup from './backup.js';
export * as settings from './settings.js';
export * as sops from './sops.js';
