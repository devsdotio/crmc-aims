/**
 * Repair consumable_requests that were inserted with the schema-default
 * tenant (00000000-…-0001) while the requester belongs to another tenant.
 *
 * Usage: npx tsx scripts/repair-consumable-request-tenants.ts
 */
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";
const sql = postgres(databaseUrl, { max: 1 });

async function main() {
  const before = await sql`
    select count(*)::int as n
    from consumable_requests cr
    join profiles p on p.user_id = cr.requester_user_id
    where p.tenant_id is not null
      and cr.tenant_id is distinct from p.tenant_id
  `;
  console.log("mis-tenanted consumable_requests:", before[0].n);

  const updated = await sql`
    update consumable_requests cr
    set tenant_id = p.tenant_id,
        updated_at = now()
    from profiles p
    where p.user_id = cr.requester_user_id
      and p.tenant_id is not null
      and cr.tenant_id is distinct from p.tenant_id
    returning cr.request_code, cr.tenant_id
  `;
  console.log(`repaired ${updated.length} rows`);
  for (const row of updated.slice(0, 20)) {
    console.log(" ", row.request_code, "→", row.tenant_id);
  }
  if (updated.length > 20) {
    console.log(`  …and ${updated.length - 20} more`);
  }

  const stillDefault = await sql`
    select count(*)::int as n
    from consumable_requests
    where tenant_id = ${DEFAULT_TENANT}
  `;
  console.log("remaining default-tenant CRQs:", stillDefault[0].n);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
