import type { CacheService } from "../interfaces/cache.interface";

/**
 * Redis configuration options
 */
export type RedisCacheConfig = {
  url: string;
  token?: string;
};

/**
 * Type definition for Upstash Redis client
 * This allows us to use dynamic imports without TypeScript errors
 */
type UpstashRedisClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (
    key: string,
    value: unknown,
    options?: { ex?: number }
  ) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  exists: (key: string) => Promise<number>;
  mget: <T>(...keys: string[]) => Promise<(T | null)[]>;
  pipeline: () => {
    set: (key: string, value: unknown, options?: { ex?: number }) => unknown;
    exec: () => Promise<unknown>;
  };
};

/**
 * Factory function to create a Redis cache with Upstash
 * This avoids importing @upstash/redis at module level
 *
 * To use this, install @upstash/redis:
 * bun add @upstash/redis
 */
export async function createRedisCache(
  config: RedisCacheConfig
): Promise<CacheService> {
  try {
    // Dynamic import to avoid requiring @upstash/redis as a hard dependency
    // Using variable to prevent TypeScript from statically analyzing the import
    const moduleName = "@upstash/redis";
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic import of optional dependency
    const upstashModule = (await import(
      /* webpackIgnore: true */ moduleName
    )) as any;
    const Redis = upstashModule.Redis;

    const redis: UpstashRedisClient = new Redis({
      url: config.url,
      token: config.token,
    });

    return {
      async get<T>(key: string): Promise<T | null> {
        return await redis.get<T>(key);
      },

      async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        await redis.set(key, value, { ex: ttlSeconds });
      },

      async delete(key: string): Promise<void> {
        await redis.del(key);
      },

      async deletePattern(pattern: string): Promise<void> {
        const keys = await redis.keys(pattern);
        for (const key of keys) {
          await redis.del(key);
        }
      },

      async exists(key: string): Promise<boolean> {
        const result = await redis.exists(key);
        return result > 0;
      },

      async getMany<T>(keys: string[]): Promise<(T | null)[]> {
        if (keys.length === 0) {
          return [];
        }
        return await redis.mget<T>(...keys);
      },

      async setMany<T>(
        entries: Array<{ key: string; value: T; ttlSeconds: number }>
      ): Promise<void> {
        const pipeline = redis.pipeline();
        for (const entry of entries) {
          pipeline.set(entry.key, entry.value, { ex: entry.ttlSeconds });
        }
        await pipeline.exec();
      },
    };
  } catch {
    throw new Error(
      "Failed to create Redis cache. Make sure @upstash/redis is installed: bun add @upstash/redis"
    );
  }
}
