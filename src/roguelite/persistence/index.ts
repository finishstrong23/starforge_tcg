import { registerSchema } from './adapter';
import { RUNS_DB_SCHEMA, META_DB_SCHEMA } from './schema';
import { IndexedDBAdapter } from './indexeddb';
import { InMemoryAdapter } from './memory';
import { RunStore } from './runStore';
import { MetaStore } from './metaStore';
import type { StorageAdapter } from './adapter';

// Register schemas at module load so any adapter can resolve them.
registerSchema(RUNS_DB_SCHEMA);
registerSchema(META_DB_SCHEMA);

export type { StorageAdapter } from './adapter';
export {
  RUNS_DB_NAME,
  RUNS_STORE,
  META_DB_NAME,
  META_STORE,
  META_SINGLETON_KEY,
  RUNS_DB_SCHEMA,
  META_DB_SCHEMA,
} from './schema';
export { IndexedDBAdapter } from './indexeddb';
export { InMemoryAdapter } from './memory';
export { RunStore } from './runStore';
export { MetaStore } from './metaStore';

export interface RoguelitePersistence {
  adapter: StorageAdapter;
  runs: RunStore;
  meta: MetaStore;
}

/** Default factory: pick IndexedDBAdapter if available, otherwise fall
 *  back to InMemoryAdapter. The browser runtime gets the real thing;
 *  Node/SSR tests get an isolated in-memory layer. */
export function createPersistence(adapter?: StorageAdapter): RoguelitePersistence {
  const actualAdapter = adapter ?? (typeof indexedDB === 'undefined'
    ? new InMemoryAdapter()
    : new IndexedDBAdapter());
  return {
    adapter: actualAdapter,
    runs: new RunStore(actualAdapter),
    meta: new MetaStore(actualAdapter),
  };
}
