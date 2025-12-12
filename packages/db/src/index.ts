import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { env } from "./env";
// biome-ignore lint/performance/noNamespaceImport: schema barrel is required for Drizzle
import * as schema from "./schema";

//TODO i dont like this at all
export { eq } from "drizzle-orm";

// Configure WebSocket for non-edge environments
neonConfig.webSocketConstructor = ws;

// Enable fetch-based queries for edge environments (Cloudflare Workers, Vercel Edge, etc.)
// neonConfig.poolQueryViaFetch = true

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export * from "./schema";
