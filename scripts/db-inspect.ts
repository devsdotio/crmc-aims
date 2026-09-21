/**
 * Inspect public tables / enums and drizzle migration history.
 * Usage: npx tsx scripts/db-inspect.ts
 */
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main() {
  try {
    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    console.log(
      "public tables:",
      tables.map((t) => t.table_name).join(", ") || "(none)"
    );

    const enums = await sql`
      select t.typname as name
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e'
      order by t.typname
    `;
    console.log(
      "public enums:",
      enums.map((e) => e.name).join(", ") || "(none)"
    );

    try {
      const migrations = await sql`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at
      `;
      console.log("recorded migrations:", migrations.length);
      for (const row of migrations) {
        console.log(`  - id=${row.id} hash=${row.hash} at=${row.created_at}`);
      }
    } catch (error) {
      console.log(
        "drizzle.__drizzle_migrations:",
        error instanceof Error ? error.message : error
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main();
