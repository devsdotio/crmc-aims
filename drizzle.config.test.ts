import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

// Intentionally ignore DATABASE_URL — tests must never migrate prod/dev by accident.
const databaseUrl = process.env.DATABASE_URL_TEST?.trim();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_TEST is not configured. Add it to .env.local before running db:migrate:test."
  );
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
