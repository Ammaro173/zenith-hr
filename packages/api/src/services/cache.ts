// Simple in-memory cache with TTL (mock Upstash Redis)
// Can be swapped for Upstash Redis later

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function get<T>(key: string): Promise<T | null> {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function invalidate(key: string): Promise<void> {
  cache.delete(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}
