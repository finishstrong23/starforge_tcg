import type { MetaProgression } from '../types';
import { emptyMeta } from '../types';
import type { StorageAdapter } from './adapter';
import { META_DB_NAME, META_STORE, META_SINGLETON_KEY } from './schema';

// Typed wrapper around the StorageAdapter for MetaProgression. Meta
// lives in a *separate* database from RunState (constraint #4). There
// is exactly one MetaProgression record per player, stored under the
// singleton key.

export class MetaStore {
  constructor(private readonly adapter: StorageAdapter) {}

  /** Load meta; if missing, seed with a fresh emptyMeta() and return it. */
  async load(): Promise<MetaProgression> {
    const found = await this.adapter.get<MetaProgression>(
      META_DB_NAME,
      META_STORE,
      META_SINGLETON_KEY,
    );
    if (found) return found;
    const fresh = emptyMeta();
    await this.save(fresh);
    return fresh;
  }

  async save(meta: MetaProgression): Promise<MetaProgression> {
    const stamped = { ...meta, lastUpdatedAt: Date.now() };
    await this.adapter.put(META_DB_NAME, META_STORE, stamped, META_SINGLETON_KEY);
    return stamped;
  }

  /** Test-only: wipe meta. User-visible "reset everything" would call
   *  this together with RunStore.clear(). */
  async clear(): Promise<void> {
    await this.adapter.clear(META_DB_NAME);
  }
}
