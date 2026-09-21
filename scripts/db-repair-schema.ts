import { loadEnvConfig } from "@next/env";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Resets incompatible draft asset tables and applies the repo migration cleanly.
 * Safe when early experiment schema has no/zero meaningful AIMS data.
 *
 * Usage: npx tsx scripts/db-repair-schema.ts
 */
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const migrationsDir = path.join(process.cwd(), "src/server/db/migrations");
const journal = JSON.parse(
  fs.readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8")
) as {
  entries: Array<{ tag: string; when: number; breakpoints: boolean }>;
};

async function main() {
  const assetsExists = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = 'assets'
    ) as exists
  `;
  const hasAssets = Boolean(assetsExists[0]?.exists);

  if (hasAssets) {
    const countRows = await sql`select count(*)::int as n from assets`;
    const n = countRows[0]?.n ?? 0;
    console.log(`Existing public.assets row count: ${n}`);

    if (n > 0) {
      console.error(
        "Refusing to drop assets — table has data. Back up or migrate manually first."
      );
      process.exitCode = 1;
      return;
    }
  } else {
    console.log("public.assets does not exist (likely mid-failed push). Continuing…");
  }

  console.log("Dropping incompatible / partial draft objects...");
  await sql.begin(async (tx) => {
    // Drop enums via cascade of tables that use them
    await tx`drop table if exists "assets" cascade`;
    await tx`drop table if exists "categories" cascade`;
    await tx`drop table if exists "departments" cascade`;
    await tx`drop table if exists "locations" cascade`;
    await tx`drop type if exists "public"."asset_status" cascade`;
    await tx`drop type if exists "public"."asset_category" cascade`;

    // Clear migration history so we re-apply cleanly
    await tx`create schema if not exists drizzle`;
    await tx`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;
    await tx`truncate drizzle.__drizzle_migrations restart identity`;
  });

  console.log("Applying repo migrations...");
  await sql.begin(async (tx) => {
    for (const entry of journal.entries) {
      const filePath = path.join(migrationsDir, `${entry.tag}.sql`);
      const query = fs.readFileSync(filePath, "utf8");
      const hash = crypto.createHash("sha256").update(query).digest("hex");
      const statements = query.split("--> statement-breakpoint");

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          await tx.unsafe(trimmed);
        }
      }

      await tx`
        insert into drizzle.__drizzle_migrations ("hash", "created_at")
        values (${hash}, ${entry.when})
      `;
      console.log(`  applied ${entry.tag} (${hash.slice(0, 12)}…)`);
    }
  });

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name
  `;
  console.log(
    "public tables:",
    tables.map((t) => t.table_name).join(", ")
  );
  console.log("Schema repair complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
