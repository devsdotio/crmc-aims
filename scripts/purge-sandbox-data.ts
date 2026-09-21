/**
 * Delete rows flagged is_sandbox=true and their dependent records.
 * Live (is_sandbox=false) rows are left untouched.
 *
 * Usage: npx tsx scripts/purge-sandbox-data.ts
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

type CountRow = { total: string | number; sandbox: string | number };

async function counts(): Promise<
  Record<string, { total: number; sandbox: number; live: number }>
> {
  const tables = [
    "departments",
    "assets",
    "consumables",
    "asset_models",
  ] as const;
  const out: Record<string, { total: number; sandbox: number; live: number }> =
    {};
  for (const table of tables) {
    const [row] = await sql<CountRow[]>`
      select
        count(*)::int as total,
        count(*) filter (where is_sandbox = true)::int as sandbox
      from ${sql(table)}
    `;
    const total = Number(row.total);
    const sandbox = Number(row.sandbox);
    out[table] = { total, sandbox, live: total - sandbox };
  }
  return out;
}

function printCounts(
  label: string,
  c: Record<string, { total: number; sandbox: number; live: number }>
) {
  console.log(`\n${label}`);
  for (const [table, row] of Object.entries(c)) {
    console.log(
      `  ${table.padEnd(14)} total=${row.total}  sandbox=${row.sandbox}  live=${row.live}`
    );
  }
}

async function main() {
  const before = await counts();
  printCounts("Before purge", before);

  const totalSandbox =
    before.assets.sandbox +
    before.consumables.sandbox +
    before.asset_models.sandbox +
    before.departments.sandbox;

  if (totalSandbox === 0) {
    console.log("\nNo sandbox rows found. Nothing to delete.");
    return;
  }

  await sql.begin(async (tx) => {
    // --- Consumables + dependents (restrict FKs) ---
    const touchedReqs = await tx`
      select distinct request_id as id
      from consumable_request_lines
      where consumable_id in (select id from consumables where is_sandbox = true)
    `;
    const touchedIds = touchedReqs.map((r) => r.id as string);

    const alloc = await tx`
      delete from consumable_request_release_allocations
      where consumable_id in (select id from consumables where is_sandbox = true)
    `;
    console.log(`\ndeleted release allocations: ${alloc.count}`);

    const stockBySku = await tx`
      delete from stock_movements
      where consumable_id in (select id from consumables where is_sandbox = true)
    `;
    console.log(`deleted stock_movements (sandbox SKUs): ${stockBySku.count}`);

    const lines = await tx`
      delete from consumable_request_lines
      where consumable_id in (select id from consumables where is_sandbox = true)
    `;
    console.log(`deleted consumable_request_lines: ${lines.count}`);

    if (touchedIds.length > 0) {
      const emptied = await tx`
        delete from consumable_requests cr
        where cr.id in ${sql(touchedIds)}
          and not exists (
            select 1 from consumable_request_lines l where l.request_id = cr.id
          )
      `;
      console.log(`deleted emptied consumable_requests: ${emptied.count}`);
    }

    await tx`
      update purchase_lots
      set consumable_id = null
      where consumable_id in (select id from consumables where is_sandbox = true)
    `;

    const cons = await tx`
      delete from consumables where is_sandbox = true
    `;
    console.log(`deleted consumables: ${cons.count}`);

    // --- Assets + dependents ---
    const assignments = await tx`
      delete from project_asset_assignments
      where asset_id in (select id from assets where is_sandbox = true)
    `;
    console.log(`deleted project_asset_assignments: ${assignments.count}`);

    // Borrow requests whose items only reference sandbox assets (jsonb, no FK)
    const sandboxOnlyBorrowReqs = await tx`
      delete from requests r
      where exists (
        select 1
        from jsonb_array_elements(coalesce(r.items, '[]'::jsonb)) elem
        where nullif(elem->>'assetId', '') is not null
          and (elem->>'assetId')::uuid in (
            select id from assets where is_sandbox = true
          )
      )
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(r.items, '[]'::jsonb)) elem
        where nullif(elem->>'assetId', '') is not null
          and (elem->>'assetId')::uuid in (
            select id from assets where is_sandbox = false
          )
      )
    `;
    console.log(
      `deleted requests (sandbox-only assets): ${sandboxOnlyBorrowReqs.count}`
    );

    const assetsDel = await tx`
      delete from assets where is_sandbox = true
    `;
    console.log(`deleted assets: ${assetsDel.count}`);

    await tx`
      update assets
      set model_id = null
      where model_id in (select id from asset_models where is_sandbox = true)
    `;
    const models = await tx`
      delete from asset_models where is_sandbox = true
    `;
    console.log(`deleted asset_models: ${models.count}`);

    // --- Sandbox departments + restrict dependents ---
    await tx`
      update profiles
      set department_id = null
      where department_id in (select id from departments where is_sandbox = true)
    `;

    const stockByDept = await tx`
      delete from stock_movements
      where department_id in (select id from departments where is_sandbox = true)
    `;
    console.log(`deleted stock_movements (sandbox depts): ${stockByDept.count}`);

    const borrowTx = await tx`
      delete from borrow_transactions
      where department_id in (select id from departments where is_sandbox = true)
    `;
    console.log(`deleted borrow_transactions (sandbox depts): ${borrowTx.count}`);

    const borrowReq = await tx`
      delete from requests
      where department_id in (select id from departments where is_sandbox = true)
    `;
    console.log(`deleted requests (sandbox depts): ${borrowReq.count}`);

    const consReqDept = await tx`
      delete from consumable_requests
      where department_id in (select id from departments where is_sandbox = true)
    `;
    console.log(
      `deleted consumable_requests (sandbox depts): ${consReqDept.count}`
    );

    const depts = await tx`
      delete from departments where is_sandbox = true
    `;
    console.log(`deleted departments: ${depts.count}`);
  });

  const after = await counts();
  printCounts("After purge", after);

  for (const table of Object.keys(after)) {
    if (after[table].sandbox !== 0) {
      throw new Error(`${table} still has sandbox rows after purge`);
    }
    if (after[table].live !== before[table].live) {
      throw new Error(
        `${table} live count changed (${before[table].live} → ${after[table].live})`
      );
    }
  }

  console.log("\nPurge OK — all sandbox rows removed; live counts unchanged.");
}

void main()
  .catch((err) => {
    console.error("\nPurge failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
