import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "./env";
import * as schema from "./schema";

//TODO i dont like this at all
export { eq } from "drizzle-orm";

// Configure WebSocket for non-edge environments
neonConfig.webSocketConstructor = ws;

// Enable fetch-based queries for edge environments (Cloudflare Workers, Vercel Edge, etc.)
// neonConfig.poolQueryViaFetch = true

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export * from "./schema";
export type DB = typeof db;
