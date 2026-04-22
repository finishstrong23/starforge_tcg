// IndexedDB schema definitions. Non-negotiable constraint #4:
// meta-progression is a separate IndexedDB *database* from run state, so
// a corrupt version upgrade on one can never touch the other.

export const RUNS_DB_NAME = 'starforge_roguelite_runs';
export const RUNS_DB_VERSION = 1;
export const RUNS_STORE = 'runs';

export const META_DB_NAME = 'starforge_roguelite_meta';
export const META_DB_VERSION = 1;
export const META_STORE = 'meta';

// Singleton key for the meta store — there's exactly one MetaProgression
// record per player.
export const META_SINGLETON_KEY = 'singleton';

export interface DatabaseSchema {
  name: string;
  version: number;
  stores: readonly StoreSchema[];
}

export interface StoreSchema {
  name: string;
  keyPath?: string;            // if undefined, use out-of-line keys
  indexes?: ReadonlyArray<{ name: string; keyPath: string | string[]; unique?: boolean }>;
}

export const RUNS_DB_SCHEMA: DatabaseSchema = {
  name: RUNS_DB_NAME,
  version: RUNS_DB_VERSION,
  stores: [
    {
      name: RUNS_STORE,
      keyPath: 'runId',
      indexes: [
        { name: 'lastSavedAt', keyPath: 'lastSavedAt' },
        { name: 'factionId', keyPath: 'factionId' },
      ],
    },
  ],
};

export const META_DB_SCHEMA: DatabaseSchema = {
  name: META_DB_NAME,
  version: META_DB_VERSION,
  stores: [
    {
      name: META_STORE,
      // Out-of-line key — use META_SINGLETON_KEY explicitly on put/get.
    },
  ],
};
