import { AssetRepository } from "@/server/modules/assets/asset.repository";
import { BorrowRequestRepository } from "@/server/modules/borrow-requests/borrow-request.repository";
import { BorrowLogRepository } from "@/server/modules/borrow-log/borrow-log.repository";
import { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import { ConsumableRequestRepository } from "@/server/modules/consumable-requests/consumable-request.repository";
import { DepartmentRepository } from "@/server/modules/departments/department.repository";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getDb } from "@/server/db";
import { assetLifecycleEvents, profiles } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { toBorrowLogDTO } from "@/server/modules/borrow-log/borrow-log.service";
import { serverCache } from "@/server/shared/cache";

export type DashboardSummaryDTO = {
  activeBorrows: number;
  activeAssignments: number;
  pendingApprovals: number;
  lowStockItems: number;
  overdueAssets: number;
  totalRequests?: number;
  totalAssignable?: number;
  totalBorrowable?: number;
};

export type DashboardPendingRequest = {
  id: string;
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
  computing: "Computing",
  furniture: "Furniture",
  av: "AV",
  transport: "Transport",
};

export class DashboardService {
  constructor(
    private readonly requests = new BorrowRequestRepository(),
    private readonly borrowLog = new BorrowLogRepository(),
    private readonly consumables = new ConsumableRepository(),
    private readonly consumableRequests = new ConsumableRequestRepository(),
    private readonly assets = new AssetRepository(),
    private readonly departments = new DepartmentRepository()
  ) {}

