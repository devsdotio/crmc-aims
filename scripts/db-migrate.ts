/**
 * Applies Drizzle migrations and prints the real SQL error if anything fails.
 * Workaround for drizzle-kit migrate swallowing rejection messages (exit 1, no cause).
 *
 * Usage: npx tsx scripts/db-migrate.ts
 */
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log("Applying migrations from src/server/db/migrations ...");
  try {
    // Hosted Postgres often ships a short statement_timeout; DDL on busy tables
    // can wait on locks longer than that. Disable for the migration session only.
    await client`SET statement_timeout = 0`;
    await client`SET lock_timeout = 0`;
    await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}

void main();
