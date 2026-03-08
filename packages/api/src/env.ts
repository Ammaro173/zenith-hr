import {
  awsEnvSchema,
  createPackageEnv,
  emailEnvSchema,
  serverEnvSchema,
  vapidEnvSchema,
} from "@zenith-hr/config/env";

/**
 * API package environment configuration
 * Combines server variables (LOG_LEVEL, NODE_ENV) with AWS/S3 variables
 */
export const env = createPackageEnv({
  ...awsEnvSchema,
  ...emailEnvSchema,
  ...vapidEnvSchema,
  LOG_LEVEL: serverEnvSchema.LOG_LEVEL,
  NODE_ENV: serverEnvSchema.NODE_ENV,
  PERFORMANCE_CRON_SECRET: serverEnvSchema.PERFORMANCE_CRON_SECRET,
});

export type ApiEnv = typeof env;
