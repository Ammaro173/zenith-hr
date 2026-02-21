import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import ws from "ws";
import { env } from "./env";
import * as schema from "./schema";

//TODO i dont like this at all
export { eq } from "drizzle-orm";

// Configure WebSocket for non-edge environments
neonConfig.webSocketConstructor = ws;

// Enable fetch-based queries for edge environments (Cloudflare Workers, Vercel Edge,Docker, etc.)
neonConfig.poolQueryViaFetch = true;

const url = env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(url);

export const db = isLocal
  ? drizzleNodePg(new Pool({ connectionString: url }), { schema })
  : drizzleNeon(neon(url), { schema });

export * from "./schema";
export type DB = typeof db;

export type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

export type DbOrTx = DB | Transaction;
