import type { StorageAdapter } from './adapter';

// In-memory StorageAdapter. Used in tests and non-browser environments
// (SSR, Node scripts). Mirrors IndexedDB semantics: keyPath-aware put,
// per-database isolation, list returns insertion order.
export class InMemoryAdapter implements StorageAdapter {
  private dbs = new Map<string, Map<string, Map<string, unknown>>>();

  private getStore(dbName: string, storeName: string): Map<string, unknown> {
    let db = this.dbs.get(dbName);
    if (!db) {
      db = new Map();
      this.dbs.set(dbName, db);
    }
    let store = db.get(storeName);
    if (!store) {
      store = new Map();
      db.set(storeName, store);
    }
    return store;
  }

  async get<T>(dbName: string, storeName: string, key: string): Promise<T | undefined> {
    return this.getStore(dbName, storeName).get(key) as T | undefined;
  }

  async put<T>(dbName: string, storeName: string, value: T, key?: string): Promise<void> {
    // Re-resolve keyPath from schema if the store has one. For simplicity,
    // the in-memory adapter accepts either an explicit `key` or an object
    // with a `runId` field (the only keyPath used in Phase 2).
    const store = this.getStore(dbName, storeName);
    const resolvedKey =
      key ?? (value as unknown as { runId?: string })?.runId;
    if (!resolvedKey) {
      throw new Error(
        `InMemoryAdapter.put: no key resolvable for ${dbName}/${storeName}`,
      );
    }
    store.set(resolvedKey, value);
  }

  async delete(dbName: string, storeName: string, key: string): Promise<void> {
    this.getStore(dbName, storeName).delete(key);
  }

  async list<T>(dbName: string, storeName: string): Promise<T[]> {
    return Array.from(this.getStore(dbName, storeName).values()) as T[];
  }

  async clear(dbName: string): Promise<void> {
    this.dbs.delete(dbName);
  }
}