  private async resolveBorrowerDeptContext(userId: string): Promise<{
    departmentId: string | null;
    includeSandbox: boolean;
  }> {
    const db = getDb();
    const [profile] = await db
      .select({ departmentId: profiles.departmentId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const departmentId = profile?.departmentId ?? null;
    if (!departmentId) {
      return { departmentId: null, includeSandbox: false };
    }
    const dept = await this.departments.findById(departmentId);
    return {
      departmentId,
      includeSandbox: Boolean(dept?.isSandbox),
    };
  }

  private mergePendingRequests(
    borrowRows: Array<{
      id: string;
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
    limit: number
  ): DashboardPendingRequest[] {
    const fromBorrow: DashboardPendingRequest[] = borrowRows.map((r) => ({
      id: r.id,
      requesterName: r.requesterName,
      department: r.department,
      itemDescription: r.items[0]?.itemDescription || "Multiple items",
      requestedAt:
        r.requestedAt instanceof Date
          ? r.requestedAt.toISOString()
          : String(r.requestedAt),
      relativeTime: formatRelativeTime(r.requestedAt),
      kind: r.requestType === "assignable" ? "assign" : "borrow",
    }));
    const fromSupply: DashboardPendingRequest[] = supplyRows.map((r) => ({
      id: r.id,
      requesterName: r.requesterName,
      department: r.department,
      itemDescription: r.purpose || r.requestCode,
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
  async getSidebarSummary(userId?: string): Promise<DashboardSummaryDTO> {
    const cacheKey = userId ? `dashboard:sidebar:${userId}` : "dashboard:sidebar:all";
    return serverCache.wrap(
      cacheKey,
      30_000,
      async () => {
        if (userId) {
          const { departmentId, includeSandbox } =
            await this.resolveBorrowerDeptContext(userId);

          const [activeBorrows, pendingApprovals, overdueAssets] = await Promise.all([
            departmentId
              ? this.borrowLog
                  .countDepartmentHeld(departmentId, { includeSandbox })
                  .catch((err) => {
                    console.error(
                      "[dashboard] failed to count department held assets for borrower:",
                      err
                    );
                    return 0;
                  })
              : Promise.resolve(0),
            Promise.all([
              this.requests.countPending(undefined, userId).catch((err) => {
                console.error("[dashboard] failed to count pending requests for borrower:", err);
                return 0;
              }),
              this.consumableRequests.countPending(undefined, userId).catch((err) => {
                console.error("[dashboard] failed to count pending supply requests for borrower:", err);
                return 0;
              }),
            ]).then(([a, b]) => a + b),
            departmentId
              ? this.borrowLog
                  .countDepartmentHeld(departmentId, {
                    includeSandbox,
                    overdueOnly: true,
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
          return {
            activeBorrows,
            activeAssignments: 0,
            pendingApprovals,
            lowStockItems: 0,
            overdueAssets,
          };
        }

        const [
          activeBorrows,
          activeAssignments,
          pendingApprovals,
          lowStockItems,
          overdueAssets,
        ] = await Promise.all([
          this.borrowLog.countActive().catch((err) => {
            console.error("[dashboard] failed to count active borrows:", err);
            return 0;
          }),
          this.assets.countAssigned().catch((err) => {
            console.error("[dashboard] failed to count active assignments:", err);
            return 0;
          }),
          Promise.all([
            this.requests.countPending().catch((err) => {
              console.error("[dashboard] failed to count pending requests:", err);
              return 0;
            }),
            this.consumableRequests.countPending().catch((err) => {
              console.error("[dashboard] failed to count pending supply requests:", err);
              return 0;
            }),
          ]).then(([a, b]) => a + b),
          this.consumables.countLowStock().catch((err) => {
            console.error("[dashboard] failed to count low stock consumables:", err);
            return 0;
          }),
          this.borrowLog.countOverdue().catch((err) => {
            console.error("[dashboard] failed to count overdue assets:", err);
            return 0;
          }),
        ]);

        return {
          activeBorrows,
          activeAssignments,
          pendingApprovals,
          lowStockItems,
          overdueAssets,
        };
      },
      ["dashboard:sidebar"]
    );
  }

  async getBorrowerSnapshot(userId: string, limit = 5): Promise<DashboardSnapshotDTO> {
    const isRealUuid = Boolean(
      userId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          userId.trim()
        )
    );
    const targetUserId = isRealUuid ? userId.trim() : undefined;
    const { departmentId, includeSandbox } = targetUserId
      ? await this.resolveBorrowerDeptContext(targetUserId)
      : { departmentId: null, includeSandbox: false };

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
            .countDepartmentHeld(departmentId, { includeSandbox })
            .catch((err) => {
              console.error(
                "[dashboard] failed to count borrower department held assets:",
                err
              );
              return 0;
            })
        : Promise.resolve(0),
      Promise.all([
        this.requests.countPending(undefined, targetUserId).catch((err) => {
          console.error("[dashboard] failed to count borrower pending requests:", err);
          return 0;
        }),
        this.consumableRequests.countPending(undefined, targetUserId).catch((err) => {
          console.error("[dashboard] failed to count borrower pending supply requests:", err);
          return 0;
        }),
      ]).then(([a, b]) => a + b),
      departmentId
        ? this.borrowLog
            .countDepartmentHeld(departmentId, {
              includeSandbox,
              overdueOnly: true,
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
        this.requests.count(targetUserId ? { requesterUserId: targetUserId } : {}).catch((err) => {
          console.error("[dashboard] failed to count total borrow requests for requester:", err);
          return 0;
        }),
        this.consumableRequests.count(targetUserId ? { requesterUserId: targetUserId } : {}).catch((err) => {
          console.error("[dashboard] failed to count total supply requests for requester:", err);
          return 0;
        }),
      ]).then(([a, b]) => a + b),
      this.requests.list({ status: "pending", ...(targetUserId ? { requesterUserId: targetUserId } : {}), limit }).catch((err) => {
        console.error("[dashboard] failed to list borrower pending requests:", err);
        return [];
      }),
      this.consumableRequests.list({
        status: "pending",
        ...(targetUserId ? { requesterUserId: targetUserId } : {}),
        limit,
      }).catch((err) => {
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
              includeSandbox,
            })
            .catch((err) => {
              console.error(
                "[dashboard] failed to list borrower department overdue rows:",
                err
              );
              return [];
            })
        : Promise.resolve([]),
    ]);

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
      lowStockItems: [],
      categoryDistribution: [],
      recentActivity: [],
    };
  }

  async getSnapshot(limit = 5): Promise<DashboardSnapshotDTO> {
    const [
      activeBorrows,
      activeAssignments,
      pendingApprovals,
      lowStockItems,
      overdueAssets,
      totalAssignable,
      totalBorrowable,
      pendingRows,
      pendingSupplyRows,
      overdueRows,
      allConsumables,
      allAssets,
      recentLifecycle,
    ] = await Promise.all([
      this.borrowLog.countActive().catch((err) => {
        console.error("[dashboard] failed to count active borrows:", err);
        return 0;
      }),
      this.assets.countAssigned().catch((err) => {
        console.error("[dashboard] failed to count active assignments:", err);
        return 0;
      }),
      Promise.all([
        this.requests.countPending().catch((err) => {
          console.error("[dashboard] failed to count pending requests:", err);
          return 0;
        }),
        this.consumableRequests.countPending().catch((err) => {
          console.error("[dashboard] failed to count pending supply requests:", err);
          return 0;
        }),
      ]).then(([a, b]) => a + b),
      this.consumables.countLowStock().catch((err) => {
        console.error("[dashboard] failed to count low stock items:", err);
        return 0;
      }),
      this.borrowLog.countOverdue().catch((err) => {
        console.error("[dashboard] failed to count overdue assets:", err);
        return 0;
      }),
      this.assets.countByType("assignable").catch((err) => {
        console.error("[dashboard] failed to count total assignable assets:", err);
        return 0;
      }),
      this.assets.countByType("borrowable").catch((err) => {
        console.error("[dashboard] failed to count total borrowable assets:", err);
        return 0;
      }),
      this.requests.list({ status: "pending", limit }).catch((err) => {
        console.error("[dashboard] failed to list pending requests:", err);
        return [];
      }),
      this.consumableRequests.list({ status: "pending", limit }).catch((err) => {
        console.error("[dashboard] failed to list pending supply requests:", err);
        return [];
      }),
      this.borrowLog.list({ status: "overdue" }).catch((err) => {
        console.error("[dashboard] failed to list overdue logs:", err);
        return [];
      }),
      this.consumables.getLowStockItems(limit).catch((err) => {
        console.error("[dashboard] failed to get low stock items:", err);
        return [];
      }),
      this.assets.getCategoryDistribution().catch((err) => {
        console.error("[dashboard] failed to get category distribution:", err);
        return [];
      }),
      this.listRecentLifecycle(limit).catch((err) => {
        console.error("[dashboard] failed to list recent lifecycle:", err);
        return [];
      }),
    ]);

    const lowStock = allConsumables.map((c) => ({
      id: c.id,
      itemName: c.name,
      currentQty: c.currentQty,
      minThreshold: c.minThreshold,
      unit: c.unit,
    }));

    const categoryDistribution: DashboardCategoryCount[] = allAssets.map((c) => ({
      category: c.category,
      label: CATEGORY_LABELS[c.category] ?? c.category,
      count: c.count,
    }));

    return {
      summary: {
        activeBorrows,
        activeAssignments,
        pendingApprovals,
        lowStockItems,
        overdueAssets,
        totalAssignable,
        totalBorrowable,
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
  }

  private async listRecentLifecycle(
    limit: number
  ): Promise<DashboardActivityEntry[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(assetLifecycleEvents)
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
   * Cheaper than full snapshot: same lists, no category chart or activity.
   */
  async getNotifications(
    userId?: string,
    limit = 8
  ): Promise<DashboardNotificationItem[]> {
    const snapshot = userId
      ? await this.getBorrowerSnapshot(userId, limit)
      : await this.getSnapshot(limit);

    const items: DashboardNotificationItem[] = [];

    for (const row of snapshot.overdueAssets) {
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

    for (const row of snapshot.pendingRequests) {
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
          : "/borrow-requests?status=pending",
        type: "info",
        relativeTime: row.relativeTime,
        sortAt: row.requestedAt,
      });
    }

    for (const row of snapshot.lowStockItems) {
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
  }
}
