import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const cols = await sql`
    select column_name, data_type, udt_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'assets'
    order by ordinal_position
  `;
  console.log("assets columns:");
  for (const c of cols) {
    console.log(`  ${c.column_name}: ${c.data_type} (${c.udt_name})`);
  }

  const labels = await sql`
    select t.typname, e.enumlabel
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname, e.enumsortorder
  `;
  console.log("enums:");
  for (const row of labels) {
    console.log(`  ${row.typname}.${row.enumlabel}`);
  }

  await sql.end({ timeout: 5 });
}

void main();
