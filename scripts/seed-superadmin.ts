/**
 * Seed or promote a superadmin profile for developer accounts.
 *
 * Usage (after SERVICE ROLE key is in .env.local):
 *   npx tsx scripts/seed-superadmin.ts you@example.com "Your Name"
 *
 * Behavior:
 * - Creates auth user if missing (random password; set via Supabase recovery)
 * - Upserts profiles row with role=superadmin
 *
 * Never commit real service role keys.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomBytes } from "node:crypto";

import { profiles } from "../src/server/db/schema/profiles";

loadEnvConfig(process.cwd());

const email = process.argv[2]?.trim().toLowerCase();
const fullName = process.argv[3]?.trim() || "Superadmin";

async function main() {
  if (!email) {
    console.error(
      'Usage: npx tsx scripts/seed-superadmin.ts <email> ["Full Name"]'
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!url || !serviceRoleKey || !databaseUrl) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);

  const listed = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = listed.data.users.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    const tempPassword = randomBytes(18).toString("base64url");
    const created = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (created.error || !created.data.user) {
      console.error("Failed to create auth user:", created.error?.message);
      process.exit(1);
    }

    user = created.data.user;
    console.log("Created auth user.");
    console.log(
      "Temporary password (store securely, change after first login):",
      tempPassword
    );
  } else {
    console.log("Auth user already exists:", user.id);
  }

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(profiles)
      .set({
        role: "superadmin",
        status: "active",
        fullName,
        email,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));
    console.log("Updated existing profile → superadmin.");
  } else {
    await db.insert(profiles).values({
      userId: user.id,
      email,
      fullName,
      role: "superadmin",
      status: "active",
      createdByUserId: null,
    });
    console.log("Inserted superadmin profile.");
  }

  await sql.end({ timeout: 5 });
  console.log("Done. Sign in with:", email);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
