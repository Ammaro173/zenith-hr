// Simple in-memory cache with TTL (mock Upstash Redis)
// Can be swapped for Upstash Redis later

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function get<T>(key: string): Promise<T | null> {
  const entry = cache.get(key);
  if (!entry) {
    return Promise.resolve(null);
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return Promise.resolve(null);
  }

  return Promise.resolve(entry.value as T);
}

export function set<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return Promise.resolve();
}

export function invalidate(key: string): Promise<void> {
  cache.delete(key);
  return Promise.resolve();
}

export function invalidatePattern(pattern: string): Promise<void> {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  return Promise.resolve();
}
