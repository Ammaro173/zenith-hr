/**
 * Cache Service Type
 * Abstraction for caching operations (in-memory, Redis, etc.)
 */
export interface CacheService {
  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found/expired
   */
  get: <T>(key: string) => Promise<T | null>;

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - Time-to-live in seconds
   */
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;

  /**
   * Delete a value from the cache
   * @param key - The cache key to delete
   */
  delete: (key: string) => Promise<void>;

  /**
   * Delete all keys matching a pattern
   * @param pattern - Pattern to match (e.g., "user:*")
   */
  deletePattern: (pattern: string) => Promise<void>;

  /**
   * Check if a key exists in the cache
   * @param key - The cache key
   */
  exists: (key: string) => Promise<boolean>;

  /**
   * Get multiple values from the cache
   * @param keys - Array of cache keys
   */
  getMany?: <T>(keys: string[]) => Promise<(T | null)[]>;

  /**
   * Set multiple values in the cache
   * @param entries - Array of key-value-ttl tuples
   */
  setMany?: <T>(
    entries: Array<{ key: string; value: T; ttlSeconds: number }>,
  ) => Promise<void>;
}
