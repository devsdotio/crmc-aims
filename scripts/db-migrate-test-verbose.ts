/**
 * Apply drizzle migrations one-by-one against DATABASE_URL_TEST and stop on first real error.
 */
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_TEST?.trim();
if (!url) {
  console.error("DATABASE_URL_TEST is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 30, onnotice: () => {} });

async function main() {
  const journalPath = path.join(
    process.cwd(),
    "src/server/db/migrations/meta/_journal.json"
  );
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };

  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const applied = await sql<{ hash: string }[]>`
    select hash from drizzle.__drizzle_migrations
  `;
  const appliedSet = new Set(applied.map((r) => r.hash));

  for (const entry of journal.entries) {
    const file = path.join(
      process.cwd(),
      "src/server/db/migrations",
      `${entry.tag}.sql`
    );
    const body = await readFile(file, "utf8");
    const hash = entry.tag;
    if (appliedSet.has(hash)) {
      console.log("skip", entry.tag);
      continue;
    }

    console.log("apply", entry.tag);
    try {
      await sql.begin(async (tx) => {
        const statements = body
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const statement of statements) {
          await tx.unsafe(statement);
        }
        await tx`
          insert into drizzle.__drizzle_migrations (hash, created_at)
          values (${hash}, ${Date.now()})
        `;
      });
      console.log("ok", entry.tag);
    } catch (err) {
      console.error("FAILED", entry.tag);
      console.error(err);
      process.exitCode = 1;
      return;
    }
  }

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by 1
  `;
  console.log("done. public tables:", tables.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
