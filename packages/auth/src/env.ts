import {
  authEnvSchema,
  createPackageEnv,
  serverEnvSchema,
} from "@zenith-hr/config/env";

/**
 * Auth package environment configuration
 * Combines auth-specific variables with CORS_ORIGIN from server schema
 */
export const env = createPackageEnv({
  ...authEnvSchema,
  CORS_ORIGIN: serverEnvSchema.CORS_ORIGIN,
});

export type AuthEnv = typeof env;
