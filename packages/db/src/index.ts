import dotenv from "dotenv";

dotenv.config({
  path: "../../apps/server/.env",
});

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
// neonConfig.poolQueryViaFetch = true

const sql = neon(process.env.DATABASE_URL || "");
export const db = drizzle(sql);

// Export all schemas (barrel file needed for Drizzle schema exports)
// biome-ignore lint/performance/noBarrelFile: Required for Drizzle schema organization
export * from "./schema";
