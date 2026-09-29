# Database schema (Drizzle)

Barrel: `src/server/db/schema/index.ts`  
Migrations: `src/server/db/migrations/*.sql` (**48** files) + `meta/_journal.json`  
Client: `src/server/db/index.ts`

## Tables / modules (28)

| Schema file | Table export(s) |
|-------------|-----------------|
| `tenants.ts` | `tenants` |
| `profiles.ts` | `profiles` (+ `app_role`, `profile_status` enums) |
| `departments.ts` | `departments` |
| `categories.ts` | `categories` |
| `locations.ts` | `locations` (**exported; not queried elsewhere**) |
| `assets.ts` | `assets` |
| `asset-models.ts` | `assetModels` |
| `asset-lifecycle-events.ts` | `assetLifecycleEvents` |
| `borrow-requests.ts` | `borrowRequests` |
| `borrow-transactions.ts` | `borrowTransactions` |
| `consumables.ts` | `consumables` |
| `consumable-requests.ts` | `consumableRequests`, `consumableRequestLines`, `consumableRequestReleaseAllocations` |
| `stock-movements.ts` | `stockMovements` |
| `maintenance-logs.ts` | `maintenanceLogs` |
| `projects.ts` | `projects` |
| `project-expense-lines.ts` | `projectExpenseLines` |
| `project-asset-assignments.ts` | `projectAssetAssignments` |
| `project-progress-indicators.ts` | `projectProgressIndicators` |
| `suppliers.ts` | `suppliers` |
| `purchase-lots.ts` | `purchaseLots` |
| `purchase-order-departments.ts` | `purchaseOrderDepartments` |
| `vouchers.ts` | `vouchers` |
| `voucher-departments.ts` | `voucherDepartments` |
| `petty-cash.ts` | `pettyCashVouchers` |
| `petty-cash-departments.ts` | `pettyCashDepartments` |
| `audit-logs.ts` | `auditLogs` |
| `dashboard-snapshots.ts` | `dashboardMetricSnapshots` |

## Related note

Root `db.sql` is a large dump **separate** from `npm run db:migrate`.

See also: [[Data/Status-Enums]].
