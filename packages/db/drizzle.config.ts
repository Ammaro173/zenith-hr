import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1/.test(url);

export default defineConfig({
  schema: "./src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  ...(isLocal ? {} : { driver: "neon-serverless" as const }),
});
