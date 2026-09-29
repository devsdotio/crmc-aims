import { AssetRepository } from "@/server/modules/assets/asset.repository";
import { BorrowRequestRepository } from "@/server/modules/borrow-requests/borrow-request.repository";
import { BorrowLogRepository } from "@/server/modules/borrow-log/borrow-log.repository";
import { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import { ConsumableRequestRepository } from "@/server/modules/consumable-requests/consumable-request.repository";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getDb } from "@/server/db";
import {
  assetLifecycleEvents,
  assets,
  borrowTransactions,
  consumableRequestLines,
  consumableRequests,
  consumables,
  dashboardMetricSnapshots,
  profiles,
  purchaseLots,
  type ConsumableRow,
} from "@/server/db/schema";
import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { getTenantContext } from "@/server/shared/tenant-context";
import { toBorrowLogDTO } from "@/server/modules/borrow-log/borrow-log.service";
import { serverCache } from "@/server/shared/cache";
import { formatPhp } from "@/components/projects/format-money";

export function invalidateDashboardCache(tenantId?: string): void {
  if (tenantId) {
    serverCache.invalidateTag(`tenant:${tenantId}:dashboard`);
  }
  serverCache.invalidateTag("dashboard");
}

export type StatDeltaDTO = {
  percentChange: number | null;
  direction: "up" | "down" | "flat";
  periodLabel: string;
  current?: number;
  previous?: number;
};

export type DashboardSummaryDTO = {
  activeBorrows: number;
  activeAssignments: number;
  pendingApprovals: number;
  pendingAssignRequests?: number;
  pendingBorrowRequests?: number;
  pendingSupplyRequests?: number;
  lowStockItems: number;
  overdueAssets: number;
  totalRequests?: number;
  totalAssignable?: number;
  totalBorrowable?: number;
  deltas?: {
    activeOps?: StatDeltaDTO;
    totalStock?: StatDeltaDTO;
    overdueAssets?: StatDeltaDTO;
    lowStock?: StatDeltaDTO;
  };
};

export type DashboardPendingRequest = {
  id: string;
  requestCode?: string;
  requesterName: string;
  department: string;
  itemDescription: string;
  requestedAt: string;
  relativeTime: string;
  kind: "borrow" | "assign" | "supply";
};

export type DashboardOverdueAsset = {
  id: string;
  assetName: string;
  assetCode: string;
  borrowerName: string;
  department: string;
  daysOverdue: number;
  dueSince: string;
};

export type DashboardLowStockItem = {
  id: string;
  itemName: string;
  currentQty: number;
  minThreshold: number;
  unit: string;
};

export type DashboardCategoryCount = {
  category: string;
  label: string;
  count: number;
  assetUnits?: number;
  consumableUnits?: number;
};

export type DashboardAssetRowDTO = {
  id: string;
  name: string;
  sku: string;
  category: string;
  type: "Assignable" | "Borrowable" | "Consumable";
  custodyHolder: string;
  department: string;
  custody: {
    holder: string;
    department: string;
    type: "borrowed" | "assigned" | "unassigned";
  };
  totalQty: number;
  stockIn: number;
  valuation: number;
  price: string;
  status: string;
  condition: string;
  statusType: "good" | "warning" | "danger" | "info";
  href: string;
  imageUrl?: string | null;
};

export type StockVolumePointDTO = {
  period: string;
  bucketStart: string;
  bucketEnd: string;
  stockVolume: number;
  consumeRate: number;
  bucket?: string;
  inflow?: number;
  outflow?: number;
};

export type StockVolumeResponseDTO = {
  timeframe: "weekly" | "monthly" | "yearly";
  category: string;
  points: StockVolumePointDTO[];
};

export type DashboardActivityEntry = {
  id: string;
  type: "return" | "request" | "borrow" | "restock" | "maintenance";
  description: string;
  relativeTime: string;
};

export type DashboardNotificationItem = {
  id: string;
  title: string;
  message: string;
  href: string;
  type: "urgent" | "warning" | "info";
  relativeTime: string;
  sortAt: string;
};

export type DashboardSnapshotDTO = {
  summary: DashboardSummaryDTO;
  pendingRequests: DashboardPendingRequest[];
  overdueAssets: DashboardOverdueAsset[];
  lowStockItems: DashboardLowStockItem[];
  categoryDistribution: DashboardCategoryCount[];
  recentActivity: DashboardActivityEntry[];
};

const CATEGORY_LABELS: Record<string, string> = {
  computing: "Computing & IT",
  furniture: "Furniture & Fixtures",
  av: "Audio / Visual (AV)",
  transport: "Vehicles & Transport",
  paper: "Paper & Stationery",
  ink_toner: "Ink & Toner Cartridges",
  cleaning: "Cleaning & Maintenance",
  office_supplies: "Office Supplies",
  medical: "Clinical & Medical",
};

export class DashboardService {
  constructor(
    private readonly requests = new BorrowRequestRepository(),
    private readonly borrowLog = new BorrowLogRepository(),
    private readonly consumables = new ConsumableRepository(),
    private readonly consumableRequests = new ConsumableRequestRepository(),
    private readonly assets = new AssetRepository()
  ) {}

  private async resolveBorrowerDeptContext(
    userId: string,
    actorTenantId?: string,
    knownDepartmentId?: string | null
  ): Promise<{
    departmentId: string | null;
  }> {
    if (knownDepartmentId !== undefined) {
      return { departmentId: knownDepartmentId };
    }

    const db = getDb();
    const resolvedTenantId = actorTenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(profiles.userId, userId)];
    if (resolvedTenantId) conditions.push(eq(profiles.tenantId, resolvedTenantId));

