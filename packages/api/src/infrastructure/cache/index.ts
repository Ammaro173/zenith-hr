// Re-export cache interface
export type { CacheService } from "../interfaces/cache.interface";
// Cache implementations
export { MemoryCache } from "./memory.cache";
export { createRedisCache, type RedisCacheConfig } from "./redis.cache";
