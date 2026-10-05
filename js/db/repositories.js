/**
 * One repository per object store, bound to the production database.
 * Layer: db.
 */

import { STORE_NAMES } from './schema.js';
import { database } from './database.js';
import { createRepositories } from './repository.js';

export const repositories = createRepositories(database, Object.values(STORE_NAMES));
