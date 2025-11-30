import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Shared environment configuration for the monorepo
 * Each package can extend this with its own specific variables
 */

/**
 * Database environment variables
 */
export const dbEnvSchema = {
  DATABASE_URL: z.string().url(),
};

/**
 * AWS/S3 environment variables
 */
export const awsEnvSchema = {
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET_NAME: z.string().min(1).optional(),
};

/**
 * Server environment variables
 */
export const serverEnvSchema = {
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGIN: z.string().url().optional(),
};

/**
 * Auth environment variables
 */
export const authEnvSchema = {
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
};

/**
 * AI/LLM environment variables
 */
export const aiEnvSchema = {
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
};

/**
 * Redis/Cache environment variables
 */
export const cacheEnvSchema = {
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
};

/**
 * Combined schema for all environment variables
 */
export const allEnvSchema = {
  ...dbEnvSchema,
  ...awsEnvSchema,
  ...serverEnvSchema,
  ...authEnvSchema,
  ...aiEnvSchema,
  ...cacheEnvSchema,
};

/**
 * Create a typed environment configuration
 * Use this in apps that need all environment variables
 */
export function createAppEnv(runtimeEnv: NodeJS.ProcessEnv = process.env) {
  return createEnv({
    server: allEnvSchema,
    runtimeEnv,
    emptyStringAsUndefined: true,
    skipValidation:
      runtimeEnv.SKIP_ENV_VALIDATION === "true" ||
      runtimeEnv.BUILDING === "true",
  });
}

/**
 * Create a partial environment configuration for packages
 * Useful when a package only needs specific variables
 */
export function createPackageEnv<T extends Record<string, z.ZodType>>(
  schema: T,
  runtimeEnv: NodeJS.ProcessEnv = process.env
): { [K in keyof T]: z.infer<T[K]> } {
  return createEnv({
    server: schema,
    runtimeEnv,
    emptyStringAsUndefined: true,
    skipValidation:
      runtimeEnv.SKIP_ENV_VALIDATION === "true" ||
      runtimeEnv.BUILDING === "true",
  }) as { [K in keyof T]: z.infer<T[K]> };
}
