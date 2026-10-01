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

  const truncateSql = `TRUNCATE TABLE ${TRUNCATE_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`;

  const collectErrorText = (error: unknown): string => {
    if (!error || typeof error !== "object") return String(error ?? "");
    const parts: string[] = [];
    const walk = (value: unknown, depth: number) => {
      if (!value || depth > 4) return;
      if (typeof value === "string") {
        parts.push(value);
        return;
      }
      if (typeof value !== "object") return;
      const rec = value as {
        message?: unknown;
        code?: unknown;
        cause?: unknown;
        errors?: unknown;
      };
      if (typeof rec.message === "string") parts.push(rec.message);
      if (typeof rec.code === "string" || typeof rec.code === "number") {
        parts.push(String(rec.code));
      }
      if (Array.isArray(rec.errors)) {
        for (const nested of rec.errors) walk(nested, depth + 1);
      }
      if (rec.cause) walk(rec.cause, depth + 1);
    };
    walk(error, 0);
    return parts.join(" ");
  };

  // Remote poolers can drop or time out mid-TRUNCATE (~21s). Retry and raise
  // statement_timeout inside a transaction so SET LOCAL applies on that connection.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL statement_timeout = '120s'`));
        await tx.execute(sql.raw(`SET LOCAL lock_timeout = '60s'`));
        await tx.execute(sql.raw(truncateSql));
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const message = collectErrorText(error);
      const retryable =
        /ETIMEDOUT|ECONNRESET|ECONNREFUSED|CONNECT_TIMEOUT|connection|timeout|canceling statement|deadlock|40P01|57014/i.test(
          message
        ) || message.trim().length === 0;
      if (!retryable || attempt === 5) throw error;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  if (lastError) throw lastError;

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
