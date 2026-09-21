import { defineConfig } from "drizzle-kit";

/**
 * Prefer the root `drizzle.config.ts` (loads Next env automatically).
 * This file remains as a module-local pointer for editors that open it.
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your environment (.env / .env.local)."
  );
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
