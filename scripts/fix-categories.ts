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
  console.log("Applying categories schema fix...");
  try {
    await sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'asset' NOT NULL;`;
    await sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "color_token" text;`;
    await sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid;`;
    
    // Add constraint if not exists
    try {
      await sql`ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_user_id_profiles_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        console.error("Failed to add constraint:", e);
      }
    }
    console.log("Categories schema fixed successfully.");
  } catch (error) {
    console.error("Fix failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
