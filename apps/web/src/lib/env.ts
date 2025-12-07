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
    SERVER_URL: z.string().url().default("http://localhost:3000"),
    VAPID_PRIVATE_KEY: z.string().optional(),
  },

  /**
   * Client-side environment variables (exposed to browser)
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    NEXT_PUBLIC_SERVER_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  },

  /**
   * Runtime environment variables
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SERVER_URL: process.env.SERVER_URL,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },

  /**
   * Skip validation during build (Next.js runs this during build)
   */
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
