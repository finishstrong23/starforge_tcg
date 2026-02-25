/**
 * STARFORGE TCG - Object Utilities
 *
 * Deep clone and freeze utilities for immutable state management.
 */

/**
 * Deep clone an object
 * Handles nested objects, arrays, Maps, and Sets
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => {
      clonedMap.set(deepClone(key), deepClone(value));
    });
    return clonedMap as unknown as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const clonedSet = new Set();
    obj.forEach((value) => {
      clonedSet.add(deepClone(value));
    });
    return clonedSet as unknown as T;
  }

  // Handle plain objects
  const clonedObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return clonedObj as T;
}

/**
 * Deep freeze an object (make it immutable)
 * @param obj Object to freeze
 * @returns The frozen object
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj as Readonly<T>;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj as Readonly<T>;
  }

  // Freeze the object itself
  Object.freeze(obj);

  // Freeze all nested objects
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj as Readonly<T>;
}

/**
 * Merge two objects deeply
 * @param target Target object
 * @param source Source object to merge into target
 * @returns New merged object
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = deepClone(target);

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = result[key];
      const sourceValue = source[key];

      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = deepClone(sourceValue);
      }
    }
  }

  return result;
}

/**
 * Check if a value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Map) && !(value instanceof Set);
}

/**
 * Compare two objects for deep equality
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Handle identical references and primitives
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle primitives
  if (typeof a !== 'object') return a === b;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle Maps
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key))) {
        return false;
      }
    }
    return true;
  }

  // Handle Sets
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }

  // Handle plain objects
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
