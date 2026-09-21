import type { QueryClient } from "@tanstack/react-query";

import { assetQueryKeys } from "@/features/assets/client/query-keys";
import { auditLogQueryKeys } from "@/features/audit-logs/client/query-keys";
import { borrowLogQueryKeys } from "@/features/borrow-log/client/query-keys";
import { borrowRequestQueryKeys } from "@/features/borrow-requests/client/query-keys";
import { categoryQueryKeys } from "@/features/categories/client/query-keys";
import { consumableRequestQueryKeys } from "@/features/consumable-requests/client/query-keys";
import { consumableQueryKeys } from "@/features/consumables/client/query-keys";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";
import { departmentQueryKeys } from "@/features/departments/client/query-keys";
import { maintenanceQueryKeys } from "@/features/maintenance-logs/client/query-keys";
import { projectQueryKeys } from "@/features/projects/client/query-keys";
import { purchaseLotQueryKeys } from "@/features/purchase-lots/client/query-keys";
import { stockMovementQueryKeys } from "@/features/stock-movements/client/query-keys";
import { supplierQueryKeys } from "@/features/suppliers/client/query-keys";
import { userQueryKeys } from "@/features/users/client/query-keys";

/**
 * Every cacheable domain in the app, keyed by its root query key.
 *
 * Server writes rarely stay inside one table — releasing a request also writes
 * assets, borrow logs and lifecycle events — so mutations declare the domains
 * their write touches instead of hand-listing query keys at each call site.
 */
export const CACHE_DOMAIN_KEYS = {
  assets: assetQueryKeys.all,
  auditLogs: auditLogQueryKeys.all,
  borrowLog: borrowLogQueryKeys.all,
  borrowRequests: borrowRequestQueryKeys.all,
  categories: categoryQueryKeys.all,
  consumableRequests: consumableRequestQueryKeys.all,
  consumables: consumableQueryKeys.all,
  dashboard: dashboardQueryKeys.all,
  departments: departmentQueryKeys.all,
  maintenance: maintenanceQueryKeys.all,
  projects: projectQueryKeys.all,
  purchaseLots: purchaseLotQueryKeys.all,
  stockMovements: stockMovementQueryKeys.all,
  suppliers: supplierQueryKeys.all,
  users: userQueryKeys.all,
} as const;

export type CacheDomain = keyof typeof CACHE_DOMAIN_KEYS;

/**
 * Marks every listed domain stale. Mounted queries refetch immediately, the
 * rest refetch the next time they mount, so listing extra domains is cheap.
 */
export function invalidateDomains(
  queryClient: QueryClient,
  domains: readonly CacheDomain[]
): Promise<void> {
  return Promise.all(
    [...new Set(domains)].map((domain) =>
      queryClient.invalidateQueries({ queryKey: CACHE_DOMAIN_KEYS[domain] })
    )
  ).then(() => undefined);
}

/**
 * Asset custody moved (release, return, scan, project assignment). The server
 * writes borrow transactions, asset rows, lifecycle events, and can close the
 * originating request or open a maintenance log.
 */
export const CUSTODY_DOMAINS = [
  "assets",
  "borrowLog",
  "borrowRequests",
  "projects",
  "maintenance",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

/**
 * Consumable stock moved (restock, issue, adjust, requisition release, project
 * materials). The server writes consumables, purchase lots and stock movements.
 */
export const STOCK_DOMAINS = [
  "consumables",
  "consumableRequests",
  "purchaseLots",
  "stockMovements",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];
