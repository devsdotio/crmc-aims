/**
 * Inspect DATABASE_URL_TEST — prints host + public tables only (no secrets).
 */
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_TEST?.trim();
if (!url) {
  console.error("DATABASE_URL_TEST is not set.");
  process.exit(1);
}

const host = url.match(/@([^/]+)/)?.[1] ?? "(unknown)";
console.log("DATABASE_URL_TEST host:", host);

const sql = postgres(url, { max: 1, connect_timeout: 30 });

async function main() {
  try {
    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    console.log("public table count:", tables.length);
    console.log(
      "public tables:",
      tables.map((t) => t.table_name).join(", ") || "(none)"
    );

    try {
      const migrations = await sql`
        select id, created_at
        from drizzle.__drizzle_migrations
        order by created_at
      `;
      console.log("recorded migrations:", migrations.length);
    } catch (e) {
      console.log("drizzle.__drizzle_migrations:", (e as Error).message);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
