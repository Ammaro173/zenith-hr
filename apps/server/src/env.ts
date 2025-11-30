import { createEnv } from "@t3-oss/env-core";
import {
  aiEnvSchema,
  authEnvSchema,
  awsEnvSchema,
  cacheEnvSchema,
  dbEnvSchema,
  serverEnvSchema,
} from "@zenith-hr/config/env";

/**
 * Server environment configuration
 * Combines schemas from the shared config package
 */
export const env = createEnv({
  server: {
    // Database
    ...dbEnvSchema,

    // AWS / S3
    ...awsEnvSchema,

    // Server
    ...serverEnvSchema,

    // Auth
    ...authEnvSchema,

    // AI
    ...aiEnvSchema,

    // Cache (optional)
    ...cacheEnvSchema,
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.BUILDING === "true",
});

export type Env = typeof env;
