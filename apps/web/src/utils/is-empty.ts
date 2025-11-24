// biome-ignore-all lint/suspicious/noExplicitAny: <handles any type>
/** biome-ignore-all lint/style/useBlockStatements: <more readable> */

/**
 * Utility function to check if a value is "empty."
 *
 * @param val - The value to check.
 * @returns Returns true if the value is empty, otherwise false.
 */
function isEmpty(val: any): boolean {
  // Null or Undefined...
  if (val == null) return true;

  // Boolean...
  if (typeof val === "boolean") return false;

  // Number...
  if (typeof val === "number") return val === 0 || Number.isNaN(val);

  // String...
  if (typeof val === "string") return val.trim().length === 0;

  // Function...
  if (typeof val === "function") return val.length === 0;

  // Array...
  if (Array.isArray(val)) return val.length === 0;

  // Map...
  if (val instanceof Map) return val.size === 0;

  // Set...
  if (val instanceof Set) return val.size === 0;

  // WeakMap, WeakSet...
  if (val instanceof WeakMap || val instanceof WeakSet) return false;

  // Error...
  if (val instanceof Error) return val.message === "";

  // Plain Object (including Object.create(null))...
  if (isPlainObject(val)) return isObjectEmpty(val);

  // Date...
  if (val instanceof Date) return Number.isNaN(val.getTime());

  // General Object...
  if (typeof val === "object") return isObjectEmpty(val);

  // Everything else (including DOM nodes)...
  return false;
}

/**
 * Utility function to check if an object is empty (deep check).
 *
 * @param obj - The object to check.
 * @returns Returns true if the object is empty, otherwise false.
 */
const isObjectEmpty = (obj: Record<string, any>): boolean => {
  if (!obj) return true;

  return Object.values(obj).every((value) => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return isObjectEmpty(value);
    return !value;
  });
};

/**
 * Utility function to check if a value is a plain object.
 *
 * @param obj - The value to check.
 * @returns Returns true if the value is a plain object, otherwise false.
 */
function isPlainObject(obj: any): obj is Record<string, any> {
  if (typeof obj !== "object" || obj === null) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

export default isEmpty;
