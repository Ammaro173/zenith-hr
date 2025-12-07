import { cors } from "@elysiajs/cors";

import { env } from "../env";

/**
 * CORS plugin configuration
 * Centralized CORS settings for the server
 */
const parsedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsPlugin = cors({
  origin: parsedOrigins.length > 1 ? parsedOrigins : parsedOrigins[0],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86_400, // 24 hours
});
