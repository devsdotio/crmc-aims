import { sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
  setTenantContext,
} from "@/server/shared/tenant-context";
import { hasTestDatabase } from "./env";

/**
 * Business tables wiped between integration tests (FK-safe via CASCADE).
 * Physical table name is `requests` (Drizzle export: borrowRequests).
 */
const TRUNCATE_TABLES = [
  "asset_lifecycle_events",
  "project_asset_assignments",
  "project_expense_lines",
  "project_progress_indicators",
  "borrow_transactions",
  "requests",
  "consumable_request_release_allocations",
  "consumable_request_lines",
  "consumable_requests",
  "stock_movements",
  "maintenance_logs",
  "purchase_order_departments",
  "purchase_lots",
  "voucher_departments",
  "vouchers",
  "petty_cash_departments",
  "petty_cash_vouchers",
  "assets",
  "asset_models",
  "consumables",
  "audit_logs",
  "dashboard_metric_snapshots",
  "categories",
  "departments",
  "locations",
  "suppliers",
  "projects",
  "profiles",
] as const;

export { hasTestDatabase };

export function requireTestDatabase(): void {
  if (!hasTestDatabase) {
    throw new Error(
      "DATABASE_URL_TEST is required for integration tests. See tests/README.md."
    );
  }
}

/** Bind ALS/process tenant context used by repositories that fall back to getTenantContext(). */
export function bindTestTenant(tenantId = DEFAULT_TENANT_ID): void {
  setTenantContext({
    tenantId,
    tenantSlug: DEFAULT_TENANT_SLUG,
    tenantName: DEFAULT_TENANT_NAME,
  });
}

/**
 * Wipe mutable tables and ensure the default CRMC tenant row exists.
 * Call from `beforeEach` in integration suites.
 */
export async function resetTestDatabase(): Promise<void> {
  requireTestDatabase();
  const db = getDb();

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${TRUNCATE_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`
    )
  );

  await db.execute(sql`
    INSERT INTO tenants (id, slug, name)
    VALUES (
      ${DEFAULT_TENANT_ID}::uuid,
      ${DEFAULT_TENANT_SLUG},
      ${DEFAULT_TENANT_NAME}
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      updated_at = now()
  `);

  bindTestTenant(DEFAULT_TENANT_ID);
}
