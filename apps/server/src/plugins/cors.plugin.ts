import { cors } from "@elysiajs/cors";

import { env } from "../env";

/**
 * CORS plugin configuration
 * Centralized CORS settings for the server
 */
export const corsPlugin = cors({
  origin: env.CORS_ORIGIN ?? "",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86_400, // 24 hours
});
