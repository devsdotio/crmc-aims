import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment or .env.local');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const tables = [
  "asset_lifecycle_events",
  "asset_models",
  "assets",
  "audit_logs",
  "requests",
  "borrow_transactions",
  "categories",
  "consumable_requests",
  "consumables",
  "dashboard_metric_snapshots",
  "departments",
  "locations",
  "maintenance_logs",
  "petty_cash_vouchers",
  "project_asset_assignments",
  "project_expense_lines",
  "projects",
  "purchase_lots",
  "stock_movements",
  "suppliers",
  "vouchers",
  "profiles"
];

async function main() {
  const isPost = process.argv.includes('--post');
  console.log(`Running ${isPost ? 'POST' : 'PRE'}-migration verification...`);

  const results: Record<string, { total: number; crmcTenant: number; nullTenant: number }> = {};

  for (const table of tables) {
    const totalRes = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
    const total = parseInt(totalRes[0].count, 10);
    
    let crmcTenant = 0;
    let nullTenant = 0;
    
    if (isPost) {
      const crmcRes = await sql`SELECT COUNT(*) as count FROM ${sql(table)} WHERE "tenant_id" = '00000000-0000-0000-0000-000000000001'`;
      crmcTenant = parseInt(crmcRes[0].count, 10);

      const nullRes = await sql`SELECT COUNT(*) as count FROM ${sql(table)} WHERE "tenant_id" IS NULL`;
      nullTenant = parseInt(nullRes[0].count, 10);
      
      if (table === 'profiles') {
        const superadminRes = await sql`SELECT COUNT(*) as count FROM "profiles" WHERE "role" = 'superadmin'`;
        const superadmins = parseInt(superadminRes[0].count, 10);
        if (nullTenant !== superadmins) {
          console.error(`ERROR: profiles table has ${nullTenant} null tenant_id, expected ${superadmins} (superadmins)`);
        }
      } else if (nullTenant > 0) {
        console.error(`ERROR: ${table} has ${nullTenant} rows with null tenant_id`);
      }
      
      if (table !== 'profiles' && crmcTenant !== total) {
        console.error(`ERROR: ${table} has ${total} total rows but only ${crmcTenant} belong to CRMC tenant`);
      }
    }
    
    results[table] = { total, crmcTenant, nullTenant };
    console.log(`${table}: ${total} total rows` + (isPost ? ` (CRMC: ${crmcTenant}, NULL: ${nullTenant})` : ''));
  }
  
  if (isPost) {
    console.log('Post-migration verification completed.');
  } else {
    console.log('Pre-migration verification completed. Save this output to compare with post-migration.');
  }
  
  await sql.end();
}

main().catch(console.error);