    const [profile] = await db
      .select({ departmentId: profiles.departmentId })
      .from(profiles)
      .where(and(...conditions))
      .limit(1);
    return { departmentId: profile?.departmentId ?? null };
  }

  private mergePendingRequests(
    borrowRows: Array<{
      id: string;
      requestCode?: string;
      requesterName: string;
      department: string;
      requestType?: "borrowable" | "assignable" | null;
      items: Array<{ itemDescription: string }>;
      requestedAt: Date | string;
    }>,
    supplyRows: Array<{
      id: string;
      requesterName: string;
      department: string;
      purpose: string;
      requestCode: string;
      requestedAt: Date | string;
    }>,
    limit: number,
    supplyLinesByRequestId?: Map<string, Array<{ itemName: string }>>
  ): DashboardPendingRequest[] {
    const describeItems = (names: string[], fallback: string) => {
      const first = names[0];
      if (!first) return fallback;
      return names.length > 1 ? `${first} (+${names.length - 1} more)` : first;
    };
    const fromBorrow: DashboardPendingRequest[] = borrowRows.map((r) => ({
      id: r.id,
      requestCode: r.requestCode,
      requesterName: r.requesterName,
      department: r.department,
      itemDescription: describeItems(
        r.items.map((item) => item.itemDescription),
        "Multiple items"
      ),
      requestedAt:
        r.requestedAt instanceof Date
          ? r.requestedAt.toISOString()
          : String(r.requestedAt),
      relativeTime: formatRelativeTime(r.requestedAt),
      kind: r.requestType === "assignable" ? "assign" : "borrow",
    }));
    const fromSupply: DashboardPendingRequest[] = supplyRows.map((r) => ({
      id: r.id,
      requestCode: r.requestCode,
      requesterName: r.requesterName,
      department: r.department,
      itemDescription: describeItems(
        (supplyLinesByRequestId?.get(r.id) ?? []).map((line) => line.itemName),
        r.purpose || r.requestCode
      ),
      requestedAt:
        r.requestedAt instanceof Date
          ? r.requestedAt.toISOString()
          : String(r.requestedAt),
      relativeTime: formatRelativeTime(r.requestedAt),
      kind: "supply",
    }));
    return [...fromBorrow, ...fromSupply]
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
      .slice(0, limit);
  }

  /**
   * Sidebar badges only — cheap COUNT queries, no full list payload.
   * Layout used to call getSnapshot() on every private page and exhaust the DB pool.
   */
  async getSidebarSummary(
    userId?: string,
    actorTenantId?: string,
    knownDepartmentId?: string | null
  ): Promise<DashboardSummaryDTO> {
    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = userId
      ? `tenant:${tenantId}:dashboard:sidebar:${userId}`
      : `tenant:${tenantId}:dashboard:sidebar:all`;
    return serverCache.wrap(
      cacheKey,
      30_000,
      async () => {
        if (userId) {
          const { departmentId } = await this.resolveBorrowerDeptContext(
            userId,
            tenantId,
            knownDepartmentId
          );

          const [
            activeBorrows,
            pendingAssignRequests,
            pendingBorrowRequests,
            pendingSupplyRequests,
            overdueAssets,
          ] = await Promise.all([
            departmentId
              ? this.borrowLog
                  .countDepartmentHeld(departmentId, { tenantId })
                  .catch((err) => {
                    console.error(
                      "[dashboard] failed to count department held assets for borrower:",
                      err
                    );
                    return 0;
                  })
              : Promise.resolve(0),
            this.requests
              .countPending(undefined, userId, tenantId, "assignable")
              .catch((err) => {
                console.error(
                  "[dashboard] failed to count pending assign requests for borrower:",
                  err
                );
                return 0;
              }),
            this.requests
              .countPending(undefined, userId, tenantId, "borrowable")
              .catch((err) => {
                console.error(
                  "[dashboard] failed to count pending borrow requests for borrower:",
                  err
                );
                return 0;
              }),
            this.consumableRequests
              .countPending(undefined, userId, tenantId)
              .catch((err) => {
                console.error(
                  "[dashboard] failed to count pending supply requests for borrower:",
                  err
                );
                return 0;
              }),
            departmentId
              ? this.borrowLog
                  .countDepartmentHeld(departmentId, {
                    overdueOnly: true,
                    tenantId,
                  })
                  .catch((err) => {
                    console.error(
                      "[dashboard] failed to count department overdue for borrower:",
                      err
                    );
                    return 0;
                  })
              : Promise.resolve(0),
          ]);
          const pendingApprovals =
            pendingAssignRequests +
            pendingBorrowRequests +
            pendingSupplyRequests;
          return {
            activeBorrows,
            activeAssignments: 0,
            pendingApprovals,
            pendingAssignRequests,
            pendingBorrowRequests,
            pendingSupplyRequests,
            lowStockItems: 0,
            overdueAssets,
          };
        }

        const [
          activeBorrows,
          activeAssignments,
          pendingAssignRequests,
          pendingBorrowRequests,
          pendingSupplyRequests,
          lowStockItems,
          overdueAssets,
        ] = await Promise.all([
          this.borrowLog.countActive(undefined, undefined, "borrow", tenantId).catch((err) => {
            console.error("[dashboard] failed to count active borrows:", err);
            return 0;
          }),
          this.assets.countAssigned(undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to count active assignments:", err);
            return 0;
          }),
          this.requests
            .countPending(undefined, undefined, tenantId, "assignable")
            .catch((err) => {
              console.error("[dashboard] failed to count pending assign requests:", err);
              return 0;
            }),
          this.requests
            .countPending(undefined, undefined, tenantId, "borrowable")
            .catch((err) => {
              console.error("[dashboard] failed to count pending borrow requests:", err);
              return 0;
            }),
          this.consumableRequests.countPending(undefined, undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to count pending supply requests:", err);
            return 0;
          }),
          this.consumables.countLowStock(undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to count low stock consumables:", err);
            return 0;
          }),
          this.borrowLog.countOverdue(undefined, undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to count overdue assets:", err);
            return 0;
          }),
        ]);

        const pendingApprovals =
          pendingAssignRequests + pendingBorrowRequests + pendingSupplyRequests;

        return {
          activeBorrows,
          activeAssignments,
          pendingApprovals,
          pendingAssignRequests,
          pendingBorrowRequests,
          pendingSupplyRequests,
          lowStockItems,
          overdueAssets,
        };
      },
      ["dashboard", "dashboard:sidebar", `tenant:${tenantId}:dashboard`]
    );
  }

  async getBorrowerSnapshot(
    userId: string,
    limit = 5,
    actorTenantId?: string,
    knownDepartmentId?: string | null
  ): Promise<DashboardSnapshotDTO> {
    const isRealUuid = Boolean(
      userId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          userId.trim()
        )
    );
    const targetUserId = isRealUuid ? userId.trim() : undefined;
    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = `tenant:${tenantId}:dashboard:snapshot:borrower:${targetUserId ?? "anon"}:${limit}`;

    return serverCache.wrap(
      cacheKey,
      5_000,
      async () => {
        const { departmentId } = targetUserId
          ? await this.resolveBorrowerDeptContext(
              targetUserId,
              tenantId,
              knownDepartmentId
            )
          : { departmentId: null };

        const [
          activeBorrows,
          pendingApprovals,
          overdueAssets,
          totalRequests,
          pendingRows,
          pendingSupplyRows,
          overdueRows,
        ] = await Promise.all([
          departmentId
            ? this.borrowLog
                .countDepartmentHeld(departmentId, { tenantId })
                .catch((err) => {
                  console.error(
                    "[dashboard] failed to count borrower department held assets:",
                    err
                  );
                  return 0;
                })
            : Promise.resolve(0),
          Promise.all([
            this.requests.countPending(undefined, targetUserId, tenantId).catch((err) => {
              console.error("[dashboard] failed to count borrower pending requests:", err);
              return 0;
            }),
            this.consumableRequests.countPending(undefined, targetUserId, tenantId).catch((err) => {
              console.error("[dashboard] failed to count borrower pending supply requests:", err);
              return 0;
            }),
          ]).then(([a, b]) => a + b),
          departmentId
            ? this.borrowLog
                .countDepartmentHeld(departmentId, {
                  overdueOnly: true,
                  tenantId,
                })
                .catch((err) => {
                  console.error(
                    "[dashboard] failed to count borrower department overdue:",
                    err
                  );
                  return 0;
                })
            : Promise.resolve(0),
          Promise.all([
            this.requests.count(targetUserId ? { requesterUserId: targetUserId } : {}, undefined, tenantId).catch((err) => {
              console.error("[dashboard] failed to count total borrow requests for requester:", err);
              return 0;
            }),
            this.consumableRequests.count(targetUserId ? { requesterUserId: targetUserId } : {}, undefined, tenantId).catch((err) => {
              console.error("[dashboard] failed to count total supply requests for requester:", err);
              return 0;
            }),
          ]).then(([a, b]) => a + b),
          this.requests.list({ status: "pending", ...(targetUserId ? { requesterUserId: targetUserId } : {}), limit }, undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to list borrower pending requests:", err);
            return [];
          }),
          this.consumableRequests.list({
            status: "pending",
            ...(targetUserId ? { requesterUserId: targetUserId } : {}),
            limit,
          }, undefined, tenantId).catch((err) => {
            console.error("[dashboard] failed to list borrower pending supply requests:", err);
            return [];
          }),
          departmentId
            ? this.borrowLog
                .list({
                  status: "overdue",
                  departmentId,
                  excludeProjects: true,
                  custodyKind: "all",
                }, undefined, tenantId)
                .catch((err) => {
                  console.error(
                    "[dashboard] failed to list borrower department overdue rows:",
                    err
                  );
                  return [];
                })
            : Promise.resolve([]),
        ]);

        const supplyLines = pendingSupplyRows.length
          ? await this.consumableRequests
              .listLinesByRequestIds(pendingSupplyRows.map((row) => row.id))
              .catch(() => [])
          : [];
        const supplyLinesByRequestId = new Map<string, Array<{ itemName: string }>>();
        for (const line of supplyLines) {
          const list = supplyLinesByRequestId.get(line.requestId) ?? [];
          list.push(line);
          supplyLinesByRequestId.set(line.requestId, list);
        }

        return {
          summary: {
            activeBorrows,
            activeAssignments: 0,
            pendingApprovals,
            lowStockItems: 0,
            overdueAssets,
            totalRequests,
          },
          pendingRequests: this.mergePendingRequests(
            pendingRows,
            pendingSupplyRows,
            limit,
            supplyLinesByRequestId
          ),
          overdueAssets: overdueRows.slice(0, limit).map((row) => {
            const dto = toBorrowLogDTO(row);
            return {
              id: dto.id,
              assetName: dto.assetName,
              assetCode: dto.assetCode,
              borrowerName: dto.borrowerName,
              department: dto.department,
              daysOverdue: dto.daysOverdue ?? 0,
              dueSince: `${dto.dueDate}T00:00:00Z`,
            };
          }),
          lowStockItems: [],
          categoryDistribution: [],
          recentActivity: [],
        };
      },
      ["dashboard", "dashboard:snapshot", `tenant:${tenantId}:dashboard`]
    );
  }

  async getSnapshot(limit = 5, actorTenantId?: string): Promise<DashboardSnapshotDTO> {
    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    return serverCache.wrap(
      `tenant:${tenantId}:dashboard:snapshot:${limit}`,
      30_000,
      async () => {
        const [
          activeBorrows,
          activeAssignments,
          pendingCounts,
          lowStockItems,
          overdueAssets,
          totalAssignable,
          totalBorrowable,
          pendingRows,
          pendingSupplyRows,
          overdueRows,
          lowStockConsumables,
          categoryDistribution,
          recentLifecycle,
        ] = await Promise.all([
          this.borrowLog.countActive(undefined, undefined, "borrow", tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count active borrows:", err);
            return 0;
          }),
          this.assets.countAssigned(undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count active assignments:", err);
            return 0;
          }),
          Promise.all([
            this.requests.countPending(undefined, undefined, tenantId, "assignable").catch((err: unknown) => {
              console.error("[dashboard] failed to count pending assign requests:", err);
              return 0;
            }),
            this.requests.countPending(undefined, undefined, tenantId, "borrowable").catch((err: unknown) => {
              console.error("[dashboard] failed to count pending borrow requests:", err);
              return 0;
            }),
            this.consumableRequests.countPending(undefined, undefined, tenantId).catch((err: unknown) => {
              console.error("[dashboard] failed to count pending supply requests:", err);
              return 0;
            }),
          ]).then(([assign, borrow, supply]) => ({
            pendingAssignRequests: assign,
            pendingBorrowRequests: borrow,
            pendingSupplyRequests: supply,
            pendingApprovals: assign + borrow + supply,
          })),
          this.consumables.countLowStock(undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count low stock items:", err);
            return 0;
          }),
          this.borrowLog.countOverdue(undefined, undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count overdue assets:", err);
            return 0;
          }),
          this.assets.countByType("assignable", undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count total assignable assets:", err);
            return 0;
          }),
          this.assets.countByType("borrowable", undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to count total borrowable assets:", err);
            return 0;
          }),
          this.requests.list({ status: "pending", limit }, undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to list pending requests:", err);
            return [];
          }),
          this.consumableRequests.list({ status: "pending", limit }, undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to list pending supply requests:", err);
            return [];
          }),
          this.borrowLog.list({ status: "overdue" }, undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to list overdue assets:", err);
            return [];
          }),
          this.consumables.getLowStockItems(limit, undefined, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to get low stock items:", err);
            return [];
          }),
          this.getCombinedCategoryDistribution(limit, "all", tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to get category distribution:", err);
            return [];
          }),
          this.listRecentLifecycle(limit, tenantId).catch((err: unknown) => {
            console.error("[dashboard] failed to list recent lifecycle:", err);
            return [];
          }),
        ]);

        const {
          pendingAssignRequests,
          pendingBorrowRequests,
          pendingSupplyRequests,
          pendingApprovals,
        } = pendingCounts;

        const lowStock: DashboardLowStockItem[] = lowStockConsumables.map((c) => ({
          id: c.id,
          itemName: c.name,
          currentQty: c.currentQty,
          minThreshold: c.minThreshold,
          unit: c.unit,
        }));

        const deltas = await this.getStatDeltas({
          activeOps: activeBorrows + activeAssignments,
          totalStock: totalAssignable + totalBorrowable,
          overdueAssets,
          lowStock: lowStockItems,
        }, 30, tenantId).catch(() => undefined);

        return {
          summary: {
            activeBorrows,
            activeAssignments,
            pendingApprovals,
            pendingAssignRequests,
            pendingBorrowRequests,
            pendingSupplyRequests,
            lowStockItems,
            overdueAssets,
            totalAssignable,
            totalBorrowable,
            deltas,
          },
          pendingRequests: this.mergePendingRequests(
            pendingRows,
            pendingSupplyRows,
            limit
          ),
          overdueAssets: overdueRows.slice(0, limit).map((row) => {
            const dto = toBorrowLogDTO(row);
            return {
              id: dto.id,
              assetName: dto.assetName,
              assetCode: dto.assetCode,
              borrowerName: dto.borrowerName,
              department: dto.department,
              daysOverdue: dto.daysOverdue ?? 0,
              dueSince: `${dto.dueDate}T00:00:00Z`,
            };
          }),
          lowStockItems: lowStock,
          categoryDistribution,
          recentActivity: recentLifecycle,
        };
      },
      ["dashboard", "snapshot", `tenant:${tenantId}:dashboard`]
    );
  }

  private async listRecentLifecycle(
    limit: number,
    actorTenantId?: string
  ): Promise<DashboardActivityEntry[]> {
    const db = getDb();
    const resolvedTenantId = actorTenantId ?? getTenantContext()?.tenantId;
    const conditions = [];
    if (resolvedTenantId) conditions.push(eq(assetLifecycleEvents.tenantId, resolvedTenantId));

    const rows = await db
      .select()
      .from(assetLifecycleEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(assetLifecycleEvents.createdAt))
      .limit(limit);

    return rows.map((row) => {
      let type: DashboardActivityEntry["type"] = "borrow";
      let description = `${row.actorDisplayName} · ${row.eventType} on ${row.assetCode}`;

      switch (row.eventType) {
        case "returned":
          type = "return";
          description = `${row.actorDisplayName} returned ${row.assetCode}`;
          break;
        case "released":
          type = "borrow";
          description = `${row.assetCode} released by ${row.actorDisplayName}${
            row.toHolder ? ` → ${row.toHolder}` : ""
          }`;
          break;
        case "flagged_maintenance":
          type = "maintenance";
          description = `${row.assetCode} flagged for maintenance by ${row.actorDisplayName}`;
          break;
        default:
          type = "borrow";
      }

      return {
        id: row.id,
        type,
        description,
        relativeTime: formatRelativeTime(row.createdAt),
      };
    });
  }

  /**
   * Header bell feed — compact overdue / pending / low-stock alerts.
   * Cheaper than full snapshot: same lists, no category chart, activity, or deltas.
   */
  async getNotifications(
    userId?: string,
    limit = 8,
    actorTenantId?: string,
    knownDepartmentId?: string | null
  ): Promise<DashboardNotificationItem[]> {
    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = userId
      ? `tenant:${tenantId}:dashboard:notifications:${userId}:${limit}`
      : `tenant:${tenantId}:dashboard:notifications:all:${limit}`;

    return serverCache.wrap(
      cacheKey,
      30_000,
      async () => {
        const departmentId = userId
          ? (
              await this.resolveBorrowerDeptContext(
                userId,
                tenantId,
                knownDepartmentId
              )
            ).departmentId
          : undefined;

        const [pendingRows, pendingSupplyRows, overdueRows, lowStockConsumables] =
          await Promise.all([
            this.requests
              .list(
                {
                  status: "pending",
                  ...(userId ? { requesterUserId: userId } : {}),
                  limit,
                },
                undefined,
                tenantId
              )
              .catch((err: unknown) => {
                console.error("[dashboard] failed to list pending requests:", err);
                return [];
              }),
            this.consumableRequests
              .list(
                {
                  status: "pending",
                  ...(userId ? { requesterUserId: userId } : {}),
                  limit,
                },
                undefined,
                tenantId
              )
              .catch((err: unknown) => {
                console.error(
                  "[dashboard] failed to list pending supply requests:",
                  err
                );
                return [];
              }),
            (userId
              ? departmentId
                ? this.borrowLog.list(
                    {
                      status: "overdue",
                      departmentId,
                      excludeProjects: true,
                      custodyKind: "all",
                    },
                    undefined,
                    tenantId
                  )
                : Promise.resolve([])
              : this.borrowLog.list({ status: "overdue" }, undefined, tenantId)
            ).catch((err: unknown) => {
              console.error("[dashboard] failed to list overdue assets:", err);
              return [];
            }),
            userId
              ? Promise.resolve([] as ConsumableRow[])
              : this.consumables.getLowStockItems(limit, undefined, tenantId).catch(
                  (err: unknown) => {
                    console.error(
                      "[dashboard] failed to get low stock items:",
                      err
                    );
                    return [];
                  }
                ),
          ]);

        const supplyLines = pendingSupplyRows.length
          ? await this.consumableRequests
              .listLinesByRequestIds(pendingSupplyRows.map((row) => row.id))
              .catch(() => [])
          : [];
        const supplyLinesByRequestId = new Map<string, Array<{ itemName: string }>>();
        for (const line of supplyLines) {
          const list = supplyLinesByRequestId.get(line.requestId) ?? [];
          list.push(line);
          supplyLinesByRequestId.set(line.requestId, list);
        }

        const pendingRequests = this.mergePendingRequests(
          pendingRows,
          pendingSupplyRows,
          limit,
          supplyLinesByRequestId
        );
        const overdueAssets = overdueRows.slice(0, limit).map((row) => {
          const dto = toBorrowLogDTO(row);
          return {
            id: dto.id,
            assetName: dto.assetName,
            assetCode: dto.assetCode,
            borrowerName: dto.borrowerName,
            department: dto.department,
            daysOverdue: dto.daysOverdue ?? 0,
            dueSince: `${dto.dueDate}T00:00:00Z`,
          };
        });
        const lowStockItems: DashboardLowStockItem[] = lowStockConsumables.map(
          (c) => ({
            id: c.id,
            itemName: c.name,
            currentQty: c.currentQty,
            minThreshold: c.minThreshold,
            unit: c.unit,
          })
        );

        const items: DashboardNotificationItem[] = [];

        for (const row of overdueAssets) {
          items.push({
            id: `overdue-${row.id}`,
            title: "Overdue return",
            message: `${row.assetName} (${row.assetCode}) is ${row.daysOverdue} day${
              row.daysOverdue === 1 ? "" : "s"
            } overdue — ${row.borrowerName}, ${row.department}.`,
            href: userId ? "/borrower-db/inventory" : "/borrow-log?status=overdue",
            type: "urgent",
            relativeTime: `${row.daysOverdue}d overdue`,
            sortAt: row.dueSince,
          });
        }

        for (const row of pendingRequests) {
          const kindLabel =
            row.kind === "supply"
              ? "Supply request"
              : row.kind === "assign"
                ? "Assignment request"
                : "Borrow request";
          items.push({
            id: `pending-${row.kind}-${row.id}`,
            title: kindLabel,
            message: `${row.requesterName} (${row.department}) — ${row.itemDescription}`,
            href: userId
              ? "/borrower-db/requests"
              : `/borrow-requests/${
                  row.kind === "supply"
                    ? "supplies"
                    : row.kind === "assign"
                      ? "assign"
                      : "borrow"
                }?status=pending&requestId=${row.id}`,
            type: "info",
            relativeTime: row.relativeTime,
            sortAt: row.requestedAt,
          });
        }

        for (const row of lowStockItems) {
          items.push({
            id: `lowstock-${row.id}`,
            title: "Low stock",
            message: `${row.itemName} is at ${row.currentQty} ${row.unit} (min ${row.minThreshold}).`,
            href: "/consumables",
            type: "warning",
            relativeTime: "stock alert",
            sortAt: new Date().toISOString(),
          });
        }

        return items
          .sort((a, b) => Date.parse(b.sortAt) - Date.parse(a.sortAt))
          .slice(0, limit);
      },
      ["dashboard", "dashboard:notifications", `tenant:${tenantId}:dashboard`]
    );
  }

  /**
   * Records today's metric values in the daily snapshot table.
   */
  async recordDailySnapshot(metrics: {
    activeOps: number;
    totalStock: number;
    overdueAssets: number;
    lowStock: number;
  }, actorTenantId?: string): Promise<void> {
    try {
      const db = getDb();
      const resolvedTenantId = actorTenantId ?? getTenantContext()?.tenantId;
      if (!resolvedTenantId) return; // Skip daily snapshot if no tenant context
      
      const today = new Date().toISOString().slice(0, 10);
      const rows = [
        { tenantId: resolvedTenantId, metricKey: "active_ops", value: String(metrics.activeOps), snapshotDate: today },
        { tenantId: resolvedTenantId, metricKey: "total_stock", value: String(metrics.totalStock), snapshotDate: today },
        { tenantId: resolvedTenantId, metricKey: "overdue_assets", value: String(metrics.overdueAssets), snapshotDate: today },
        { tenantId: resolvedTenantId, metricKey: "low_stock", value: String(metrics.lowStock), snapshotDate: today },
      ];

      for (const row of rows) {
        await db
          .insert(dashboardMetricSnapshots)
          .values(row)
          .onConflictDoUpdate({
            target: [
              dashboardMetricSnapshots.metricKey,
              dashboardMetricSnapshots.snapshotDate,
            ],
            set: { value: row.value },
          });
      }
    } catch (err) {
      console.error("[dashboard] failed to record daily snapshot:", err);
    }
  }

  /**
   * Computes period-over-period percentage changes and trend directions.
   * Bootstrapping logic:
   *   - Prefers the snapshot at exactly `lookbackDays` ago.
   *   - Falls back to the oldest available snapshot if none exists that far back.
   *   - Returns percentChange: null (so UI renders descriptive text instead of 0%) when
   *     no historical snapshots exist at all.
   */
  async getStatDeltas(
    current: {
      activeOps: number;
      totalStock: number;
      overdueAssets: number;
      lowStock: number;
    },
    lookbackDays = 30,
    actorTenantId?: string
  ): Promise<{
    activeOps?: StatDeltaDTO;
    totalStock?: StatDeltaDTO;
    overdueAssets?: StatDeltaDTO;
    lowStock?: StatDeltaDTO;
  }> {
    try {
      const db = getDb();
      const resolvedTenantId = actorTenantId ?? getTenantContext()?.tenantId;
      const today = new Date().toISOString().slice(0, 10);
      const targetDate = new Date(Date.now() - lookbackDays * 86400000)
        .toISOString()
        .slice(0, 10);

      const lookbackConditions = [
        lte(dashboardMetricSnapshots.snapshotDate, targetDate),
        sql`${dashboardMetricSnapshots.snapshotDate} < ${today}`
      ];
      if (resolvedTenantId) lookbackConditions.push(eq(dashboardMetricSnapshots.tenantId, resolvedTenantId));

      // 1. Fetch the newest snapshot at or before the lookback target date
      const lookbackSnapshots = await db
        .select()
        .from(dashboardMetricSnapshots)
        .where(and(...lookbackConditions))
        .orderBy(desc(dashboardMetricSnapshots.snapshotDate));

      // 2. If nothing found at lookback date, fall back to oldest snapshot available
      const fallbackConditions = [sql`${dashboardMetricSnapshots.snapshotDate} < ${today}`];
      if (resolvedTenantId) fallbackConditions.push(eq(dashboardMetricSnapshots.tenantId, resolvedTenantId));
      
      const fallbackSnapshots =
        lookbackSnapshots.length === 0
          ? await db
              .select()
              .from(dashboardMetricSnapshots)
              .where(and(...fallbackConditions))
              .orderBy(asc(dashboardMetricSnapshots.snapshotDate))
          : [];

      const allCandidates = lookbackSnapshots.length > 0 ? lookbackSnapshots : fallbackSnapshots;

      // No snapshots at all — too early in deployment
      if (allCandidates.length === 0) {
        return {};
      }

      // Build a map keyed by metricKey — take the first occurrence (closest to target date)
      const snapshotMap = new Map<string, { value: number; date: string }>();
      for (const s of allCandidates) {
        if (!snapshotMap.has(s.metricKey)) {
          snapshotMap.set(s.metricKey, {
            value: Number(s.value),
            date: s.snapshotDate,
          });
        }
      }

      const computeDelta = (key: string, currentVal: number): StatDeltaDTO => {
        const past = snapshotMap.get(key);
        if (!past) {
          // This metric was never snapshotted
          return {
            percentChange: null,
            direction: "flat",
            periodLabel: "",
            current: currentVal,
            previous: 0,
          };
        }
        if (past.value <= 0) {
          // Division by zero guard — we have a snapshot but it's zero
          return {
            percentChange: null,
            direction: currentVal > 0 ? "up" : "flat",
            periodLabel: `since ${past.date}`,
            current: currentVal,
            previous: 0,
          };
        }

        const pct = Math.round(((currentVal - past.value) / past.value) * 100);
        return {
          percentChange: Math.abs(pct),
          direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
          periodLabel: `since ${past.date}`,
          current: currentVal,
          previous: past.value,
        };
      };

      return {
        activeOps: computeDelta("active_ops", current.activeOps),
        totalStock: computeDelta("total_stock", current.totalStock),
        overdueAssets: computeDelta("overdue_assets", current.overdueAssets),
        lowStock: computeDelta("low_stock", current.lowStock),
      };
    } catch (err) {
      console.error("[dashboard] failed to get stat deltas:", err);
      return {};
    }
  }

  /**
   * Retrieves combined category distribution for top ranked bar cards.
   */
  async getCombinedCategoryDistribution(
    limit = 10,
    source: "all" | "assets" | "consumables" = "all",
    actorTenantId?: string
  ): Promise<DashboardCategoryCount[]> {
    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = `tenant:${tenantId}:dashboard:top-categories:${source}:${limit}`;
    return serverCache.wrap(
      cacheKey,
      60_000,
      async () => {
        const [assetCats, consumableCats] = await Promise.all([
          source === "consumables"
            ? Promise.resolve([])
            : this.assets.getCategoryDistribution(undefined, tenantId).catch(() => []),
          source === "assets"
            ? Promise.resolve([])
            : this.consumables.getCategoryDistribution(undefined, tenantId).catch(() => []),
        ]);

        const categoryMap = new Map<string, { assetUnits: number; consumableUnits: number }>();

        for (const a of assetCats) {
          const cat = (a.category || "uncategorized").toLowerCase();
          const existing = categoryMap.get(cat) || { assetUnits: 0, consumableUnits: 0 };
          existing.assetUnits += a.count;
          categoryMap.set(cat, existing);
        }

        for (const c of consumableCats) {
          const cat = (c.category || "uncategorized").toLowerCase();
          const existing = categoryMap.get(cat) || { assetUnits: 0, consumableUnits: 0 };
          existing.consumableUnits += c.count;
          categoryMap.set(cat, existing);
        }

        return Array.from(categoryMap.entries())
          .map(([cat, stats]) => {
            const total = stats.assetUnits + stats.consumableUnits;
            const rawLabel = CATEGORY_LABELS[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1));
            return {
              category: cat,
              label: rawLabel,
              count: total,
              assetUnits: stats.assetUnits,
              consumableUnits: stats.consumableUnits,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
      ["dashboard", "dashboard:top-categories", `tenant:${tenantId}:dashboard`]
    );
  }

  /**
   * Retrieves live asset rows with joined custody, valuation, and statuses for the fleet table card.
   */
  async getDashboardAssetRows(params?: {
    limit?: number;
    search?: string;
    tag?: string;
    tenantId?: string;
  }, actorTenantId?: string): Promise<DashboardAssetRowDTO[]> {
    const limit = params?.limit ?? 5;
    const search = params?.search?.trim() ?? "";
    const tag = params?.tag ?? "all";
    const tenantId = params?.tenantId ?? actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = `tenant:${tenantId}:dashboard:assets:${limit}:${tag}:${search}`;

    return serverCache.wrap(
      cacheKey,
      30_000,
      async () => {
        const db = getDb();
        const resolvedTenantId = params?.tenantId ?? actorTenantId ?? getTenantContext()?.tenantId;
        const conditions = [];
        if (resolvedTenantId) {
          conditions.push(eq(assets.tenantId, resolvedTenantId));
        }

        if (params?.tag === "assignable") {
          conditions.push(eq(assets.assignmentType, "assignable"));
        } else if (params?.tag === "borrowable") {
          conditions.push(eq(assets.assignmentType, "borrowable"));
        } else if (params?.tag === "custody") {
          conditions.push(sql`${assets.currentHolder} IS NOT NULL`);
        } else if (params?.tag === "low-stock" || params?.tag === "maintenance") {
          conditions.push(or(eq(assets.status, "needs_repair"), eq(assets.status, "out_of_service"))!);
        }

        if (params?.search?.trim()) {
          const q = `%${params.search.trim()}%`;
          conditions.push(
            or(
              ilike(assets.name, q),
              ilike(assets.assetCode, q),
              ilike(assets.currentHolder, q),
              ilike(assets.department, q)
            )!
          );
        }

        const rows = await db
          .select({
            id: assets.id,
            name: assets.name,
            assetCode: assets.assetCode,
            category: assets.category,
            assignmentType: assets.assignmentType,
            status: assets.status,
            currentHolder: assets.currentHolder,
            department: assets.department,
            location: assets.location,
            value: assets.value,
            imageUrl: assets.imageUrl,
            updatedAt: assets.updatedAt,
          })
          .from(assets)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(assets.updatedAt))
          .limit(limit);

        // Fetch active borrow transactions for these assets
        const activeBorrowConditions = [
          eq(borrowTransactions.status, "active"),
          isNull(borrowTransactions.returnedAt),
        ];
        if (resolvedTenantId) {
          activeBorrowConditions.push(eq(borrowTransactions.tenantId, resolvedTenantId));
        }

        const activeBorrows = await db
          .select({
            assetId: borrowTransactions.assetId,
            borrowerName: borrowTransactions.borrowerName,
            department: borrowTransactions.department,
            releasedAt: borrowTransactions.releasedAt,
          })
          .from(borrowTransactions)
          .where(and(...activeBorrowConditions));

        const activeBorrowMap = new Map<string, (typeof activeBorrows)[0]>();
        for (const b of activeBorrows) {
          if (b.assetId) activeBorrowMap.set(b.assetId, b);
        }

        return rows.map((a) => {
          const activeBorrow = activeBorrowMap.get(a.id);

          // Custody precedence: borrow > assigned > unassigned
          const isBorrowed = Boolean(activeBorrow);
          const isAssigned = Boolean(a.currentHolder && !activeBorrow);

          const custodyHolder = isBorrowed
            ? (activeBorrow!.borrowerName ?? "Unknown Borrower")
            : isAssigned
            ? a.currentHolder!
            : "Depot Storage";
          const custodyDepartment = isBorrowed
            ? (activeBorrow!.department ?? "")
            : a.department || a.location || "Central Storage";
          const custodyType: "borrowed" | "assigned" | "unassigned" = isBorrowed
            ? "borrowed"
            : isAssigned
            ? "assigned"
            : "unassigned";

          const isUnderRepair = a.status === "needs_repair";
          const isOutOfService = a.status === "out_of_service";

          let statusLabel = "Available";
          let statusType: "good" | "warning" | "danger" | "info" = "good";

          if (isUnderRepair) {
            statusLabel = "Maintenance";
            statusType = "warning";
          } else if (isOutOfService || a.status === "missing" || a.status === "retired") {
            statusLabel =
              a.status === "missing" ? "Missing" : a.status === "retired" ? "Retired" : "Out of Service";
            statusType = "danger";
          } else if (isBorrowed || isAssigned) {
            statusLabel = "In Custody";
            statusType = "info";
          }

          const valuation = Number(a.value ?? 0);

          return {
            id: a.id,
            name: a.name,
            sku: a.assetCode,
            category: a.category ?? "equipment",
            type: a.assignmentType === "assignable" ? "Assignable" : "Borrowable",
            custodyHolder,
            department: custodyDepartment,
            custody: {
              holder: custodyHolder,
              department: custodyDepartment,
              type: custodyType,
            },
            totalQty: 1,
            stockIn: isBorrowed ? 0 : 1,
            valuation,
            price: a.value ? formatPhp(a.value) : "₱0.00",
            status: statusLabel,
            condition: statusLabel,
            statusType,
            href: "/assets",
            imageUrl: a.imageUrl,
          };
        });
      },
      ["dashboard", "dashboard:assets", `tenant:${tenantId}:dashboard`]
    );
  }

  /**
   * Computes bucketed time-series inflow (stock volume) vs outflow (consume rate).
   */
  async getStockVolumeVsConsumeRate(
    paramsOrTimeframe:
      | { timeframe?: "weekly" | "monthly" | "yearly"; category?: string }
      | ("weekly" | "monthly" | "yearly") = "monthly",
    categoryArg = "all",
    actorTenantId?: string
  ): Promise<StockVolumeResponseDTO> {
    const timeframe =
      typeof paramsOrTimeframe === "object"
        ? (paramsOrTimeframe.timeframe ?? "monthly")
        : paramsOrTimeframe;
    const category =
      typeof paramsOrTimeframe === "object"
        ? (paramsOrTimeframe.category ?? "all")
        : categoryArg;

    const tenantId = actorTenantId ?? getTenantContext()?.tenantId ?? "global";
    const cacheKey = `tenant:${tenantId}:dashboard:stock-volume:${timeframe}:${category}`;
    return serverCache.wrap(
      cacheKey,
      60_000,
      async () => {
        const db = getDb();
        const resolvedTenantId = actorTenantId ?? getTenantContext()?.tenantId;
        const now = new Date();

        // 1. Generate empty-filled buckets
        type Bucket = { period: string; bucketStart: Date; bucketEnd: Date };
        const buckets: Bucket[] = [];

        if (timeframe === "weekly") {
          for (let i = 3; i >= 0; i--) {
            const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
            const end = new Date(now.getTime() - i * 7 * 86400000);
            buckets.push({
              period: `W${4 - i}`,
              bucketStart: start,
              bucketEnd: end,
            });
          }
        } else if (timeframe === "yearly") {
          const curYear = now.getFullYear();
          for (let y = curYear - 3; y <= curYear; y++) {
            buckets.push({
              period: String(y),
              bucketStart: new Date(y, 0, 1),
              bucketEnd: new Date(y, 11, 31, 23, 59, 59),
            });
          }
        } else {
          // Monthly: last 6 months
          const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            buckets.push({
              period: MONTH_NAMES[d.getMonth()],
              bucketStart: d,
              bucketEnd: nextD,
            });
          }
        }

        const rangeStart = buckets[0].bucketStart;
        const rangeEnd = buckets[buckets.length - 1].bucketEnd;
        const filterByCategory = category && category !== "all";

        const inflowConditions = [
          eq(purchaseLots.itemType, "consumable"),
          gte(purchaseLots.createdAt, rangeStart),
          lte(purchaseLots.createdAt, rangeEnd),
        ];
        if (resolvedTenantId) {
          inflowConditions.push(eq(purchaseLots.tenantId, resolvedTenantId));
        }
        if (filterByCategory) {
          inflowConditions.push(sql`LOWER(${consumables.category}) = LOWER(${category})`);
        }

        // 2. Inflow — consumable purchase_lots restocked quantity
        const inflowRows = await db
          .select({
            quantity: purchaseLots.quantity,
            createdAt: purchaseLots.createdAt,
            category: consumables.category,
          })
          .from(purchaseLots)
          .innerJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
          .where(and(...inflowConditions));

        const outflowConditions = [
          eq(consumableRequests.status, "released"),
          gte(consumableRequests.releasedAt, rangeStart),
          lte(consumableRequests.releasedAt, rangeEnd),
        ];
        if (resolvedTenantId) {
          outflowConditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
        }
        if (filterByCategory) {
          outflowConditions.push(sql`LOWER(${consumableRequestLines.category}) = LOWER(${category})`);
        }

        // 3. Outflow — released consumable request lines only
        const consumableOutflow = await db
          .select({
            quantity: consumableRequestLines.quantityRequested,
            releasedAt: consumableRequests.releasedAt,
            category: consumableRequestLines.category,
          })
          .from(consumableRequestLines)
          .innerJoin(
            consumableRequests,
            eq(consumableRequestLines.requestId, consumableRequests.id)
          )
          .where(and(...outflowConditions));

        // 4. Zero-fill bucket aggregation
        const points: StockVolumePointDTO[] = buckets.map((b) => {
          let stockVolume = 0;
          let consumeRate = 0;

          for (const row of inflowRows) {
            const d = row.createdAt;
            if (d >= b.bucketStart && d <= b.bucketEnd) {
              stockVolume += row.quantity;
            }
          }

          for (const row of consumableOutflow) {
            const d = row.releasedAt;
            if (d && d >= b.bucketStart && d <= b.bucketEnd) {
              consumeRate += row.quantity;
            }
          }

          return {
            period: b.period,
            bucket: b.period,
            bucketStart: b.bucketStart.toISOString(),
            bucketEnd: b.bucketEnd.toISOString(),
            stockVolume,
            consumeRate,
            inflow: stockVolume,
            outflow: consumeRate,
          };
        });

        return {
          timeframe,
          category,
          points,
        };
      },
      ["dashboard", "dashboard:stock-volume", `tenant:${tenantId}:dashboard`]
    );
  }
}
