/**
 * Financial engine factory.
 * Layer: engine (may import ../db/schema.js, ../config/*). The database is injected, so the same
 * engine runs against real IndexedDB in the app and against an in-memory double in unit tests.
 *
 * createEngine({ database, clock?, newId? })
 *   database  anything with runInTransaction(stores, mode, work) like ../db (createDatabase result)
 *   clock     () => Date | ISO string | ms   (default: now)
 *   newId     () => string                   (default: crypto.randomUUID)
 */

import { EngineError, ENGINE_ERROR_CODES } from './errors.js';
import { createAuditTrail } from './audit.js';
import { createLedger } from './ledger.js';
import { createAccounts } from './accounts.js';
import { createPeople } from './people.js';
import { createSources } from './sources.js';
import { createAllocations } from './allocations.js';
import { createCategories } from './categories.js';
import { createReadModel } from './readModel.js';
import { createReconciliation } from './reconciliation.js';
import { createSettings } from './settings.js';
import { createSops } from './sops.js';
import { createBackup } from './backup.js';

const defaultClock = () => new Date();
const defaultNewId = () => globalThis.crypto.randomUUID();

export function createEngine({ database, clock = defaultClock, newId = defaultNewId } = {}) {
  if (!database || typeof database.runInTransaction !== 'function') {
    throw new EngineError(ENGINE_ERROR_CODES.CONFIG_INVALID, 'createEngine needs a database with runInTransaction().');
  }

  const audit = createAuditTrail({ database, clock, newId });
  const deps = { database, clock, newId, audit };

  const ledger = createLedger(deps);

  return Object.freeze({
    ledger,
    accounts: createAccounts(deps),
    people: createPeople(deps),
    sources: createSources(deps),
    allocations: createAllocations(deps),
    categories: createCategories(deps),
    state: createReadModel({ database }),
    reconciliation: createReconciliation({ ...deps, ledger }),
    settings: createSettings(deps),
    sops: createSops(deps),
    backup: createBackup({ database, clock }),
    audit: Object.freeze({ forEntity: audit.forEntity, all: audit.all }),
  });
}
