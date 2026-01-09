import type { CacheService } from "../interfaces/cache.interface";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * In-memory implementation of CacheService
 * Suitable for single-instance deployments or development
 * For production with multiple instances, use RedisCache
 */
export class MemoryCache implements CacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs = 60_000) {
    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.cache.delete(key);
    return Promise.resolve();
  }

  deletePattern(pattern: string): Promise<void> {
    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    return Promise.resolve();
  }

  exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return Promise.resolve(false);
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (!entry || Date.now() > entry.expiresAt) {
        results.push(null);
      } else {
        results.push(entry.value as T);
      }
    }
    return Promise.resolve(results);
  }

  setMany<T>(
    entries: Array<{ key: string; value: T; ttlSeconds: number }>,
  ): Promise<void> {
    for (const entry of entries) {
      this.cache.set(entry.key, {
        value: entry.value,
        expiresAt: Date.now() + entry.ttlSeconds * 1000,
      });
    }
    return Promise.resolve();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup resources when shutting down
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
