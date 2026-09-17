import { eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { DEFAULT_TENANT_ID, getTenantContext } from "./tenant-context";

/**
 * Returns an `eq(column, tenantId)` condition when an active tenant is resolved.
 * If running in a cross-tenant context without an explicit tenant, returns undefined.
 */
export function scopeTenant(
  column: PgColumn,
  explicitTenantId?: string
): SQL | undefined {
  const activeTenantId = explicitTenantId ?? getTenantContext()?.tenantId;
  if (!activeTenantId) return undefined;
  return eq(column, activeTenantId);
}

/**
 * Injects `tenantId` into insert/upsert payloads if not already present.
 */
export function withTenant<T extends Record<string, unknown>>(
  data: T,
  explicitTenantId?: string
): T & { tenantId: string } {
  const tenantId =
    (data as { tenantId?: string }).tenantId ??
    explicitTenantId ??
    getTenantContext()?.tenantId ??
    DEFAULT_TENANT_ID;

  return {
    ...data,
    tenantId,
  };
}
