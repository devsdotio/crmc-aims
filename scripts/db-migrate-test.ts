/**
 * Bootstrap DATABASE_URL_TEST from the current Drizzle schema.
 *
 * Historical SQL migrations assume intermediate prod table names (e.g. "requests")
 * and orphan files not in the journal — they are not safe to replay on a blank DB.
 * Test DBs use `drizzle-kit push` instead. App/prod keeps using `db:migrate`.
 */
import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const testUrl = process.env.DATABASE_URL_TEST?.trim();
if (!testUrl) {
  console.error(
    "DATABASE_URL_TEST is not set. Add it to .env.local pointing at your empty Supabase project."
  );
  process.exit(1);
}

const host = testUrl.match(/@([^/]+)/)?.[1] ?? "(unknown)";
console.log("[db:migrate:test] target host:", host);
console.log(
  "[db:migrate:test] using drizzle-kit push (schema sync) — not replaying historical SQL"
);

async function resetPublicSchema() {
  const sql = postgres(testUrl!, { max: 1, connect_timeout: 30 });
  try {
    console.log("[db:migrate:test] resetting public + drizzle schemas…");
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      DROP SCHEMA IF EXISTS drizzle CASCADE;
    `);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  await resetPublicSchema();

  const result = spawnSync(
    "npx",
    [
      "drizzle-kit",
      "push",
      "--config",
      "drizzle.config.test.ts",
      "--force",
    ],
    {
      stdio: "inherit",
      env: process.env,
      shell: true,
    }
  );

  if (result.status !== 0) {
    console.error(
      `[db:migrate:test] drizzle-kit push exited with code ${result.status ?? 1}`
    );
  }
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
