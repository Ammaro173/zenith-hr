import { neonConfig, Pool } from "@neondatabase/serverless";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import type { PgTransaction } from "drizzle-orm/pg-core";
import ws from "ws";
import { env } from "./env";
import * as schema from "./schema";

//TODO i dont like this at all
export { eq } from "drizzle-orm";

// Configure WebSocket for non-edge environments
neonConfig.webSocketConstructor = ws;

// Enable fetch-based queries for edge environments (Cloudflare Workers, Vercel Edge,Docker, etc.)
neonConfig.poolQueryViaFetch = true;

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export * from "./schema";
export type DB = typeof db;

export type Transaction = PgTransaction<
  NeonQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DbOrTx = DB | Transaction;
