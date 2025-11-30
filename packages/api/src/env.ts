import {
  awsEnvSchema,
  createPackageEnv,
  serverEnvSchema,
} from "@zenith-hr/config/env";

/**
 * API package environment configuration
 * Combines server variables (LOG_LEVEL, NODE_ENV) with AWS/S3 variables
 */
export const env = createPackageEnv({
  ...awsEnvSchema,
  LOG_LEVEL: serverEnvSchema.LOG_LEVEL,
  NODE_ENV: serverEnvSchema.NODE_ENV,
});

export type ApiEnv = typeof env;
