import "dotenv/config";
import "./env";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

// Plugins
import { corsPlugin } from "./plugins/cors.plugin";

// Route handlers
import { aiRouteHandler } from "./routes/ai.route";
import { authHandler } from "./routes/auth.route";
import { openApiRouteHandler } from "./routes/openapi.route";
import { rpcRouteHandler } from "./routes/rpc.route";
import { docuSignWebhookHandler } from "./routes/webhooks.route";

/**
 * Zenith HR API Server
 *
 * Route structure:
 * - /api/auth/*  - Authentication routes (better-auth)
 * - /rpc/*       - RPC API routes (oRPC)
 * - /api/*       - OpenAPI reference routes
 * - /ai          - AI chat completion
 * - /api/webhooks/* - Webhook handlers
 */
export const app = new Elysia()
  // Plugins
  .use(opentelemetry())
  .use(corsPlugin)

  // Health check
  .get("/", () => "OK")
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))

  // Auth routes
  .all("/api/auth/*", authHandler)

  // RPC API routes
  .all("/rpc*", rpcRouteHandler)

  // OpenAPI reference routes
  .all("/api*", openApiRouteHandler)

  // AI routes
  .post("/ai", aiRouteHandler)

  // Webhook routes
  .post("/api/webhooks/docusign", docuSignWebhookHandler)

  // Start server
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
