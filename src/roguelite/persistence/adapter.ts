import type { DatabaseSchema } from './schema';

// Minimal storage adapter. The roguelite persistence layer talks only
// to this interface so tests can drop in an in-memory implementation
// and the IndexedDB specifics stay browser-only.
export interface StorageAdapter {
  /** Retrieve a value by out-of-line key, or undefined if missing. */
  get<T>(dbName: string, storeName: string, key: string): Promise<T | undefined>;

  /** Write a value. If the store has a keyPath, `key` is ignored (value's
   *  keyPath field is used). If not, `key` is the out-of-line key. */
  put<T>(dbName: string, storeName: string, value: T, key?: string): Promise<void>;

  /** Delete by key (or keyPath-derived key). */
  delete(dbName: string, storeName: string, key: string): Promise<void>;

  /** Return every value in the store. */
  list<T>(dbName: string, storeName: string): Promise<T[]>;

  /** Wipe the entire database — irreversible. Used in tests and "abandon
   *  run" flows if the user explicitly requests it. */
  clear(dbName: string): Promise<void>;
}

// Registry of known schemas. Adapters use this to set up object stores
// on first open / version upgrade. Declared at module load by the
// persistence entry point; adapters should not hard-code schema.
const schemas = new Map<string, DatabaseSchema>();

export function registerSchema(schema: DatabaseSchema): void {
  schemas.set(schema.name, schema);
}

export function getSchema(dbName: string): DatabaseSchema {
  const s = schemas.get(dbName);
  if (!s) {
    throw new Error(
      `persistence: no schema registered for '${dbName}'. ` +
      `Did you import './index.ts' before using the adapter?`,
    );
  }
  return s;
}
