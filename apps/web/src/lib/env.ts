import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables
   * Available in API routes, server components, etc.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  /**
   * Client-side environment variables (exposed to browser)
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    NEXT_PUBLIC_SERVER_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
  },

  /**
   * Runtime environment variables
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  },

  /**
   * Skip validation during build (Next.js runs this during build)
   */
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
