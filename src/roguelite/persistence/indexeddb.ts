import type { StorageAdapter } from './adapter';
import { getSchema } from './adapter';

// Real IndexedDB adapter for the browser. Uses the registered schema to
// set up object stores on open/upgrade. All methods return Promises;
// requests are wrapped with `promisify`.

export class IndexedDBAdapter implements StorageAdapter {
  private readonly connections = new Map<string, Promise<IDBDatabase>>();

  private openDatabase(dbName: string): Promise<IDBDatabase> {
    const existing = this.connections.get(dbName);
    if (existing) return existing;

    const schema = getSchema(dbName);
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }
      const request = indexedDB.open(schema.name, schema.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of schema.stores) {
          if (!db.objectStoreNames.contains(store.name)) {
            const created = db.createObjectStore(
              store.name,
              store.keyPath ? { keyPath: store.keyPath } : undefined,
            );
            for (const idx of store.indexes ?? []) {
              created.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
            }
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`IndexedDB open blocked for ${dbName}`));
    });

    this.connections.set(dbName, opening);
    return opening;
  }

  private async transaction<T>(
    dbName: string,
    storeName: string,
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<T[]>,
  ): Promise<T | T[] | undefined> {
    const db = await this.openDatabase(dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = work(store);
      request.onsuccess = () => resolve(request.result as T | T[] | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(dbName: string, storeName: string, key: string): Promise<T | undefined> {
    const res = await this.transaction<T>(dbName, storeName, 'readonly', (s) => s.get(key));
    return res as T | undefined;
  }

  async put<T>(dbName: string, storeName: string, value: T, key?: string): Promise<void> {
    await this.transaction(dbName, storeName, 'readwrite', (s) => {
      // If the store has a keyPath, the browser derives the key from
      // `value`. Otherwise we pass the explicit out-of-line key.
      return key === undefined
        ? s.put(value as unknown as IDBValidKey)
        : s.put(value as unknown as IDBValidKey, key);
    });
  }

  async delete(dbName: string, storeName: string, key: string): Promise<void> {
    await this.transaction(dbName, storeName, 'readwrite', (s) => s.delete(key));
  }

  async list<T>(dbName: string, storeName: string): Promise<T[]> {
    const res = await this.transaction<T>(dbName, storeName, 'readonly', (s) => s.getAll());
    return (res ?? []) as T[];
  }

  async clear(dbName: string): Promise<void> {
    // Close the connection before deleting so the delete isn't blocked.
    const pending = this.connections.get(dbName);
    if (pending) {
      const db = await pending;
      db.close();
      this.connections.delete(dbName);
    }
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error(`deleteDatabase blocked for ${dbName}`));
    });
  }
}
