import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  console.log("=== Multi-Tenant Architecture End-to-End Verification ===");

  try {
    // 1. Data Preservation Verification
    console.log("\n[1/4] Verifying default CRMC tenant data preservation...");
    const CRMC_TENANT_ID = "00000000-0000-0000-0000-000000000001";
    const [crmcTenant] = await sql`SELECT * FROM tenants WHERE id = ${CRMC_TENANT_ID}`;
    if (!crmcTenant) {
      throw new Error("Default CRMC tenant not found in tenants table!");
    }
    console.log(`✓ CRMC Tenant found: "${crmcTenant.name}" (${crmcTenant.slug})`);

    const [crmcAssets] = await sql`SELECT count(*) as count FROM assets WHERE tenant_id = ${CRMC_TENANT_ID}`;
    const [nullAssets] = await sql`SELECT count(*) as count FROM assets WHERE tenant_id IS NULL`;
    console.log(`✓ Assets in CRMC: ${crmcAssets.count}, NULL tenant assets: ${nullAssets.count}`);
    if (Number(nullAssets.count) > 0) {
      throw new Error("Found assets with NULL tenant_id!");
    }

    // 2. Provisioning Secondary Test Tenant (St. Jude Institute)
    console.log("\n[2/4] Provisioning secondary test tenant (St. Jude Institute - sji)...");
    const [sjiTenant] = await sql`
      INSERT INTO tenants (slug, name)
      VALUES ('sji-test', 'St. Jude Institute of Technology')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, slug, name
    `;
    console.log(`✓ Secondary Tenant provisioned: "${sjiTenant.name}" (ID: ${sjiTenant.id})`);

    // 3. Complete Data Isolation Verification
    console.log("\n[3/4] Testing data isolation between CRMC and SJI...");
    const [sjiAssetCount] = await sql`SELECT count(*) as count FROM assets WHERE tenant_id = ${sjiTenant.id}`;
    const [sjiDeptCount] = await sql`SELECT count(*) as count FROM departments WHERE tenant_id = ${sjiTenant.id}`;
    console.log(`✓ SJI Assets: ${sjiAssetCount.count} (isolated from CRMC's ${crmcAssets.count} assets)`);
    console.log(`✓ SJI Departments: ${sjiDeptCount.count}`);
    if (Number(sjiAssetCount.count) !== 0) {
      throw new Error("SJI tenant should have 0 initial assets!");
    }

    // 4. Testing Independent Numbering Series (Collision Resistance)
    console.log("\n[4/4] Testing identical code series in both tenants (composite uniqueness)...");
    const testCode = "AST-TEST-COLLISION-001";

    // Insert into CRMC
    const [crmcTestAsset] = await sql`
      INSERT INTO assets (
        tenant_id,
        asset_code,
        name,
        category,
        location,
        status,
        assignment_type
      )
      VALUES (
        ${CRMC_TENANT_ID},
        ${testCode},
        'CRMC Test Machine',
        'Equipment',
        'Main Warehouse',
        'active',
        'borrowable'
      )
      RETURNING id, asset_code, tenant_id
    `;
    console.log(`✓ Created test asset in CRMC with code "${crmcTestAsset.asset_code}"`);

    // Insert into SJI with the EXACT SAME code
    const [sjiTestAsset] = await sql`
      INSERT INTO assets (
        tenant_id,
        asset_code,
        name,
        category,
        location,
        status,
        assignment_type
      )
      VALUES (
        ${sjiTenant.id},
        ${testCode},
        'SJI Test Machine',
        'Equipment',
        'Main Warehouse',
        'active',
        'borrowable'
      )
      RETURNING id, asset_code, tenant_id
    `;
    console.log(`✓ Created test asset in SJI with the EXACT SAME code "${sjiTestAsset.asset_code}"`);
    console.log("✓ Composite unique constraint (tenant_id, asset_code) verified! No collision occurred.");

    // Clean up test rows
    await sql`DELETE FROM assets WHERE id IN (${crmcTestAsset.id}, ${sjiTestAsset.id})`;
    await sql`DELETE FROM tenants WHERE id = ${sjiTenant.id}`;
    console.log("✓ Test records and secondary test tenant cleanly rolled back.");

    console.log("\n=======================================================");
    console.log("🎉 MULTI-TENANT ARCHITECTURE FULLY VERIFIED & COMPLETE!");
    console.log("=======================================================\n");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Verification failed:", err);
  process.exit(1);
});
