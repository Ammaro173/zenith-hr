import { createPackageEnv, dbEnvSchema } from "@zenith-hr/config/env";

/**
 * Database package environment configuration
 * Uses the centralized schema from config package
 */
export const env = createPackageEnv(dbEnvSchema);

export type DbEnv = typeof env;
