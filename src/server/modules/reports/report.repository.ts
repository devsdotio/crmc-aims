import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { toQty } from "@/lib/qty";
import { getDb } from "@/server/db";
import {
  assets,
  assetStatusEnum,
  borrowRequests,
  borrowRequestStatusEnum,
  borrowTransactions,
  consumableRequestLines,
  consumableRequestReleaseAllocations,
  consumableRequests,
  consumableRequestStatusEnum,
  consumables,
  departments,
  maintenanceLogs,
  projectAssetAssignments,
  projectExpenseLines,
  projects,
  projectStatusEnum,
  purchaseLots,
  purchaseLotItemTypeEnum,
  stockMovements,
  suppliers,
} from "@/server/db/schema";
import { effectiveRepairAmount } from "@/lib/repair-cost";
import {
  deriveConsumableRequestKind,
  normalizeConsumableClassification,
  resolvePurchaseLotClassification,
} from "@/lib/consumable-classification";
import { parseNotesMetadata } from "@/server/modules/purchase-lots/purchase-lot.service";
import { getTenantContext } from "@/server/shared/tenant-context";
import type {
  AssignedAssetItem,
  ConsumedSupplyItem,
  DepartmentMaintenanceSummary,
  DepartmentReportRow,
  DepartmentReportSummary,
  MaintenanceLogItem,
  ProjectReportRow,
  ProjectReportSummary,
} from "@/types/reports";
import type { BaseReportQuery } from "./report.validation";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value?: string | null): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

function normalizedConsumableClassSql() {
  return sql<string>`case when lower(trim(coalesce(${consumables.classification}, ''))) = 'material' then 'material' else 'supply' end`;
}

function consumableClassFilterSql(raw?: string): SQL | undefined {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === "all") return undefined;
  if (normalized === "material") {
    return sql`lower(trim(coalesce(${consumables.classification}, ''))) = 'material'`;
  }
  if (normalized === "supply") {
    return sql`lower(trim(coalesce(${consumables.classification}, ''))) <> 'material'`;
  }
  return undefined;
}

function nonVoidedOutIssueConditions(): SQL[] {
  return [
    eq(stockMovements.direction, "out"),
    eq(stockMovements.reason, "issue"),
    or(
      isNull(stockMovements.notes),
      not(ilike(stockMovements.notes, "%[VOIDED]%"))
    )!,
    sql`not exists (
      select 1 from stock_movements rev
      where rev.notes ilike ('%[REVERSES:' || ${stockMovements.id}::text || ']%')
    )`,
  ];
}

function nonVoidedAllocationCondition(): SQL {
  return sql`not exists (
    select 1 from stock_movements smv
    where smv.request_id = ${consumableRequests.id}
      and smv.consumable_id = ${consumableRequestReleaseAllocations.consumableId}
      and (smv.purchase_lot_id is not distinct from ${consumableRequestReleaseAllocations.purchaseLotId})
      and smv.qty = ${consumableRequestReleaseAllocations.quantity}
      and smv.direction = 'out'
      and smv.reason = 'issue'
      and (
        smv.notes ilike '%[VOIDED]%'
        or exists (
          select 1 from stock_movements rev
          where rev.notes ilike ('%[REVERSES:' || smv.id::text || ']%')
        )
      )
  )`;
}

function effectiveMovementValueSql() {
  return sql`coalesce(${stockMovements.lineTotal}::numeric, coalesce(${stockMovements.qty}::numeric, 0) * coalesce(${stockMovements.unitCost}::numeric, 0), 0)`;
}

/** Part-line sum when any line has a cost; otherwise the stored overall cost. */
function effectiveRepairCostSql() {
  return sql`
    coalesce(
      (
        select sum((elem->>'cost')::numeric)
        from jsonb_array_elements(coalesce(${maintenanceLogs.repairParts}, '[]'::jsonb)) as elem
        where nullif(btrim(elem->>'cost'), '') is not null
      ),
      ${maintenanceLogs.repairCost}::numeric
    )
  `;
}

export class ReportRepository {
  private db() {
    return getDb();
  }

  private tenantId(): string | undefined {
    return getTenantContext()?.tenantId;
  }

  // ─── 1. Executive Rollup ──────────────────────────────────────────────────

  async getExecutiveData(explicitTenantId?: string, includeSandbox = false) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // 6-month calendar buckets (oldest -> current)
    const monthBuckets: Array<{ key: string; label: string; procurement: number; maintenance: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      monthBuckets.push({ key, label, procurement: 0, maintenance: 0 });
    }
    const oldestBucketStart = `${monthBuckets[0].key}-01`;

    const nonSandboxAsset = includeSandbox ? undefined : eq(assets.isSandbox, false);
    const nonSandboxConsumable = includeSandbox ? undefined : eq(consumables.isSandbox, false);
    const isMaterialSql = sql`lower(trim(coalesce(${consumables.classification}, ''))) = 'material'`;
    const isLowSql = sql`greatest(0, ${consumables.currentQty} - ${consumables.reservedQty}) <= ${consumables.minThreshold}`;

    const [
      [assetStats],
      [consumableStats],
      [consumableValuation],
      [monthBurn],
      poLotRows,
      borrowReqRows,
      consumableReqRows,
      pendingConsReqLines,
      maintRows,
      assetCategoryRows,
      consumableCategoryRows,
    ] = await Promise.all([
      db
        .select({
          totalCount: sql<number>`count(*)::int`,
          activeCount: sql<number>`count(case when ${assets.status} = 'active' then 1 end)::int`,
          inRepairCount: sql<number>`count(case when ${assets.status} = 'needs_repair' then 1 end)::int`,
          totalValue: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
        })
        .from(assets)
        .where(and(...(tenantId ? [eq(assets.tenantId, tenantId)] : []), ...(nonSandboxAsset ? [nonSandboxAsset] : []))),
      db
        .select({
          totalItems: sql<number>`count(*)::int`,
          lowStockCount: sql<number>`count(case when ${isLowSql} then 1 end)::int`,
          suppliesCount: sql<number>`count(case when not ${isMaterialSql} then 1 end)::int`,
          materialsCount: sql<number>`count(case when ${isMaterialSql} then 1 end)::int`,
          suppliesLowStockCount: sql<number>`count(case when not ${isMaterialSql} and ${isLowSql} then 1 end)::int`,
          materialsLowStockCount: sql<number>`count(case when ${isMaterialSql} and ${isLowSql} then 1 end)::int`,
        })
        .from(consumables)
        .where(and(...(tenantId ? [eq(consumables.tenantId, tenantId)] : []), ...(nonSandboxConsumable ? [nonSandboxConsumable] : []))),
      db
        .select({
          totalValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
          suppliesValuation: sql<number>`coalesce(sum(case when not ${isMaterialSql} and ${purchaseLots.projectId} is null then ${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric else 0 end), 0)::float`,
          materialsValuation: sql<number>`coalesce(sum(case when ${isMaterialSql} or ${purchaseLots.projectId} is not null then ${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric else 0 end), 0)::float`,
        })
        .from(purchaseLots)
        .leftJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
        .where(
          and(
            eq(purchaseLots.itemType, "consumable"),
            sql`${purchaseLots.quantityRemaining} > 0`,
            ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : []),
            ...(includeSandbox ? [] : [or(isNull(purchaseLots.consumableId), eq(consumables.isSandbox, false))!])
          )
        ),
      db
        .select({
          burnValue: sql<number>`coalesce(sum(${effectiveMovementValueSql()}), 0)::float`,
          suppliesBurn: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
          materialsBurn: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
        })
        .from(stockMovements)
        .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
        .where(
          and(
            ...nonVoidedOutIssueConditions(),
            gte(stockMovements.createdAt, thirtyDaysAgo),
            ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : []),
            ...(nonSandboxConsumable ? [nonSandboxConsumable] : [])
          )
        ),
      db
        .select({
          id: purchaseLots.id,
          lotCode: purchaseLots.lotCode,
          reference: purchaseLots.reference,
          notes: purchaseLots.notes,
          totalCost: sql<number>`coalesce(${purchaseLots.totalCost}::numeric, 0)::float`,
          purchasedOn: purchaseLots.purchasedOn,
        })
        .from(purchaseLots)
        .leftJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
        .leftJoin(assets, eq(purchaseLots.assetId, assets.id))
        .where(
          and(
            ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : []),
            ...(includeSandbox
              ? []
              : [
                  or(isNull(purchaseLots.consumableId), eq(consumables.isSandbox, false))!,
                  or(isNull(purchaseLots.assetId), eq(assets.isSandbox, false))!,
                ])
          )
        ),
      db
        .select({
          status: borrowRequests.status,
          requestedAt: borrowRequests.requestedAt,
          updatedAt: borrowRequests.updatedAt,
        })
        .from(borrowRequests)
        .leftJoin(departments, eq(borrowRequests.departmentId, departments.id))
        .where(
          and(
            ...(tenantId ? [eq(borrowRequests.tenantId, tenantId)] : []),
            ...(includeSandbox
              ? []
              : [or(isNull(borrowRequests.departmentId), eq(departments.isSandbox, false))!])
          )
        ),
      db
        .select({
          id: consumableRequests.id,
          status: consumableRequests.status,
          requestedAt: consumableRequests.requestedAt,
          approvedAt: consumableRequests.approvedAt,
          releasedAt: consumableRequests.releasedAt,
        })
        .from(consumableRequests)
        .leftJoin(departments, eq(consumableRequests.departmentId, departments.id))
        .where(
          and(
            ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
            ...(includeSandbox
              ? []
              : [or(isNull(consumableRequests.departmentId), eq(departments.isSandbox, false))!])
          )
        ),
      db
        .select({
          requestId: consumableRequestLines.requestId,
          classification: consumables.classification,
        })
        .from(consumableRequestLines)
        .innerJoin(consumableRequests, eq(consumableRequestLines.requestId, consumableRequests.id))
        .innerJoin(consumables, eq(consumableRequestLines.consumableId, consumables.id))
        .leftJoin(departments, eq(consumableRequests.departmentId, departments.id))
        .where(
          and(
            eq(consumableRequests.status, "pending"),
            ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
            ...(includeSandbox
              ? []
              : [
                  or(isNull(consumableRequests.departmentId), eq(departments.isSandbox, false))!,
                  eq(consumables.isSandbox, false),
                ])
          )
        ),
      db
        .select({
          isResolved: maintenanceLogs.isResolved,
          dateLogged: maintenanceLogs.dateLogged,
          resolutionDate: maintenanceLogs.resolutionDate,
          cost: sql<number>`coalesce(${effectiveRepairCostSql()}, 0)::float`,
        })
        .from(maintenanceLogs)
        .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
        .where(
          and(
            ...(tenantId ? [eq(maintenanceLogs.tenantId, tenantId)] : []),
            ...(includeSandbox ? [] : [or(isNull(maintenanceLogs.assetId), eq(assets.isSandbox, false))!])
          )
        ),
      db
        .select({
          name: assets.category,
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
        })
        .from(assets)
        .where(and(...(tenantId ? [eq(assets.tenantId, tenantId)] : []), ...(nonSandboxAsset ? [nonSandboxAsset] : [])))
        .groupBy(assets.category),
      db
        .select({
          name: consumables.category,
          kind: normalizedConsumableClassSql(),
          count: sql<number>`count(*)::int`,
        })
        .from(consumables)
        .where(and(...(tenantId ? [eq(consumables.tenantId, tenantId)] : []), ...(nonSandboxConsumable ? [nonSandboxConsumable] : [])))
        .groupBy(consumables.category, normalizedConsumableClassSql()),
    ]);

    // Resolve real PO open/pending/spend + 6-month trend
    let openOrdersCount = 0;
    let pendingDeliveryCount = 0;
    let totalSpend30d = 0;
    const bucketMap = new Map(monthBuckets.map((b) => [b.key, b]));

    for (const po of poLotRows) {
      const isOpening =
        po.lotCode?.startsWith("OPEN-") || po.reference === "INITIAL-STOCK";
      const hasJsonMeta = Boolean(po.notes?.trim().startsWith("{") && po.notes.includes('"status"'));
      const meta = parseNotesMetadata(po.notes);
      const resolvedStatus = hasJsonMeta || (po.notes && /\[STATUS:\s*[a-z_]+\]/i.test(po.notes))
        ? meta.status
        : "delivered";
      if (resolvedStatus === "cancelled") continue;
      if (!isOpening && (resolvedStatus === "pending_approval" || resolvedStatus === "approved")) {
        openOrdersCount += 1;
      }
      if (!isOpening && resolvedStatus === "ordered") {
        pendingDeliveryCount += 1;
      }
      if (!isOpening && po.purchasedOn && po.purchasedOn >= thirtyDaysAgoStr) {
        totalSpend30d += po.totalCost || 0;
      }
      if (!isOpening && po.purchasedOn && po.purchasedOn >= oldestBucketStart) {
        const b = bucketMap.get(po.purchasedOn.slice(0, 7));
        if (b) b.procurement += po.totalCost || 0;
      }
    }

    // Resolve real maintenance stats + monthly trend
    let activeMaint = 0;
    let resolvedMaintMonth = 0;
    let totalRepairSpend30d = 0;
    let mttrSum = 0;
    let mttrCount = 0;
    for (const m of maintRows) {
      if (!m.isResolved) {
        activeMaint += 1;
      } else if (m.resolutionDate) {
        if (m.resolutionDate >= thirtyDaysAgoStr) resolvedMaintMonth += 1;
        if (m.dateLogged) {
          const days = Math.max(
            0,
            (new Date(m.resolutionDate).getTime() - new Date(m.dateLogged).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (Number.isFinite(days)) {
            mttrSum += days;
            mttrCount += 1;
          }
        }
      }
      if (m.dateLogged && m.dateLogged >= thirtyDaysAgoStr) {
        totalRepairSpend30d += m.cost || 0;
      }
      if (m.dateLogged && m.dateLogged >= oldestBucketStart) {
        const b = bucketMap.get(m.dateLogged.slice(0, 7));
        if (b) b.maintenance += m.cost || 0;
      }
    }

    // Resolve request breakdown & average turnaround
    let borrowPendingCount = 0;
    let fulfilledMonth = 0;
    let turnaroundSum = 0;
    let turnaroundCount = 0;
    for (const r of borrowReqRows) {
      if (r.status === "pending") borrowPendingCount += 1;
      if (r.status === "released" && r.updatedAt >= thirtyDaysAgo) fulfilledMonth += 1;
      if ((r.status === "released" || r.status === "approved") && r.updatedAt && r.requestedAt) {
        const hrs = Math.max(0.1, (r.updatedAt.getTime() - r.requestedAt.getTime()) / (1000 * 60 * 60));
        turnaroundSum += hrs;
        turnaroundCount += 1;
      }
    }
    const classesByPendingReq = new Map<string, string[]>();
    for (const line of pendingConsReqLines) {
      const list = classesByPendingReq.get(line.requestId) ?? [];
      list.push(normalizeConsumableClassification(line.classification));
      classesByPendingReq.set(line.requestId, list);
    }
    let supplyPendingCount = 0;
    let materialPendingCount = 0;
    let mixedPendingCount = 0;
    let consumablePendingTotal = 0;
    for (const r of consumableReqRows) {
      if (r.status === "pending") {
        consumablePendingTotal += 1;
        const kind = deriveConsumableRequestKind(classesByPendingReq.get(r.id) ?? []);
        if (kind === "material") materialPendingCount += 1;
        else if (kind === "mixed") mixedPendingCount += 1;
        else supplyPendingCount += 1;
      }
      if (r.status === "released" && r.releasedAt && new Date(r.releasedAt) >= thirtyDaysAgo) {
        fulfilledMonth += 1;
      }
      const endTs = r.releasedAt ?? r.approvedAt;
      if (endTs && r.requestedAt) {
        const hrs = Math.max(0.1, (new Date(endTs).getTime() - new Date(r.requestedAt).getTime()) / (1000 * 60 * 60));
        turnaroundSum += hrs;
        turnaroundCount += 1;
      }
    }

    return {
      assets: {
        totalCount: assetStats?.totalCount ?? 0,
        activeCount: assetStats?.activeCount ?? 0,
        inRepairCount: assetStats?.inRepairCount ?? 0,
        totalValue: assetStats?.totalValue ?? 0,
      },
      consumables: {
        totalItems: consumableStats?.totalItems ?? 0,
        lowStockCount: consumableStats?.lowStockCount ?? 0,
        totalValuation: consumableValuation?.totalValuation ?? 0,
        monthBurnRateValue: monthBurn?.burnValue ?? 0,
        suppliesCount: consumableStats?.suppliesCount ?? 0,
        materialsCount: consumableStats?.materialsCount ?? 0,
        suppliesLowStockCount: consumableStats?.suppliesLowStockCount ?? 0,
        materialsLowStockCount: consumableStats?.materialsLowStockCount ?? 0,
        suppliesValuation: consumableValuation?.suppliesValuation ?? 0,
        materialsValuation: consumableValuation?.materialsValuation ?? 0,
        suppliesBurnRateValue: monthBurn?.suppliesBurn ?? 0,
        materialsBurnRateValue: monthBurn?.materialsBurn ?? 0,
      },
      procurement: {
        openOrdersCount,
        totalSpend30d,
        pendingDeliveryCount,
      },
      requests: {
        pendingCount: borrowPendingCount + consumablePendingTotal,
        fulfilledThisMonth: fulfilledMonth,
        avgApprovalHours:
          turnaroundCount > 0 ? Math.round((turnaroundSum / turnaroundCount) * 10) / 10 : 0,
        supplyPendingCount,
        materialPendingCount,
        mixedPendingCount,
        borrowPendingCount,
      },
      maintenance: {
        activeIssuesCount: activeMaint,
        resolvedThisMonth: resolvedMaintMonth,
        avgMttrDays: mttrCount > 0 ? Math.round((mttrSum / mttrCount) * 10) / 10 : 0,
        totalRepairSpend30d,
      },
      charts: {
        categoryDistribution: [
          ...assetCategoryRows.map((r) => ({
            name: r.name,
            count: r.count,
            value: r.value,
            kind: "asset" as const,
          })),
          ...consumableCategoryRows.map((r) => ({
            name: `${r.name} (${r.kind === "material" ? "Material" : "Supply"})`,
            count: r.count,
            value: 0,
            kind: r.kind as "supply" | "material",
          })),
        ],
        monthlySpendTrend: monthBuckets.map((b) => ({
          month: b.label,
          procurement: Math.round(b.procurement * 100) / 100,
          maintenance: Math.round(b.maintenance * 100) / 100,
        })),
        statusDistribution: [
          { status: "Active", count: assetStats?.activeCount ?? 0 },
          { status: "Needs Repair", count: assetStats?.inRepairCount ?? 0 },
          {
            status: "Other",
            count: Math.max(
              0,
              (assetStats?.totalCount ?? 0) -
                (assetStats?.activeCount ?? 0) -
                (assetStats?.inRepairCount ?? 0)
            ),
          },
        ],
      },
    };
  }

  // ─── 2. Asset Register Report ─────────────────────────────────────────────

  async getAssetRegisterReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(assets.tenantId, tenantId));
    }
    if (!filters.includeSandbox) {
      conditions.push(eq(assets.isSandbox, false));
    }
    if (filters.category && filters.category !== "all") {
      conditions.push(eq(assets.category, filters.category));
    }
    if (filters.classification && filters.classification !== "all") {
      conditions.push(eq(assets.classification, filters.classification));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(
          assets.status,
          filters.status as (typeof assetStatusEnum.enumValues)[number]
        )
      );
    }
    if (filters.departmentId) {
      conditions.push(eq(assets.department, filters.departmentId));
    }
    if (filters.startDate) {
      conditions.push(sql`coalesce(${assets.purchaseDate}, ${assets.createdAt}::date::text) >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`coalesce(${assets.purchaseDate}, ${assets.createdAt}::date::text) <= ${filters.endDate}`);
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.assetCode, q),
          ilike(assets.name, q),
          ilike(assets.location, q),
          ilike(assets.category, q),
          ilike(assets.serialNumber, q),
          ilike(assets.currentHolder, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Summary aggregates
    const [summaryRow] = await db
      .select({
        totalAssets: sql<number>`count(*)::int`,
        totalValuation: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
        activeCount: sql<number>`count(case when ${assets.status} = 'active' then 1 end)::int`,
        needsRepairCount: sql<number>`count(case when ${assets.status} = 'needs_repair' then 1 end)::int`,
        outOfServiceCount: sql<number>`count(case when ${assets.status} = 'out_of_service' then 1 end)::int`,
        retiredCount: sql<number>`count(case when ${assets.status} = 'retired' then 1 end)::int`,
      })
      .from(assets)
      .where(whereClause);

    // Paginated list
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        category: assets.category,
        classification: assets.classification,
        status: assets.status,
        assignmentType: assets.assignmentType,
        location: assets.location,
        department: assets.department,
        currentHolder: assets.currentHolder,
        purchaseDate: assets.purchaseDate,
        purchaseCost: sql<number | null>`${assets.value}::numeric::float`,
        currentValue: sql<number | null>`${assets.value}::numeric::float`,
        supplierName: suppliers.name,
        serialNumber: assets.serialNumber,
        lastUpdated: assets.lastUpdated,
      })
      .from(assets)
      .leftJoin(suppliers, eq(assets.supplierId, suppliers.id))
      .where(whereClause)
      .orderBy(desc(assets.createdAt))
      .limit(pageSize)
      .offset(offset);

    const total = summaryRow?.totalAssets ?? 0;

    return {
      data: rows.map((r) => ({
        ...r,
        hasActiveMaintenance: r.status === "needs_repair" || r.status === "out_of_service",
        lastUpdated: r.lastUpdated.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalAssets: total,
        totalValuation: summaryRow?.totalValuation ?? 0,
        activeCount: summaryRow?.activeCount ?? 0,
        needsRepairCount: summaryRow?.needsRepairCount ?? 0,
        outOfServiceCount: summaryRow?.outOfServiceCount ?? 0,
        retiredCount: summaryRow?.retiredCount ?? 0,
      },
    };
  }

  // ─── 3. Asset Drill-down Report ───────────────────────────────────────────

  async getAssetDrilldownReport(assetId: string, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();

    // Base asset
    const [assetRow] = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        category: assets.category,
        classification: assets.classification,
        unit: assets.unit,
        status: assets.status,
        assignmentType: assets.assignmentType,
        location: assets.location,
        department: assets.department,
        currentHolder: assets.currentHolder,
        purchaseDate: assets.purchaseDate,
        value: sql<number | null>`${assets.value}::numeric::float`,
        supplierName: suppliers.name,
        serialNumber: assets.serialNumber,
        imageUrl: assets.imageUrl,
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .leftJoin(suppliers, eq(assets.supplierId, suppliers.id))
      .where(
        and(
          isUuid(assetId) ? eq(assets.id, assetId) : eq(assets.assetCode, assetId),
          ...(tenantId ? [eq(assets.tenantId, tenantId)] : [])
        )
      )
      .limit(1);

    if (!assetRow) return null;

    // Purchase lot
    const [poLot] = await db
      .select({
        lotCode: purchaseLots.lotCode,
        poNumber: purchaseLots.lotCode,
        purchasedOn: purchaseLots.purchasedOn,
        supplierName: purchaseLots.supplierName,
        unitCost: sql<number | null>`${purchaseLots.unitCost}::numeric::float`,
        reference: purchaseLots.reference,
        receiptUrl: purchaseLots.receiptUrl,
      })
      .from(purchaseLots)
      .where(
        and(
          eq(purchaseLots.assetId, assetRow.id),
          ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : [])
        )
      )
      .limit(1);

    // Maintenance history
    const maintRows = await db
      .select({
        id: maintenanceLogs.id,
        logCode: maintenanceLogs.logCode,
        condition: maintenanceLogs.condition,
        source: maintenanceLogs.source,
        dateLogged: maintenanceLogs.dateLogged,
        isResolved: maintenanceLogs.isResolved,
        resolutionDate: maintenanceLogs.resolutionDate,
        repairCost: sql<number | null>`${maintenanceLogs.repairCost}::numeric::float`,
        loggedByName: maintenanceLogs.loggedByName,
        resolvedByName: maintenanceLogs.resolvedByName,
        notes: maintenanceLogs.notes,
        workNotes: maintenanceLogs.workNotes,
        resolutionNotes: maintenanceLogs.resolutionNotes,
        repairParts: maintenanceLogs.repairParts,
      })
      .from(maintenanceLogs)
      .where(
        and(
          eq(maintenanceLogs.assetId, assetRow.id),
          ...(tenantId ? [eq(maintenanceLogs.tenantId, tenantId)] : [])
        )
      )
      .orderBy(desc(maintenanceLogs.dateLogged));

    // Custody & borrow transactions
    const custodyRows = await db
      .select({
        id: borrowTransactions.id,
        logCode: borrowTransactions.logCode,
        borrowerName: borrowTransactions.borrowerName,
        borrowerEmail: borrowTransactions.borrowerEmail,
        department: borrowTransactions.department,
        status: borrowTransactions.status,
        borrowedAt: borrowTransactions.releasedAt,
        expectedReturnDate: borrowTransactions.dueDate,
        returnedAt: borrowTransactions.returnedAt,
      })
      .from(borrowTransactions)
      .where(
        and(
          eq(borrowTransactions.assetId, assetRow.id),
          ...(tenantId ? [eq(borrowTransactions.tenantId, tenantId)] : [])
        )
      )
      .orderBy(desc(borrowTransactions.releasedAt));

    // Calculate TCO. Part lines define the service cost when they have amounts.
    const purchaseCost = poLot?.unitCost ?? assetRow.value ?? 0;
    const maintenanceCost = maintRows.reduce((sum, m) => {
      return sum + (effectiveRepairAmount(m.repairCost, m.repairParts) ?? 0);
    }, 0);
    const consumablesCost = 0; // future link via asset work orders
    const totalCostOfOwnership = purchaseCost + maintenanceCost + consumablesCost;

    return {
      asset: {
        ...assetRow,
        createdAt: assetRow.createdAt.toISOString(),
        updatedAt: assetRow.updatedAt.toISOString(),
      },
      purchaseInfo: poLot ?? null,
      maintenanceHistory: maintRows.map((m) => ({
        ...m,
        workNotes: m.workNotes ?? null,
        resolutionNotes: m.resolutionNotes ?? null,
        repairParts: Array.isArray(m.repairParts) ? m.repairParts : [],
        repairCost: effectiveRepairAmount(m.repairCost, m.repairParts),
        totalCost: effectiveRepairAmount(m.repairCost, m.repairParts),
        serviceProvider: m.resolvedByName ?? "—",
      })),
      custodyHistory: custodyRows.map((c) => ({
        ...c,
        purpose: "Equipment custody / loan",
        borrowedAt: c.borrowedAt.toISOString(),
        returnedAt: c.returnedAt ? c.returnedAt.toISOString() : null,
      })),
      consumablesConsumed: [],
      tco: {
        purchaseCost,
        maintenanceCost,
        consumablesCost,
        totalCostOfOwnership,
      },
      canViewCosts: true,
    };
  }

  // ─── 4. Consumables Stock & Usage Report ──────────────────────────────────

  async getConsumablesReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(consumables.tenantId, tenantId));
    }
    if (!filters.includeSandbox) {
      conditions.push(eq(consumables.isSandbox, false));
    }
    if (filters.category && filters.category !== "all") {
      conditions.push(
        sql`lower(trim(${consumables.category})) = ${filters.category.trim().toLowerCase()}`
      );
    }
    const classCond = consumableClassFilterSql(filters.classification);
    if (classCond) {
      conditions.push(classCond);
    }
    if (filters.status === "low_stock") {
      conditions.push(
        sql`greatest(0, ${consumables.currentQty} - ${consumables.reservedQty}) <= ${consumables.minThreshold}`
      );
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(consumables.itemCode, q),
          ilike(consumables.name, q),
          ilike(consumables.category, q),
          ilike(consumables.categoryClass, q),
          ilike(consumables.location, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const isMaterialSql = sql`lower(trim(coalesce(${consumables.classification}, ''))) = 'material'`;
    const isLowSql = sql`greatest(0, ${consumables.currentQty} - ${consumables.reservedQty}) <= ${consumables.minThreshold}`;

    // Summary counts (scoped by active filters)
    const [summaryRow] = await db
      .select({
        totalSkus: sql<number>`count(*)::int`,
        lowStockItemsCount: sql<number>`count(case when ${isLowSql} then 1 end)::int`,
        totalReservedQty: sql<number>`coalesce(sum(${consumables.reservedQty}), 0)::float`,
        suppliesCount: sql<number>`count(case when not ${isMaterialSql} then 1 end)::int`,
        materialsCount: sql<number>`count(case when ${isMaterialSql} then 1 end)::int`,
        suppliesLowStockCount: sql<number>`count(case when not ${isMaterialSql} and ${isLowSql} then 1 end)::int`,
        materialsLowStockCount: sql<number>`count(case when ${isMaterialSql} and ${isLowSql} then 1 end)::int`,
      })
      .from(consumables)
      .where(whereClause);

    // Usage totals for period (issue movements only, excluding voided/reversals, scoped by consumables filter)
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const smConditions: SQL[] = [
      ...nonVoidedOutIssueConditions(),
      ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : []),
      ...(whereClause ? [whereClause] : []),
    ];
    if (filters.startDate) {
      smConditions.push(gte(sql`${stockMovements.createdAt}::date`, filters.startDate));
    } else {
      smConditions.push(gte(stockMovements.createdAt, sql`${thirtyDaysAgoIso}::timestamptz`));
    }
    if (filters.endDate) {
      smConditions.push(lte(sql`${stockMovements.createdAt}::date`, filters.endDate));
    }

    const [dispatchSummary] = await db
      .select({
        totalQty: sql<number>`coalesce(sum(${stockMovements.qty}::numeric), 0)::float`,
        totalVal: sql<number>`coalesce(sum(${effectiveMovementValueSql()}), 0)::float`,
        suppliesQty: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
        materialsQty: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
        suppliesVal: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
        materialsVal: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
      })
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
      .where(and(...smConditions));

    // Consumable inventory valuation from active lots (scoped by consumables filter)
    const [consumableValuation] = await db
      .select({
        totalValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
        suppliesValuation: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric else 0 end), 0)::float`,
        materialsValuation: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric else 0 end), 0)::float`,
      })
      .from(purchaseLots)
      .innerJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
      .where(
        and(
          eq(purchaseLots.itemType, "consumable"),
          sql`${purchaseLots.quantityRemaining} > 0`,
          ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : []),
          ...(whereClause ? [whereClause] : [])
        )
      );

    // Lot cost aggregations per consumable
    const lotAggregates = await db
      .select({
        consumableId: purchaseLots.consumableId,
        latestUnitCost: sql<number>`coalesce(sum(case when ${purchaseLots.quantityRemaining} > 0 then ${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric else 0 end) / nullif(sum(case when ${purchaseLots.quantityRemaining} > 0 then ${purchaseLots.quantityRemaining} else 0 end), 0), max(${purchaseLots.unitCost}::numeric), 0)::float`,
        lotValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
      })
      .from(purchaseLots)
      .innerJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
      .where(
        and(
          eq(purchaseLots.itemType, "consumable"),
          sql`${purchaseLots.consumableId} is not null`,
          ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : []),
          ...(whereClause ? [whereClause] : [])
        )
      )
      .groupBy(purchaseLots.consumableId);

    const lotMap = new Map<string, { latestUnitCost: number; valuation: number }>();
    for (const l of lotAggregates) {
      if (l.consumableId) {
        lotMap.set(l.consumableId, {
          latestUnitCost: l.latestUnitCost || 0,
          valuation: l.lotValuation || 0,
        });
      }
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: consumables.id,
        itemCode: consumables.itemCode,
        name: consumables.name,
        category: consumables.category,
        classification: consumables.classification,
        unit: consumables.unit,
        currentQty: consumables.currentQty,
        reservedQty: consumables.reservedQty,
        minThreshold: consumables.minThreshold,
        location: consumables.location,
        lastRestocked: consumables.lastRestocked,
      })
      .from(consumables)
      .where(whereClause)
      .orderBy(consumables.name)
      .limit(pageSize)
      .offset(offset);

    // Top consuming departments from non-voided issue movements (scoped by consumables filter)
    const topDeptRows = await db
      .select({
        departmentName: sql<string>`coalesce(${departments.name}, 'General Stores')`,
        unitsConsumed: sql<number>`coalesce(sum(${stockMovements.qty}::numeric), 0)::float`,
        spendValue: sql<number>`coalesce(sum(${effectiveMovementValueSql()}), 0)::float`,
      })
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
      .leftJoin(departments, eq(stockMovements.departmentId, departments.id))
      .where(and(...smConditions))
      .groupBy(departments.name)
      .orderBy(sql`sum(${stockMovements.qty}::numeric) desc`)
      .limit(5);

    // Query actual 30-day and 90-day outgoing non-voided issue movements preserving fractional quantities
    const now = new Date();
    const d30Iso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d90Iso = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const consumableUsageAggregates = await db
      .select({
        consumableId: stockMovements.consumableId,
        usage30d: sql<number>`coalesce(sum(case when ${stockMovements.createdAt} >= ${d30Iso}::timestamptz then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
        usage90d: sql<number>`coalesce(sum(case when ${stockMovements.createdAt} >= ${d90Iso}::timestamptz then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
      })
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
      .where(
        and(
          ...nonVoidedOutIssueConditions(),
          gte(stockMovements.createdAt, sql`${d90Iso}::timestamptz`),
          ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : []),
          ...(whereClause ? [whereClause] : [])
        )
      )
      .groupBy(stockMovements.consumableId);

    const usageMap = new Map<string, { usage30d: number; usage90d: number }>();
    for (const u of consumableUsageAggregates) {
      if (u.consumableId) {
        usageMap.set(u.consumableId, {
          usage30d: u.usage30d || 0,
          usage90d: u.usage90d || 0,
        });
      }
    }

    const total = summaryRow?.totalSkus ?? 0;

    return {
      data: rows.map((r) => {
        const currentQty = toQty(r.currentQty);
        const reservedQty = toQty(r.reservedQty);
        const minThreshold = toQty(r.minThreshold);
        const available = Math.max(0, currentQty - reservedQty);
        const isLow = available <= minThreshold;

        const itemUsage = usageMap.get(r.id);
        const usage30d = itemUsage?.usage30d ?? 0;
        const usage90d = itemUsage?.usage90d ?? 0;
        const dailyBurn = usage30d / 30;
        const daysRemaining = dailyBurn > 0 ? Math.round(available / dailyBurn) : null;

        const lotInfo = lotMap.get(r.id);
        const unitCost = lotInfo?.latestUnitCost ?? null;
        const stockValuation =
          lotInfo && lotInfo.valuation > 0
            ? lotInfo.valuation
            : unitCost
              ? currentQty * unitCost
              : null;

        return {
          id: r.id,
          itemCode: r.itemCode,
          name: r.name,
          category: r.category,
          classification: normalizeConsumableClassification(r.classification),
          unit: r.unit,
          currentQty,
          reservedQty,
          availableQty: available,
          minThreshold,
          location: r.location,
          unitCost: unitCost as number | null,
          stockValuation: stockValuation as number | null,
          usage30d,
          usage90d,
          estimatedDaysRemaining: daysRemaining,
          isLowStock: isLow,
          lastRestocked: r.lastRestocked ? r.lastRestocked.toISOString() : null,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalSkus: total,
        lowStockItemsCount: summaryRow?.lowStockItemsCount ?? 0,
        totalReservedQty: summaryRow?.totalReservedQty ?? 0,
        suppliesCount: summaryRow?.suppliesCount ?? 0,
        materialsCount: summaryRow?.materialsCount ?? 0,
        suppliesLowStockCount: summaryRow?.suppliesLowStockCount ?? 0,
        materialsLowStockCount: summaryRow?.materialsLowStockCount ?? 0,
        totalInventoryValuation: consumableValuation?.totalValuation ?? 0,
        suppliesValuation: consumableValuation?.suppliesValuation ?? 0,
        materialsValuation: consumableValuation?.materialsValuation ?? 0,
        totalDispatched30d: dispatchSummary?.totalQty ?? 0,
        totalDispatchedValue30d: dispatchSummary?.totalVal ?? 0,
        suppliesDispatched30d: dispatchSummary?.suppliesQty ?? 0,
        materialsDispatched30d: dispatchSummary?.materialsQty ?? 0,
        suppliesDispatchedValue30d: dispatchSummary?.suppliesVal ?? 0,
        materialsDispatchedValue30d: dispatchSummary?.materialsVal ?? 0,
        topConsumingDepartments: topDeptRows,
      },
    };
  }

  // ─── 5. Purchase Orders Report ────────────────────────────────────────────

  async getPurchaseOrdersReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(purchaseLots.tenantId, tenantId));
    }
    if (!filters.includeSandbox) {
      conditions.push(
        or(isNull(purchaseLots.consumableId), eq(consumables.isSandbox, false))!,
        or(isNull(purchaseLots.assetId), eq(assets.isSandbox, false))!
      );
    }
    if (
      filters.category &&
      filters.category !== "all" &&
      (purchaseLotItemTypeEnum.enumValues as readonly string[]).includes(
        filters.category
      )
    ) {
      conditions.push(
        eq(
          purchaseLots.itemType,
          filters.category as (typeof purchaseLotItemTypeEnum.enumValues)[number]
        )
      );
    }
    if (filters.startDate) {
      conditions.push(gte(purchaseLots.purchasedOn, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(purchaseLots.purchasedOn, filters.endDate));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(purchaseLots.lotCode, q),
          ilike(purchaseLots.itemName, q),
          ilike(purchaseLots.supplierName, q),
          ilike(purchaseLots.reference, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rawRows = await db
      .select({
        id: purchaseLots.id,
        lotCode: purchaseLots.lotCode,
        reference: purchaseLots.reference,
        supplierName: purchaseLots.supplierName,
        itemType: purchaseLots.itemType,
        consumableId: purchaseLots.consumableId,
        consumableClassification: consumables.classification,
        projectId: purchaseLots.projectId,
        itemName: purchaseLots.itemName,
        quantity: purchaseLots.quantity,
        totalCost: sql<number>`coalesce(${purchaseLots.totalCost}::numeric, 0)::float`,
        purchasedOn: purchaseLots.purchasedOn,
        createdAt: purchaseLots.createdAt,
        notes: purchaseLots.notes,
      })
      .from(purchaseLots)
      .leftJoin(consumables, eq(purchaseLots.consumableId, consumables.id))
      .leftJoin(assets, eq(purchaseLots.assetId, assets.id))
      .where(whereClause)
      .orderBy(desc(purchaseLots.purchasedOn), desc(purchaseLots.createdAt));

    const wantedClass = filters.classification?.trim().toLowerCase();
    const wantedStatus = filters.status?.trim().toLowerCase();

    const enriched = rawRows
      .filter(
        (r) =>
          !(
            r.lotCode?.startsWith("OPEN-") || r.reference === "INITIAL-STOCK"
          )
      )
      .map((r) => {
        const hasJsonMeta = Boolean(
          r.notes?.trim().startsWith("{") && r.notes.includes('"status"')
        );
        const hasTagStatus = Boolean(
          r.notes && /\[STATUS:\s*[a-z_]+\]/i.test(r.notes)
        );
        const meta = parseNotesMetadata(r.notes);
        const status =
          hasJsonMeta || hasTagStatus ? meta.status : ("delivered" as const);
        const resolvedClassification = resolvePurchaseLotClassification({
          itemType: r.itemType,
          projectId: r.projectId,
          classification:
            r.consumableClassification ?? meta.draftItem?.classification,
          consumableId: r.consumableId,
        });

        let leadTimeDays: number | null = null;
        const endDateStr = meta.deliveredAt?.split("T")[0] || r.purchasedOn;
        if (r.createdAt && endDateStr) {
          const cDate = new Date(r.createdAt).getTime();
          const pDate = new Date(endDateStr).getTime();
          leadTimeDays = Math.max(
            0,
            Math.round(Math.abs(pDate - cDate) / (1000 * 60 * 60 * 24))
          );
        }

        return {
          poNumber: r.lotCode,
          supplierName: r.supplierName || "Direct / Internal",
          status,
          itemType: r.itemType as "consumable" | "asset",
          classification: resolvedClassification,
          totalAmount: r.totalCost as number | null,
          totalQuantity: Number(r.quantity) || 0,
          lineItemCount: 1,
          purchasedOn: r.purchasedOn,
          approvedAt: meta.approvedAt?.split("T")[0] ?? (status !== "pending_approval" ? r.purchasedOn : null),
          deliveredAt: status === "delivered" ? (meta.deliveredAt?.split("T")[0] ?? r.purchasedOn) : null,
          leadTimeDays,
          itemsPreview: r.itemName,
        };
      })
      .filter((r) => {
        if (wantedClass && wantedClass !== "all") {
          if (wantedClass === "asset") return r.itemType === "asset";
          if (wantedClass === "supply" || wantedClass === "material") {
            return r.itemType === "consumable" && r.classification === wantedClass;
          }
        }
        return true;
      })
      .filter((r) => {
        if (wantedStatus && wantedStatus !== "all") {
          if (wantedStatus === "open") {
            return ["pending_approval", "approved", "ordered"].includes(r.status);
          }
          return r.status === wantedStatus;
        }
        return true;
      });

    let totalSpend = 0;
    let openOrdersCount = 0;
    let deliveredCount = 0;
    let suppliesSpend = 0;
    let materialsSpend = 0;
    let assetsSpend = 0;
    let suppliesOrdersCount = 0;
    let materialsOrdersCount = 0;
    let assetsOrdersCount = 0;
    let leadSum = 0;
    let leadCount = 0;
    const supplierSpendMap = new Map<string, number>();

    for (const r of enriched) {
      if (r.status === "cancelled") continue;
      const amt = r.totalAmount ?? 0;
      totalSpend += amt;
      if (r.status === "delivered") {
        deliveredCount += 1;
      } else {
        openOrdersCount += 1;
      }
      if (r.itemType === "asset") {
        assetsOrdersCount += 1;
        assetsSpend += amt;
      } else if (r.classification === "material") {
        materialsOrdersCount += 1;
        materialsSpend += amt;
      } else {
        suppliesOrdersCount += 1;
        suppliesSpend += amt;
      }
      if (r.status === "delivered" && r.leadTimeDays != null) {
        leadSum += r.leadTimeDays;
        leadCount += 1;
      }
      supplierSpendMap.set(
        r.supplierName,
        (supplierSpendMap.get(r.supplierName) ?? 0) + amt
      );
    }

    const topSuppliers = Array.from(supplierSpendMap.entries())
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const total = enriched.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    return {
      data: enriched.slice(offset, offset + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalSpend,
        openOrdersCount,
        deliveredCount,
        avgLeadTimeDays:
          leadCount > 0 ? Math.round((leadSum / leadCount) * 10) / 10 : 0,
        suppliesSpend,
        materialsSpend,
        assetsSpend,
        suppliesOrdersCount,
        materialsOrdersCount,
        assetsOrdersCount,
        topSuppliers,
      },
    };
  }

  // ─── 6. Requests Report ───────────────────────────────────────────────────

  async getRequestsReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const wantedClass = filters.classification?.trim().toLowerCase();

    // Borrow requests filter
    const brConditions: SQL[] = [];
    if (tenantId) brConditions.push(eq(borrowRequests.tenantId, tenantId));
    if (filters.status && filters.status !== "all") {
      brConditions.push(
        eq(
          borrowRequests.status,
          filters.status as (typeof borrowRequestStatusEnum.enumValues)[number]
        )
      );
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      const deptFilter = filters.departmentId.trim();
      brConditions.push(
        isUuid(deptFilter)
          ? or(
              eq(borrowRequests.departmentId, deptFilter),
              ilike(borrowRequests.department, `%${deptFilter}%`)
            )!
          : ilike(borrowRequests.department, `%${deptFilter}%`)
      );
    }
    if (filters.startDate) {
      brConditions.push(gte(sql`${borrowRequests.requestedAt}::date`, filters.startDate));
    }
    if (filters.endDate) {
      brConditions.push(lte(sql`${borrowRequests.requestedAt}::date`, filters.endDate));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      brConditions.push(
        or(
          ilike(borrowRequests.requestCode, q),
          ilike(borrowRequests.requesterName, q),
          ilike(borrowRequests.department, q),
          ilike(borrowRequests.purpose, q)
        )!
      );
    }
    const brWhere = brConditions.length ? and(...brConditions) : undefined;

    // Consumable requests filter
    const crConditions: SQL[] = [];
    if (tenantId) crConditions.push(eq(consumableRequests.tenantId, tenantId));
    if (filters.status && filters.status !== "all") {
      crConditions.push(
        eq(
          consumableRequests.status,
          filters.status as (typeof consumableRequestStatusEnum.enumValues)[number]
        )
      );
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      const deptFilter = filters.departmentId.trim();
      crConditions.push(
        isUuid(deptFilter)
          ? or(
              eq(consumableRequests.departmentId, deptFilter),
              ilike(consumableRequests.department, `%${deptFilter}%`)
            )!
          : ilike(consumableRequests.department, `%${deptFilter}%`)
      );
    }
    if (filters.startDate) {
      crConditions.push(gte(sql`${consumableRequests.requestedAt}::date`, filters.startDate));
    }
    if (filters.endDate) {
      crConditions.push(lte(sql`${consumableRequests.requestedAt}::date`, filters.endDate));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      crConditions.push(
        or(
          ilike(consumableRequests.requestCode, q),
          ilike(consumableRequests.requesterName, q),
          ilike(consumableRequests.department, q),
          ilike(consumableRequests.purpose, q)
        )!
      );
    }
    const crWhere = crConditions.length ? and(...crConditions) : undefined;

    const skipBorrow =
      wantedClass === "supply" ||
      wantedClass === "material" ||
      wantedClass === "mixed";
    const skipConsumable =
      wantedClass === "borrowable" ||
      wantedClass === "assignable" ||
      wantedClass === "asset_borrow" ||
      wantedClass === "asset";

    const [borrowRows, consumableRows, sandboxDepts] = await Promise.all([
      skipBorrow
        ? Promise.resolve([])
        : db
            .select({
              id: borrowRequests.id,
              requestCode: borrowRequests.requestCode,
              requestType: borrowRequests.requestType,
              requesterName: borrowRequests.requesterName,
              departmentId: borrowRequests.departmentId,
              department: borrowRequests.department,
              status: borrowRequests.status,
              purpose: borrowRequests.purpose,
              items: borrowRequests.items,
              requestedAt: borrowRequests.requestedAt,
              updatedAt: borrowRequests.updatedAt,
            })
            .from(borrowRequests)
            .where(brWhere)
            .orderBy(desc(borrowRequests.requestedAt)),
      skipConsumable
        ? Promise.resolve([])
        : db
            .select({
              id: consumableRequests.id,
              requestCode: consumableRequests.requestCode,
              requesterName: consumableRequests.requesterName,
              departmentId: consumableRequests.departmentId,
              department: consumableRequests.department,
              status: consumableRequests.status,
              purpose: consumableRequests.purpose,
              requestedAt: consumableRequests.requestedAt,
              releasedAt: consumableRequests.releasedAt,
              approvedAt: consumableRequests.approvedAt,
            })
            .from(consumableRequests)
            .where(crWhere)
            .orderBy(desc(consumableRequests.requestedAt)),
      filters.includeSandbox
        ? Promise.resolve([])
        : db
            .select({ id: departments.id })
            .from(departments)
            .where(
              and(
                eq(departments.isSandbox, true),
                ...(tenantId ? [eq(departments.tenantId, tenantId)] : [])
              )
            ),
    ]);

    const sandboxDeptIds = new Set(sandboxDepts.map((d) => d.id));
    const filteredBorrowRows = borrowRows.filter(
      (r) => !r.departmentId || !sandboxDeptIds.has(r.departmentId)
    );
    const filteredConsumableRows = consumableRows.filter(
      (r) => !r.departmentId || !sandboxDeptIds.has(r.departmentId)
    );

    // Hydrate consumable request line items & classifications in one query
    const consIds = filteredConsumableRows.map((r) => r.id);
    const linesByRequest = new Map<
      string,
      Array<{ itemName: string; qty: string; classification: string }>
    >();
    const requestIdsWithAnyLine = new Set<string>();
    if (consIds.length > 0) {
      const lineRows = await db
        .select({
          requestId: consumableRequestLines.requestId,
          itemName: consumables.name,
          qty: consumableRequestLines.quantityRequested,
          classification: consumables.classification,
          isSandbox: consumables.isSandbox,
        })
        .from(consumableRequestLines)
        .innerJoin(consumables, eq(consumableRequestLines.consumableId, consumables.id))
        .where(
          and(
            inArray(consumableRequestLines.requestId, consIds),
            ...(tenantId ? [eq(consumables.tenantId, tenantId)] : [])
          )
        );
      for (const l of lineRows) {
        requestIdsWithAnyLine.add(l.requestId);
        if (!filters.includeSandbox && l.isSandbox) continue;
        const list = linesByRequest.get(l.requestId) ?? [];
        list.push({
          itemName: l.itemName,
          qty: String(l.qty),
          classification: normalizeConsumableClassification(l.classification),
        });
        linesByRequest.set(l.requestId, list);
      }
    }

    const mappedBorrowRows = filteredBorrowRows.map((r) => {
      const items = r.items || [];
      const summary = items.map((i) => i.itemDescription || "Item").join(", ");
      const subClass =
        r.requestType === "assignable"
          ? ("assignable" as const)
          : ("borrowable" as const);
      let turnaroundHours: number | null = null;
      if (r.status === "released" && r.requestedAt && r.updatedAt) {
        const reqT = new Date(r.requestedAt).getTime();
        const updT = new Date(r.updatedAt).getTime();
        turnaroundHours = Math.max(
          0.5,
          Math.round(((updT - reqT) / (1000 * 60 * 60)) * 10) / 10
        );
      }
      return {
        id: r.id,
        requestCode: r.requestCode,
        requestType: "asset_borrow" as const,
        classification: subClass,
        requesterName: r.requesterName,
        department: r.department,
        status: r.status,
        itemsCount: items.length || 1,
        itemsSummary: summary || "Equipment Request",
        purpose: r.purpose,
        requestedAt: r.requestedAt.toISOString(),
        approvedAt: r.status !== "pending" ? r.requestedAt.toISOString() : null,
        fulfilledAt: r.status === "released" ? r.updatedAt.toISOString() : null,
        turnaroundHours,
      };
    });

    const mappedConsumableRows = filteredConsumableRows
      .filter(
        (r) =>
          !requestIdsWithAnyLine.has(r.id) ||
          (linesByRequest.get(r.id)?.length ?? 0) > 0
      )
      .map((r) => {
      const lineItems = linesByRequest.get(r.id) ?? [];
      const kind = deriveConsumableRequestKind(
        lineItems.map((l) => l.classification)
      );
      const summaryText =
        lineItems.length > 0
          ? lineItems.map((l) => `${l.itemName} (${toQty(l.qty)})`).join(", ")
          : r.purpose || (kind === "material" ? "Materials Requisition" : "Supplies Requisition");
      let turnaroundHours: number | null = null;
      if (r.releasedAt && r.requestedAt) {
        const reqT = new Date(r.requestedAt).getTime();
        const relT = new Date(r.releasedAt).getTime();
        turnaroundHours = Math.max(
          0.5,
          Math.round(((relT - reqT) / (1000 * 60 * 60)) * 10) / 10
        );
      }
      return {
        id: r.id,
        requestCode: r.requestCode,
        requestType: "consumable_issue" as const,
        classification: kind,
        requesterName: r.requesterName,
        department: r.department,
        status: r.status,
        itemsCount: lineItems.length || 1,
        itemsSummary: summaryText,
        purpose: r.purpose,
        requestedAt: r.requestedAt
          ? new Date(r.requestedAt).toISOString()
          : new Date().toISOString(),
        approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
        fulfilledAt: r.releasedAt ? new Date(r.releasedAt).toISOString() : null,
        turnaroundHours,
      };
    });

    const allCombined = [...mappedBorrowRows, ...mappedConsumableRows]
      .filter((r) => {
        if (!wantedClass || wantedClass === "all") return true;
        if (wantedClass === "asset" || wantedClass === "asset_borrow") {
          return r.requestType === "asset_borrow";
        }
        if (wantedClass === "supply" || wantedClass === "material" || wantedClass === "mixed") {
          if (r.requestType !== "consumable_issue") return false;
          return r.classification === wantedClass;
        }
        return r.classification === wantedClass;
      })
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

    let pendingCount = 0;
    let approvedCount = 0;
    let fulfilledCount = 0;
    let rejectedCount = 0;
    let supplyRequestsCount = 0;
    let materialRequestsCount = 0;
    let mixedRequestsCount = 0;
    let borrowRequestsCount = 0;
    let assignRequestsCount = 0;
    const deptMap = new Map<string, number>();
    let totalTurnaround = 0;
    let turnaroundCount = 0;

    for (const item of allCombined) {
      if (item.status === "pending") pendingCount += 1;
      else if (item.status === "approved") approvedCount += 1;
      else if (item.status === "released") fulfilledCount += 1;
      else if (item.status === "rejected") rejectedCount += 1;

      if (item.classification === "supply") supplyRequestsCount += 1;
      else if (item.classification === "material") materialRequestsCount += 1;
      else if (item.classification === "mixed") mixedRequestsCount += 1;
      else if (item.classification === "assignable") assignRequestsCount += 1;
      else borrowRequestsCount += 1;

      const dName = item.department || "General";
      deptMap.set(dName, (deptMap.get(dName) || 0) + 1);
      if (item.turnaroundHours != null) {
        totalTurnaround += item.turnaroundHours;
        turnaroundCount += 1;
      }
    }

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalRequests = allCombined.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const pagedData = allCombined.slice(offset, offset + pageSize);

    return {
      data: pagedData,
      total: totalRequests,
      page,
      pageSize,
      totalPages: Math.ceil(totalRequests / pageSize) || 1,
      summary: {
        totalRequests,
        pendingCount,
        approvedCount,
        fulfilledCount,
        rejectedCount,
        avgTurnaroundHours:
          turnaroundCount > 0
            ? Math.round((totalTurnaround / turnaroundCount) * 10) / 10
            : 0,
        supplyRequestsCount,
        materialRequestsCount,
        mixedRequestsCount,
        borrowRequestsCount,
        assignRequestsCount,
        departmentBreakdown,
      },
    };
  }

  // ─── 7. Maintenance & Repairs Report ──────────────────────────────────────

  async getMaintenanceReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(maintenanceLogs.tenantId, tenantId));
    }
    if (!filters.includeSandbox) {
      conditions.push(
        or(isNull(maintenanceLogs.assetId), eq(assets.isSandbox, false))!
      );
    }
    if (filters.category && filters.category !== "all") {
      conditions.push(eq(maintenanceLogs.category, filters.category));
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      conditions.push(
        or(
          eq(assets.department, filters.departmentId),
          ilike(assets.department, `%${filters.departmentId}%`),
          eq(maintenanceLogs.assignedToName, filters.departmentId),
          ilike(maintenanceLogs.assignedToName, `%${filters.departmentId}%`)
        )!
      );
    }
    if (filters.status === "resolved") {
      conditions.push(eq(maintenanceLogs.isResolved, true));
    } else if (filters.status === "open") {
      conditions.push(eq(maintenanceLogs.isResolved, false));
    }
    if (filters.startDate) {
      conditions.push(gte(maintenanceLogs.dateLogged, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(maintenanceLogs.dateLogged, filters.endDate));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(maintenanceLogs.logCode, q),
          ilike(maintenanceLogs.assetCode, q),
          ilike(maintenanceLogs.assetName, q),
          ilike(maintenanceLogs.notes, q),
          ilike(assets.department, q),
          ilike(maintenanceLogs.assignedToName, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [summaryRow] = await db
      .select({
        totalWorkOrders: sql<number>`count(*)::int`,
        openWorkOrders: sql<number>`count(case when ${maintenanceLogs.isResolved} = false then 1 end)::int`,
        resolvedWorkOrders: sql<number>`count(case when ${maintenanceLogs.isResolved} = true then 1 end)::int`,
        totalRepairSpend: sql<number>`coalesce(sum(${effectiveRepairCostSql()}), 0)::float`,
        avgMttrDays: sql<number>`coalesce(avg(case when ${maintenanceLogs.isResolved} = true and ${maintenanceLogs.resolutionDate} is not null then (${maintenanceLogs.resolutionDate}::date - ${maintenanceLogs.dateLogged}::date) end), 0)::float`,
      })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(whereClause);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: maintenanceLogs.id,
        logCode: maintenanceLogs.logCode,
        assetCode: maintenanceLogs.assetCode,
        assetName: maintenanceLogs.assetName,
        category: maintenanceLogs.category,
        department: sql<string | null>`coalesce(${assets.department}, ${maintenanceLogs.assignedToName})`,
        condition: maintenanceLogs.condition,
        source: maintenanceLogs.source,
        dateLogged: maintenanceLogs.dateLogged,
        isResolved: maintenanceLogs.isResolved,
        resolutionDate: maintenanceLogs.resolutionDate,
        repairCost: sql<number | null>`${maintenanceLogs.repairCost}::numeric::float`,
        loggedByName: maintenanceLogs.loggedByName,
        resolvedByName: maintenanceLogs.resolvedByName,
        notes: maintenanceLogs.notes,
        workNotes: maintenanceLogs.workNotes,
        resolutionNotes: maintenanceLogs.resolutionNotes,
        repairParts: maintenanceLogs.repairParts,
      })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(whereClause)
      .orderBy(desc(maintenanceLogs.dateLogged))
      .limit(pageSize)
      .offset(offset);

    // Top faulty assets respecting filter scope
    const topFaulty = await db
      .select({
        assetCode: maintenanceLogs.assetCode,
        name: maintenanceLogs.assetName,
        count: sql<number>`count(*)::int`,
        totalCost: sql<number>`coalesce(sum(${effectiveRepairCostSql()}), 0)::float`,
      })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(whereClause)
      .groupBy(maintenanceLogs.assetCode, maintenanceLogs.assetName)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Real condition breakdown
    const conditionBreakdownRows = await db
      .select({
        condition: maintenanceLogs.condition,
        count: sql<number>`count(*)::int`,
        cost: sql<number>`coalesce(sum(${effectiveRepairCostSql()}), 0)::float`,
      })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(whereClause)
      .groupBy(maintenanceLogs.condition)
      .orderBy(desc(sql`count(*)`));

    const total = summaryRow?.totalWorkOrders ?? 0;

    return {
      data: rows.map((r) => {
        let mttrDays: number | null = null;
        if (r.isResolved && r.resolutionDate && r.dateLogged) {
          const d1 = new Date(r.dateLogged).getTime();
          const d2 = new Date(r.resolutionDate).getTime();
          mttrDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        }

        return {
          ...r,
          workNotes: r.workNotes ?? null,
          resolutionNotes: r.resolutionNotes ?? null,
          repairParts: Array.isArray(r.repairParts) ? r.repairParts : [],
          repairCost: effectiveRepairAmount(r.repairCost, r.repairParts),
          mttrDays,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalWorkOrders: total,
        openWorkOrders: summaryRow?.openWorkOrders ?? 0,
        resolvedWorkOrders: summaryRow?.resolvedWorkOrders ?? 0,
        totalRepairSpend: summaryRow?.totalRepairSpend ?? 0,
        avgMttrDays: Math.round((summaryRow?.avgMttrDays ?? 0) * 10) / 10,
        topFaultyAssets: topFaulty,
        conditionBreakdown: conditionBreakdownRows.map((c) => ({
          condition: c.condition,
          count: c.count,
          cost: c.cost,
        })),
      },
    };
  }

  // ─── 8. Projects Report ───────────────────────────────────────────────────

  async getProjectsReport(filters: BaseReportQuery, explicitTenantId?: string): Promise<{
    data: ProjectReportRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: ProjectReportSummary;
  }> {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(projects.tenantId, tenantId));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(
          projects.status,
          filters.status as (typeof projectStatusEnum.enumValues)[number]
        )
      );
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      const deptVal = filters.departmentId.trim();
      if (isUuid(deptVal)) {
        const [deptRow] = await db
          .select({ name: departments.name, code: departments.code })
          .from(departments)
          .where(
            and(
              eq(departments.id, deptVal),
              ...(tenantId ? [eq(departments.tenantId, tenantId)] : [])
            )
          )
          .limit(1);
        if (deptRow) {
          conditions.push(
            or(
              ilike(projects.department, `%${deptRow.name}%`),
              ilike(projects.department, `%${deptRow.code}%`)
            )!
          );
        } else {
          conditions.push(eq(projects.department, deptVal));
        }
      } else {
        conditions.push(
          or(
            eq(projects.department, deptVal),
            ilike(projects.department, `%${deptVal}%`)
          )!
        );
      }
    }
    if (filters.startDate) {
      conditions.push(
        sql`coalesce(${projects.startDate}, ${projects.createdAt}::date::text) >= ${filters.startDate}`
      );
    }
    if (filters.endDate) {
      conditions.push(
        sql`coalesce(${projects.startDate}, ${projects.createdAt}::date::text) <= ${filters.endDate}`
      );
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(projects.projectCode, q),
          ilike(projects.name, q),
          ilike(projects.location, q),
          ilike(projects.department, q),
          ilike(projects.description, q),
          ilike(projects.createdByName, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;
    // Nest line items for list/detail pages; skip for large CSV export pages.
    const includeLineItems = pageSize <= 100;

    const wantedClass = filters.classification?.trim().toLowerCase();
    const classCond = consumableClassFilterSql(filters.classification);
    const categoryCond =
      filters.category && filters.category !== "all"
        ? sql`lower(trim(${consumables.category})) = ${filters.category.trim().toLowerCase()}`
        : undefined;
    const nonSandboxAssetCond = filters.includeSandbox ? undefined : eq(assets.isSandbox, false);
    const nonSandboxConsCond = filters.includeSandbox ? undefined : eq(consumables.isSandbox, false);

    // Effective classification SQL for project_expense_lines left-joined with consumables:
    // manual lines (consumableId IS NULL & lineType='material') are always 'material'.
    const expenseIsMaterialSql = sql`(
      (${projectExpenseLines.consumableId} is not null and lower(trim(coalesce(${consumables.classification}, ''))) = 'material')
      or (${projectExpenseLines.consumableId} is null and ${projectExpenseLines.lineType} = 'material')
    )`;
    const expenseIsStockSql = sql`${projectExpenseLines.lineType} in ('consumable', 'material')`;
    const expenseClassMatchSql =
      wantedClass === "material"
        ? sql`${expenseIsStockSql} and ${expenseIsMaterialSql}`
        : wantedClass === "supply"
          ? sql`${expenseIsStockSql} and not ${expenseIsMaterialSql}`
          : expenseIsStockSql;
    const expenseDateConds: SQL[] = [
      ...(filters.startDate ? [gte(projectExpenseLines.incurredOn, filters.startDate)] : []),
      ...(filters.endDate ? [lte(projectExpenseLines.incurredOn, filters.endDate)] : []),
    ];

    const allocIsMaterialSql = sql`lower(trim(coalesce(${consumables.classification}, ''))) = 'material'`;
    const allocConds: SQL[] = [
      inArray(consumableRequests.status, ["approved", "released"]),
      nonVoidedAllocationCondition(),
      ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
      ...(nonSandboxConsCond ? [nonSandboxConsCond] : []),
      ...(classCond ? [classCond] : []),
      ...(categoryCond ? [categoryCond] : []),
      ...(filters.startDate
        ? [gte(sql`${consumableRequestReleaseAllocations.releasedAt}::date`, filters.startDate)]
        : []),
      ...(filters.endDate
        ? [lte(sql`${consumableRequestReleaseAllocations.releasedAt}::date`, filters.endDate)]
        : []),
    ];

    const [
      [statusSummary],
      [assetRollup],
      [expenseRollup],
      [releasedRollup],
      rows,
    ] = await Promise.all([
      db
        .select({
          totalProjects: sql<number>`count(*)::int`,
          activeProjects: sql<number>`count(case when ${projects.status} = 'active' then 1 end)::int`,
          completedProjects: sql<number>`count(case when ${projects.status} = 'completed' then 1 end)::int`,
        })
        .from(projects)
        .where(whereClause),
      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(projectAssetAssignments)
        .innerJoin(projects, eq(projectAssetAssignments.projectId, projects.id))
        .innerJoin(assets, eq(projectAssetAssignments.assetId, assets.id))
        .where(
          and(
            ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : []),
            ...(nonSandboxAssetCond ? [nonSandboxAssetCond] : []),
            whereClause
          )
        ),
      db
        .select({
          consumablesCount: sql<number>`coalesce(sum(case when ${expenseClassMatchSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
          suppliesCount: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and not ${expenseIsMaterialSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
          materialsCount: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and ${expenseIsMaterialSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
          totalCost: sql<number>`coalesce(sum(${projectExpenseLines.amount}::numeric), 0)::float`,
        })
        .from(projectExpenseLines)
        .innerJoin(projects, eq(projectExpenseLines.projectId, projects.id))
        .leftJoin(consumables, eq(projectExpenseLines.consumableId, consumables.id))
        .where(
          and(
            ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : []),
            ...(filters.includeSandbox
              ? []
              : [or(isNull(projectExpenseLines.consumableId), eq(consumables.isSandbox, false))!]),
            ...expenseDateConds,
            whereClause
          )
        ),
      db
        .select({
          count: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
          value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
          suppliesCount: sql<number>`coalesce(sum(case when not ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
          materialsCount: sql<number>`coalesce(sum(case when ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
        })
        .from(consumableRequests)
        .innerJoin(
          consumableRequestReleaseAllocations,
          eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
        )
        .innerJoin(
          consumables,
          eq(consumableRequestReleaseAllocations.consumableId, consumables.id)
        )
        .innerJoin(projects, eq(consumableRequests.projectId, projects.id))
        .where(and(...allocConds, whereClause)),
      db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          projectName: projects.name,
          department: projects.department,
          status: projects.status,
          startDate: projects.startDate,
          endDate: projects.endDate,
          managerName: projects.createdByName,
          description: projects.description,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(whereClause)
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const totalProjects = statusSummary?.totalProjects ?? 0;
    const activeProjects = statusSummary?.activeProjects ?? 0;
    const completedProjects = statusSummary?.completedProjects ?? 0;
    const totalAssetsAssigned = assetRollup?.total ?? 0;
    const totalSuppliesConsumed =
      (wantedClass === "material" ? 0 : expenseRollup?.suppliesCount ?? 0) +
      (releasedRollup?.suppliesCount ?? 0);
    const totalMaterialsConsumed =
      (wantedClass === "supply" ? 0 : expenseRollup?.materialsCount ?? 0) +
      (releasedRollup?.materialsCount ?? 0);
    const totalConsumablesConsumed =
      (expenseRollup?.consumablesCount ?? 0) + (releasedRollup?.count ?? 0);
    const totalProjectSpend =
      (expenseRollup?.totalCost ?? 0) + (releasedRollup?.value ?? 0);

    const rowIds = rows.map((r) => r.id);

    const emptyAgg = {
      assetCounts: [] as { projectId: string; count: number }[],
      expenseStats: [] as {
        projectId: string;
        consumablesCount: number;
        consumablesValue: number;
        suppliesCount: number;
        suppliesValue: number;
        materialsCount: number;
        materialsValue: number;
        totalCost: number;
      }[],
      releasedConsumables: [] as {
        projectId: string | null;
        count: number;
        value: number;
        suppliesCount: number;
        suppliesValue: number;
        materialsCount: number;
        materialsValue: number;
      }[],
      assignedAssetsData: [] as {
        projectId: string;
        id: string;
        assetCode: string;
        name: string;
        category: string;
        status: string;
        serialNumber: string | null;
        value: number;
        location: string;
        assignedAt: string;
        assignedByName: string | null;
      }[],
      expenseRows: [] as {
        projectId: string;
        id: string;
        lineType: string;
        description: string;
        amount: number;
        quantity: number;
        unitCost: number;
        consumableId: string | null;
        consumableCode: string | null;
        consumableName: string | null;
        consumableCategory: string | null;
        consumableClassification: string | null;
        consumableUnit: string | null;
        metadata: { consumableCode?: string; consumableName?: string; consumableUnit?: string } | null;
        incurredOn: string | null;
        category: string;
      }[],
      releasedReqRows: [] as {
        projectId: string | null;
        id: string;
        requestCode: string;
        itemCode: string;
        name: string;
        category: string;
        classification: string;
        quantity: number;
        unit: string;
        unitCost: number;
        totalCost: number;
        incurredOn: string;
        purpose: string | null;
      }[],
    };

    const pageData =
      rowIds.length === 0
        ? emptyAgg
        : await (async () => {
            const [
              assetCounts,
              expenseStats,
              releasedConsumables,
              assignedAssetsData,
              expenseRows,
              releasedReqRows,
            ] = await Promise.all([
              db
                .select({
                  projectId: projectAssetAssignments.projectId,
                  count: sql<number>`count(*)::int`,
                })
                .from(projectAssetAssignments)
                .innerJoin(assets, eq(projectAssetAssignments.assetId, assets.id))
                .where(
                  and(
                    inArray(projectAssetAssignments.projectId, rowIds),
                    ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : []),
                    ...(nonSandboxAssetCond ? [nonSandboxAssetCond] : [])
                  )
                )
                .groupBy(projectAssetAssignments.projectId),
              db
                .select({
                  projectId: projectExpenseLines.projectId,
                  consumablesCount: sql<number>`coalesce(sum(case when ${expenseClassMatchSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
                  consumablesValue: sql<number>`coalesce(sum(case when ${expenseClassMatchSql} then ${projectExpenseLines.amount}::numeric else 0 end), 0)::float`,
                  suppliesCount: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and not ${expenseIsMaterialSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
                  suppliesValue: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and not ${expenseIsMaterialSql} then ${projectExpenseLines.amount}::numeric else 0 end), 0)::float`,
                  materialsCount: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and ${expenseIsMaterialSql} then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
                  materialsValue: sql<number>`coalesce(sum(case when ${expenseIsStockSql} and ${expenseIsMaterialSql} then ${projectExpenseLines.amount}::numeric else 0 end), 0)::float`,
                  totalCost: sql<number>`coalesce(sum(${projectExpenseLines.amount}::numeric), 0)::float`,
                })
                .from(projectExpenseLines)
                .leftJoin(consumables, eq(projectExpenseLines.consumableId, consumables.id))
                .where(
                  and(
                    inArray(projectExpenseLines.projectId, rowIds),
                    ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : []),
                    ...(filters.includeSandbox
                      ? []
                      : [or(isNull(projectExpenseLines.consumableId), eq(consumables.isSandbox, false))!]),
                    ...expenseDateConds
                  )
                )
                .groupBy(projectExpenseLines.projectId),
              db
                .select({
                  projectId: consumableRequests.projectId,
                  count: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
                  value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
                  suppliesCount: sql<number>`coalesce(sum(case when not ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
                  suppliesValue: sql<number>`coalesce(sum(case when not ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.lineTotal}::numeric else 0 end), 0)::float`,
                  materialsCount: sql<number>`coalesce(sum(case when ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
                  materialsValue: sql<number>`coalesce(sum(case when ${allocIsMaterialSql} then ${consumableRequestReleaseAllocations.lineTotal}::numeric else 0 end), 0)::float`,
                })
                .from(consumableRequests)
                .innerJoin(
                  consumableRequestReleaseAllocations,
                  eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
                )
                .innerJoin(
                  consumables,
                  eq(consumableRequestReleaseAllocations.consumableId, consumables.id)
                )
                .where(and(...allocConds, inArray(consumableRequests.projectId, rowIds)))
                .groupBy(consumableRequests.projectId),
              includeLineItems
                ? db
                    .select({
                      projectId: projectAssetAssignments.projectId,
                      id: assets.id,
                      assetCode: assets.assetCode,
                      name: assets.name,
                      category: assets.category,
                      status: assets.status,
                      serialNumber: assets.serialNumber,
                      value: sql<number>`coalesce(${assets.value}::numeric, 0)::float`,
                      location: assets.location,
                      assignedAt: sql<string>`${projectAssetAssignments.assignedAt}::text`,
                      assignedByName: projectAssetAssignments.assignedByName,
                    })
                    .from(projectAssetAssignments)
                    .innerJoin(assets, eq(projectAssetAssignments.assetId, assets.id))
                    .where(
                      and(
                        inArray(projectAssetAssignments.projectId, rowIds),
                        eq(projectAssetAssignments.status, "assigned"),
                        ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : []),
                        ...(nonSandboxAssetCond ? [nonSandboxAssetCond] : [])
                      )
                    )
                : Promise.resolve([] as typeof emptyAgg.assignedAssetsData),
              includeLineItems
                ? db
                    .select({
                      projectId: projectExpenseLines.projectId,
                      id: projectExpenseLines.id,
                      lineType: projectExpenseLines.lineType,
                      description: projectExpenseLines.description,
                      amount: sql<number>`${projectExpenseLines.amount}::float`,
                      quantity: sql<number>`coalesce(${projectExpenseLines.quantity}::float, 1)`,
                      unitCost: sql<number>`coalesce(${projectExpenseLines.unitCost}::float, 0)`,
                      consumableId: projectExpenseLines.consumableId,
                      consumableCode: consumables.itemCode,
                      consumableName: consumables.name,
                      consumableCategory: consumables.category,
                      consumableClassification: consumables.classification,
                      consumableUnit: consumables.unit,
                      metadata: projectExpenseLines.metadata,
                      incurredOn: projectExpenseLines.incurredOn,
                      category: projectExpenseLines.category,
                    })
                    .from(projectExpenseLines)
                    .leftJoin(consumables, eq(projectExpenseLines.consumableId, consumables.id))
                    .where(
                      and(
                        inArray(projectExpenseLines.projectId, rowIds),
                        // Exclude non-inventory "miscellaneous" lines (travel/labor/fees) from stock ledger
                        inArray(projectExpenseLines.lineType, ["consumable", "material"]),
                        ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : []),
                        ...(filters.includeSandbox
                          ? []
                          : [or(isNull(projectExpenseLines.consumableId), eq(consumables.isSandbox, false))!]),
                        ...expenseDateConds,
                        ...(categoryCond ? [categoryCond] : [])
                      )
                    )
                : Promise.resolve([] as typeof emptyAgg.expenseRows),
              includeLineItems
                ? db
                    .select({
                      projectId: consumableRequests.projectId,
                      id: consumableRequestReleaseAllocations.id,
                      requestCode: consumableRequests.requestCode,
                      itemCode: consumables.itemCode,
                      name: consumables.name,
                      category: consumables.category,
                      classification: normalizedConsumableClassSql(),
                      quantity: sql<number>`${consumableRequestReleaseAllocations.quantity}`,
                      unit: consumables.unit,
                      unitCost: sql<number>`${consumableRequestReleaseAllocations.unitCost}::float`,
                      totalCost: sql<number>`${consumableRequestReleaseAllocations.lineTotal}::float`,
                      incurredOn: sql<string>`${consumableRequestReleaseAllocations.releasedAt}::text`,
                      purpose: consumableRequests.purpose,
                    })
                    .from(consumableRequests)
                    .innerJoin(
                      consumableRequestReleaseAllocations,
                      eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
                    )
                    .innerJoin(
                      consumables,
                      eq(consumableRequestReleaseAllocations.consumableId, consumables.id)
                    )
                    .where(and(...allocConds, inArray(consumableRequests.projectId, rowIds)))
                : Promise.resolve([] as typeof emptyAgg.releasedReqRows),
            ]);

            return {
              assetCounts,
              expenseStats,
              releasedConsumables,
              assignedAssetsData,
              expenseRows,
              releasedReqRows,
            };
          })();

    const assetCountMap = new Map(pageData.assetCounts.map((a) => [a.projectId, a.count]));
    const expenseMap = new Map(pageData.expenseStats.map((e) => [e.projectId, e]));
    const releasedConsumablesMap = new Map(
      pageData.releasedConsumables
        .filter((r) => r.projectId !== null)
        .map((r) => [r.projectId as string, r])
    );

    const projectAssetsMap = new Map<string, AssignedAssetItem[]>();
    for (const item of pageData.assignedAssetsData) {
      let list = projectAssetsMap.get(item.projectId);
      if (!list) {
        list = [];
        projectAssetsMap.set(item.projectId, list);
      }
      list.push({
        id: item.id,
        assetCode: item.assetCode,
        name: item.name,
        category: item.category,
        status: item.status,
        serialNumber: item.serialNumber,
        value: item.value,
        location: item.location,
        assignedAt: item.assignedAt?.split("T")[0] || item.assignedAt,
        assignedByName: item.assignedByName,
      });
    }

    const projectSuppliesMap = new Map<string, ConsumedSupplyItem[]>();
    for (const e of pageData.expenseRows) {
      const resolvedClass = e.consumableId
        ? normalizeConsumableClassification(e.consumableClassification)
        : e.lineType === "material"
          ? ("material" as const)
          : ("supply" as const);
      if (
        (wantedClass === "material" || wantedClass === "supply") &&
        resolvedClass !== wantedClass
      ) {
        continue;
      }
      let list = projectSuppliesMap.get(e.projectId);
      if (!list) {
        list = [];
        projectSuppliesMap.set(e.projectId, list);
      }
      list.push({
        id: e.id,
        itemCode: e.consumableCode || e.metadata?.consumableCode || "MAT-MANUAL",
        name: e.consumableName || e.metadata?.consumableName || e.description,
        category: e.consumableCategory || e.category,
        classification: resolvedClass,
        source:
          e.lineType === "material" && !e.consumableId
            ? "manual_material"
            : "inventory",
        referenceCode: null,
        quantity: e.quantity,
        unit: e.consumableUnit || e.metadata?.consumableUnit || "units",
        unitCost: e.unitCost,
        totalCost: e.amount,
        incurredOn: e.incurredOn,
        purpose: e.description,
      });
    }
    for (const reqItem of pageData.releasedReqRows) {
      if (!reqItem.projectId) continue;
      const resolvedClass = normalizeConsumableClassification(reqItem.classification);
      let list = projectSuppliesMap.get(reqItem.projectId);
      if (!list) {
        list = [];
        projectSuppliesMap.set(reqItem.projectId, list);
      }
      list.push({
        id: reqItem.id,
        itemCode: reqItem.itemCode,
        name: reqItem.name,
        category: reqItem.category,
        classification: resolvedClass,
        source: "request",
        referenceCode: reqItem.requestCode,
        quantity: reqItem.quantity,
        unit: reqItem.unit,
        unitCost: reqItem.unitCost,
        totalCost: reqItem.totalCost,
        incurredOn: reqItem.incurredOn?.split("T")[0] || reqItem.incurredOn,
        purpose: reqItem.purpose,
      });
    }

    const data: ProjectReportRow[] = rows.map((r) => {
      const aCount = assetCountMap.get(r.id) ?? 0;
      const exp = expenseMap.get(r.id);
      const req = releasedConsumablesMap.get(r.id);

      const suppliesConsumedCount =
        (wantedClass === "material" ? 0 : exp?.suppliesCount ?? 0) +
        (req?.suppliesCount ?? 0);
      const suppliesValue =
        (wantedClass === "material" ? 0 : exp?.suppliesValue ?? 0) +
        (req?.suppliesValue ?? 0);
      const materialsConsumedCount =
        (wantedClass === "supply" ? 0 : exp?.materialsCount ?? 0) +
        (req?.materialsCount ?? 0);
      const materialsValue =
        (wantedClass === "supply" ? 0 : exp?.materialsValue ?? 0) +
        (req?.materialsValue ?? 0);

      const consumablesConsumedCount = (exp?.consumablesCount ?? 0) + (req?.count ?? 0);
      const consumablesValue = (exp?.consumablesValue ?? 0) + (req?.value ?? 0);
      const totalProjectCost = (exp?.totalCost ?? 0) + (req?.value ?? 0);
      const sortedItems = (projectSuppliesMap.get(r.id) ?? []).sort((a, b) =>
        (b.incurredOn ?? "").localeCompare(a.incurredOn ?? "")
      );

      return {
        id: r.id,
        projectCode: r.projectCode,
        projectName: r.projectName,
        department: r.department || "General",
        status: (r.status === "draft" ? "on_hold" : r.status) as
          | "active"
          | "completed"
          | "on_hold"
          | "cancelled",
        startDate: r.startDate ?? "",
        endDate: r.endDate ?? null,
        assignedAssetsCount: aCount,
        consumablesConsumedCount,
        consumablesValue,
        suppliesConsumedCount,
        suppliesValue,
        materialsConsumedCount,
        materialsValue,
        totalProjectCost,
        managerName: r.managerName ?? null,
        description: r.description ?? null,
        ...(includeLineItems
          ? {
              assignedAssets: projectAssetsMap.get(r.id) ?? [],
              consumedSupplies: sortedItems,
            }
          : {}),
      };
    });

    return {
      data,
      total: totalProjects,
      page,
      pageSize,
      totalPages: Math.ceil(totalProjects / pageSize) || 1,
      summary: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalAssetsAssigned,
        totalConsumablesConsumed,
        totalSuppliesConsumed,
        totalMaterialsConsumed,
        totalProjectSpend,
      },
    };
  }

  // ─── 9. Departments Report ────────────────────────────────────────────────

  async getDepartmentsReport(filters: BaseReportQuery, explicitTenantId?: string): Promise<{
    data: DepartmentReportRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: DepartmentReportSummary;
  }> {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(departments.tenantId, tenantId));
    }
    if (!filters.includeSandbox) {
      conditions.push(eq(departments.isSandbox, false));
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      const deptVal = filters.departmentId.trim();
      conditions.push(
        isUuid(deptVal)
          ? eq(departments.id, deptVal)
          : or(ilike(departments.name, deptVal), ilike(departments.code, deptVal))!
      );
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(or(ilike(departments.name, q), ilike(departments.code, q))!);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const includeLineItems = pageSize <= 100;

    const classCond = consumableClassFilterSql(filters.classification);
    const categoryCond =
      filters.category && filters.category !== "all"
        ? sql`lower(trim(${consumables.category})) = ${filters.category.trim().toLowerCase()}`
        : undefined;
    const nonSandboxConsCond = filters.includeSandbox ? undefined : eq(consumables.isSandbox, false);
    const nonSandboxAssetCond = filters.includeSandbox ? undefined : eq(assets.isSandbox, false);

    const assetConditions: SQL[] = [];
    if (tenantId) {
      assetConditions.push(eq(assets.tenantId, tenantId));
    }
    if (nonSandboxAssetCond) {
      assetConditions.push(nonSandboxAssetCond);
    }
    if (filters.startDate) {
      assetConditions.push(
        sql`coalesce(${assets.purchaseDate}, ${assets.createdAt}::date::text) >= ${filters.startDate}`
      );
    }
    if (filters.endDate) {
      assetConditions.push(
        sql`coalesce(${assets.purchaseDate}, ${assets.createdAt}::date::text) <= ${filters.endDate}`
      );
    }
    const assetWhere = assetConditions.length ? and(...assetConditions) : undefined;

    const crConditions: SQL[] = [
      inArray(consumableRequests.status, ["approved", "released"]),
      nonVoidedAllocationCondition(),
      ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
      ...(nonSandboxConsCond ? [nonSandboxConsCond] : []),
      ...(classCond ? [classCond] : []),
      ...(categoryCond ? [categoryCond] : []),
    ];
    if (filters.startDate) {
      crConditions.push(
        gte(sql`${consumableRequestReleaseAllocations.releasedAt}::date`, filters.startDate)
      );
    }
    if (filters.endDate) {
      crConditions.push(
        lte(sql`${consumableRequestReleaseAllocations.releasedAt}::date`, filters.endDate)
      );
    }

    const directMoveConditions: SQL[] = [
      ...nonVoidedOutIssueConditions(),
      isNull(stockMovements.requestId),
      isNotNull(stockMovements.departmentId),
      ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : []),
      ...(nonSandboxConsCond ? [nonSandboxConsCond] : []),
      ...(classCond ? [classCond] : []),
      ...(categoryCond ? [categoryCond] : []),
    ];
    if (filters.startDate) {
      directMoveConditions.push(gte(sql`${stockMovements.createdAt}::date`, filters.startDate));
    }
    if (filters.endDate) {
      directMoveConditions.push(lte(sql`${stockMovements.createdAt}::date`, filters.endDate));
    }

    const isMaterialSql = sql`lower(trim(coalesce(${consumables.classification}, ''))) = 'material'`;

    const [
      [countRow],
      allDepts,
      pagedDepts,
      assetAggRows,
      maintAggRows,
      consumableStats,
      directIssueStats,
      activeProjects,
    ] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(departments)
        .where(whereClause),
      // Light list for summary matching (departments are small vs full asset inventory)
      db
        .select({
          id: departments.id,
          code: departments.code,
          name: departments.name,
        })
        .from(departments)
        .where(whereClause)
        .orderBy(asc(departments.name)),
      db
        .select({
          id: departments.id,
          code: departments.code,
          name: departments.name,
        })
        .from(departments)
        .where(whereClause)
        .orderBy(asc(departments.name))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          deptKey: sql<string>`lower(trim(${assets.department}))`,
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
          topCodes: sql<string[]>`(array_agg(${assets.assetCode} order by ${assets.assetCode}))[1:5]`,
        })
        .from(assets)
        .where(and(sql`${assets.department} is not null`, assetWhere))
        .groupBy(sql`lower(trim(${assets.department}))`),
      db
        .select({
          deptKey: sql<string>`lower(trim(${assets.department}))`,
          count: sql<number>`count(distinct ${maintenanceLogs.assetId})::int`,
        })
        .from(maintenanceLogs)
        .innerJoin(assets, eq(maintenanceLogs.assetId, assets.id))
        .where(
          and(
            eq(maintenanceLogs.isResolved, false),
            sql`${assets.department} is not null`,
            ...(filters.includeSandbox ? [] : [eq(assets.isSandbox, false)]),
            ...(tenantId
              ? [eq(maintenanceLogs.tenantId, tenantId), eq(assets.tenantId, tenantId)]
              : []),
            ...(filters.startDate ? [gte(maintenanceLogs.dateLogged, filters.startDate)] : []),
            ...(filters.endDate ? [lte(maintenanceLogs.dateLogged, filters.endDate)] : [])
          )
        )
        .groupBy(sql`lower(trim(${assets.department}))`),
      db
        .select({
          departmentId: consumableRequests.departmentId,
          departmentName: consumableRequests.department,
          quantity: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
          value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
          suppliesQty: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
          suppliesVal: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${consumableRequestReleaseAllocations.lineTotal}::numeric else 0 end), 0)::float`,
          materialsQty: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${consumableRequestReleaseAllocations.quantity} else 0 end), 0)::float`,
          materialsVal: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${consumableRequestReleaseAllocations.lineTotal}::numeric else 0 end), 0)::float`,
        })
        .from(consumableRequests)
        .innerJoin(
          consumableRequestReleaseAllocations,
          eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
        )
        .innerJoin(
          consumables,
          eq(consumableRequestReleaseAllocations.consumableId, consumables.id)
        )
        .where(and(...crConditions))
        .groupBy(consumableRequests.departmentId, consumableRequests.department),
      db
        .select({
          departmentId: stockMovements.departmentId,
          quantity: sql<number>`coalesce(sum(${stockMovements.qty}::numeric), 0)::float`,
          value: sql<number>`coalesce(sum(${effectiveMovementValueSql()}), 0)::float`,
          suppliesQty: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
          suppliesVal: sql<number>`coalesce(sum(case when not ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
          materialsQty: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${stockMovements.qty}::numeric else 0 end), 0)::float`,
          materialsVal: sql<number>`coalesce(sum(case when ${isMaterialSql} then ${effectiveMovementValueSql()} else 0 end), 0)::float`,
        })
        .from(stockMovements)
        .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
        .where(and(...directMoveConditions))
        .groupBy(stockMovements.departmentId),
      db
        .select({
          department: projects.department,
          count: sql<number>`count(*)::int`,
        })
        .from(projects)
        .where(
          and(
            eq(projects.status, "active"),
            ...(tenantId ? [eq(projects.tenantId, tenantId)] : [])
          )
        )
        .groupBy(projects.department),
    ]);

    const assetAggMap = new Map(
      assetAggRows
        .filter((r) => r.deptKey)
        .map((r) => [
          r.deptKey,
          {
            count: r.count,
            value: r.value,
            topCodes: Array.isArray(r.topCodes) ? r.topCodes.slice(0, 5) : [],
          },
        ])
    );
    const maintAggMap = new Map(
      maintAggRows.filter((r) => r.deptKey).map((r) => [r.deptKey, r.count])
    );

    const resolveAssetEntry = (d: { id: string; code: string; name: string }) =>
      assetAggMap.get(d.name.toLowerCase()) ||
      assetAggMap.get(d.code.toLowerCase()) ||
      assetAggMap.get(d.id.toLowerCase());

    const resolveMaintCount = (d: { id: string; code: string; name: string }) =>
      maintAggMap.get(d.name.toLowerCase()) ||
      maintAggMap.get(d.code.toLowerCase()) ||
      maintAggMap.get(d.id.toLowerCase()) ||
      0;

    const resolveConsumables = (d: { id: string; code: string; name: string }) => {
      let cCount = 0;
      let cVal = 0;
      let sCount = 0;
      let sVal = 0;
      let mCount = 0;
      let mVal = 0;
      for (const cs of consumableStats) {
        const matchesDept = cs.departmentId
          ? cs.departmentId === d.id
          : cs.departmentName.toLowerCase() === d.name.toLowerCase() ||
            cs.departmentName.toLowerCase() === d.code.toLowerCase();
        if (matchesDept) {
          cCount += cs.quantity;
          cVal += cs.value;
          sCount += cs.suppliesQty;
          sVal += cs.suppliesVal;
          mCount += cs.materialsQty;
          mVal += cs.materialsVal;
        }
      }
      for (const di of directIssueStats) {
        if (di.departmentId === d.id) {
          cCount += di.quantity;
          cVal += di.value;
          sCount += di.suppliesQty;
          sVal += di.suppliesVal;
          mCount += di.materialsQty;
          mVal += di.materialsVal;
        }
      }
      return { cCount, cVal, sCount, sVal, mCount, mVal };
    };

    const resolveActiveProjects = (d: { id: string; code: string; name: string }) => {
      let activeProjectsCount = 0;
      for (const ap of activeProjects) {
        if (
          ap.department?.toLowerCase() === d.name.toLowerCase() ||
          ap.department?.toLowerCase() === d.code.toLowerCase()
        ) {
          activeProjectsCount += ap.count;
        }
      }
      return activeProjectsCount;
    };

    let totalAssetsDeployed = 0;
    let totalAssetsValue = 0;
    let totalConsumablesConsumed = 0;
    let totalConsumablesValue = 0;
    let totalSuppliesConsumed = 0;
    let totalSuppliesValue = 0;
    let totalMaterialsConsumed = 0;
    let totalMaterialsValue = 0;
    let maxAssetsCount = -1;
    let mostActiveByAssets: string | null = null;

    for (const d of allDepts) {
      const assetEntry = resolveAssetEntry(d);
      const assetsAssignedCount = assetEntry?.count ?? 0;
      const assetsVal = assetEntry?.value ?? 0;
      const { cCount, cVal, sCount, sVal, mCount, mVal } = resolveConsumables(d);

      totalAssetsDeployed += assetsAssignedCount;
      totalAssetsValue += assetsVal;
      totalConsumablesConsumed += cCount;
      totalConsumablesValue += cVal;
      totalSuppliesConsumed += sCount;
      totalSuppliesValue += sVal;
      totalMaterialsConsumed += mCount;
      totalMaterialsValue += mVal;

      if (assetsAssignedCount > maxAssetsCount && assetsAssignedCount > 0) {
        maxAssetsCount = assetsAssignedCount;
        mostActiveByAssets = d.name;
      }
    }

    const totalDepartments = countRow?.total ?? allDepts.length;

    // Itemization only for paged department keys
    const pagedDeptIds = pagedDepts.map((d) => d.id);
    const pagedDeptKeys = [
      ...new Set(
        pagedDepts.flatMap((d) => [
          d.name.toLowerCase(),
          d.code.toLowerCase(),
          d.id.toLowerCase(),
        ])
      ),
    ];

    const [itemizedAssets, itemizedConsumables, itemizedDirectIssues] =
      includeLineItems && pagedDeptIds.length > 0
        ? await Promise.all([
            db
              .select({
                id: assets.id,
                assetCode: assets.assetCode,
                name: assets.name,
                category: assets.category,
                department: assets.department,
                status: assets.status,
                serialNumber: assets.serialNumber,
                location: assets.location,
                value: sql<number>`coalesce(${assets.value}::numeric, 0)::float`,
              })
              .from(assets)
              .where(
                and(
                  assetWhere,
                  inArray(sql`lower(trim(${assets.department}))`, pagedDeptKeys)
                )
              ),
            db
              .select({
                departmentId: consumableRequests.departmentId,
                departmentName: consumableRequests.department,
                id: consumableRequestReleaseAllocations.id,
                requestCode: consumableRequests.requestCode,
                itemCode: consumables.itemCode,
                name: consumables.name,
                category: consumables.category,
                classification: normalizedConsumableClassSql(),
                quantity: sql<number>`${consumableRequestReleaseAllocations.quantity}`,
                unit: consumables.unit,
                unitCost: sql<number>`${consumableRequestReleaseAllocations.unitCost}::float`,
                totalCost: sql<number>`${consumableRequestReleaseAllocations.lineTotal}::float`,
                incurredOn: sql<string>`${consumableRequestReleaseAllocations.releasedAt}::text`,
                purpose: consumableRequests.purpose,
              })
              .from(consumableRequests)
              .innerJoin(
                consumableRequestReleaseAllocations,
                eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
              )
              .innerJoin(
                consumables,
                eq(consumableRequestReleaseAllocations.consumableId, consumables.id)
              )
              .where(
                and(
                  ...crConditions,
                  or(
                    inArray(consumableRequests.departmentId, pagedDeptIds),
                    inArray(sql`lower(${consumableRequests.department})`, pagedDeptKeys)
                  )
                )
              ),
            db
              .select({
                departmentId: stockMovements.departmentId,
                id: stockMovements.id,
                movementCode: stockMovements.movementCode,
                itemCode: consumables.itemCode,
                name: consumables.name,
                category: consumables.category,
                classification: normalizedConsumableClassSql(),
                quantity: sql<number>`${stockMovements.qty}::float`,
                unit: consumables.unit,
                unitCost: sql<number | null>`${stockMovements.unitCost}::float`,
                totalCost: sql<number | null>`${effectiveMovementValueSql()}::float`,
                incurredOn: sql<string>`${stockMovements.createdAt}::text`,
                purpose: stockMovements.notes,
              })
              .from(stockMovements)
              .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
              .where(
                and(
                  ...directMoveConditions,
                  inArray(stockMovements.departmentId, pagedDeptIds)
                )
              ),
          ])
        : [[], [], []];

    // ─── Maintenance logs for paged dept assets ───────────────────────────────
    const pagedAssetIds = itemizedAssets.map((a) => a.id);
    let rawMaintenanceLogs: Array<{
      assetId: string | null;
      id: string;
      logCode: string;
      assetCode: string;
      assetName: string;
      condition: string;
      source: string;
      notes: string;
      workNotes: string | null;
      resolutionNotes: string | null;
      dateLogged: string;
      resolutionDate: string | null;
      isResolved: boolean;
      repairCost: number | null;
      totalCost: number | null;
      mttrDays: number | null;
      loggedByName: string;
      resolvedByName: string | null;
      repairParts: Array<{ name: string; cost: string | null }>;
    }> = [];

    if (includeLineItems && pagedAssetIds.length > 0) {
      rawMaintenanceLogs = await db
        .select({
          assetId: maintenanceLogs.assetId,
          id: maintenanceLogs.id,
          logCode: maintenanceLogs.logCode,
          assetCode: maintenanceLogs.assetCode,
          assetName: maintenanceLogs.assetName,
          condition: maintenanceLogs.condition,
          source: maintenanceLogs.source,
          notes: maintenanceLogs.notes,
          workNotes: maintenanceLogs.workNotes,
          resolutionNotes: maintenanceLogs.resolutionNotes,
          dateLogged: sql<string>`${maintenanceLogs.dateLogged}::text`,
          resolutionDate: sql<string | null>`${maintenanceLogs.resolutionDate}::text`,
          isResolved: maintenanceLogs.isResolved,
          repairCost: sql<number | null>`${maintenanceLogs.repairCost}::float`,
          totalCost: sql<number | null>`${effectiveRepairCostSql()}::float`,
          mttrDays: sql<number | null>`
            case when ${maintenanceLogs.isResolved} = true and ${maintenanceLogs.resolutionDate} is not null
              then extract(day from (${maintenanceLogs.resolutionDate}::timestamp - ${maintenanceLogs.dateLogged}::timestamp))::int
            end
          `,
          loggedByName: maintenanceLogs.loggedByName,
          resolvedByName: maintenanceLogs.resolvedByName,
          repairParts: sql<Array<{ name: string; cost: string | null }>>`coalesce(${maintenanceLogs.repairParts}, '[]'::jsonb)`,
        })
        .from(maintenanceLogs)
        .where(
          and(
            inArray(maintenanceLogs.assetId, pagedAssetIds),
            ...(tenantId ? [eq(maintenanceLogs.tenantId, tenantId)] : []),
            ...(filters.startDate ? [gte(maintenanceLogs.dateLogged, filters.startDate)] : []),
            ...(filters.endDate ? [lte(maintenanceLogs.dateLogged, filters.endDate)] : [])
          )
        )
        .orderBy(desc(maintenanceLogs.dateLogged));
    }

    // Group maintenance logs by assetId
    const maintLogsByAsset = new Map<string, MaintenanceLogItem[]>();
    for (const ml of rawMaintenanceLogs) {
      if (!ml.assetId) continue;
      let list = maintLogsByAsset.get(ml.assetId);
      if (!list) {
        list = [];
        maintLogsByAsset.set(ml.assetId, list);
      }
      list.push({
        id: ml.id,
        logCode: ml.logCode,
        assetId: ml.assetId,
        assetCode: ml.assetCode,
        assetName: ml.assetName,
        condition: ml.condition,
        source: ml.source,
        notes: ml.notes,
        workNotes: ml.workNotes,
        resolutionNotes: ml.resolutionNotes,
        dateLogged: ml.dateLogged?.split("T")[0] || ml.dateLogged,
        resolutionDate: ml.resolutionDate?.split("T")[0] || ml.resolutionDate,
        isResolved: ml.isResolved,
        repairCost: ml.repairCost,
        totalCost: ml.totalCost,
        mttrDays: ml.mttrDays,
        loggedByName: ml.loggedByName,
        resolvedByName: ml.resolvedByName,
        repairParts: Array.isArray(ml.repairParts) ? ml.repairParts : [],
      });
    }

    const assetsByDeptKey = new Map<string, AssignedAssetItem[]>();
    for (const a of itemizedAssets) {
      if (!a.department) continue;
      const key = a.department.trim().toLowerCase();
      let list = assetsByDeptKey.get(key);
      if (!list) {
        list = [];
        assetsByDeptKey.set(key, list);
      }
      list.push({
        id: a.id,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category,
        status: a.status,
        serialNumber: a.serialNumber,
        value: a.value,
        location: a.location,
      });
    }

    const data: DepartmentReportRow[] = pagedDepts.map((d) => {
      const assetEntry = resolveAssetEntry(d);
      const assetsAssignedCount = assetEntry?.count ?? 0;
      const assetsVal = assetEntry?.value ?? 0;
      const topAssets = assetEntry?.topCodes ?? [];
      const { cCount, cVal, sCount, sVal, mCount, mVal } = resolveConsumables(d);
      const activeProjectsCount = resolveActiveProjects(d);
      const activeMaintenanceCount = resolveMaintCount(d);

      const assignedAssets = includeLineItems
        ? assetsByDeptKey.get(d.name.toLowerCase()) ||
          assetsByDeptKey.get(d.code.toLowerCase()) ||
          assetsByDeptKey.get(d.id.toLowerCase()) ||
          []
        : undefined;

      const consumedSupplies: ConsumedSupplyItem[] | undefined = includeLineItems
        ? [
            ...itemizedConsumables
              .filter((c) =>
                c.departmentId
                  ? c.departmentId === d.id
                  : c.departmentName?.toLowerCase() === d.name.toLowerCase() ||
                    c.departmentName?.toLowerCase() === d.code.toLowerCase()
              )
              .map((c) => ({
                id: c.id,
                itemCode: c.itemCode,
                name: c.name,
                category: c.category,
                classification: normalizeConsumableClassification(c.classification),
                source: "request" as const,
                referenceCode: c.requestCode,
                quantity: c.quantity,
                unit: c.unit,
                unitCost: c.unitCost,
                totalCost: c.totalCost,
                incurredOn: c.incurredOn?.split("T")[0] || c.incurredOn,
                purpose: c.purpose,
              })),
            ...itemizedDirectIssues
              .filter((m) => m.departmentId === d.id)
              .map((m) => ({
                id: m.id,
                itemCode: m.itemCode,
                name: m.name,
                category: m.category,
                classification: normalizeConsumableClassification(m.classification),
                source: "direct_issue" as const,
                referenceCode: m.movementCode,
                quantity: m.quantity,
                unit: m.unit,
                unitCost: m.unitCost,
                totalCost: m.totalCost,
                incurredOn: m.incurredOn?.split("T")[0] || m.incurredOn,
                purpose: m.purpose?.trim() || `Direct issue (${m.movementCode})`,
              })),
          ].sort((a, b) => (b.incurredOn ?? "").localeCompare(a.incurredOn ?? ""))
        : undefined;

      // Attach maintenance logs to each asset item, build dept-level logs list, and compute dept maintenance summary
      let deptMaintSummary: DepartmentMaintenanceSummary | undefined;
      const departmentMaintenanceLogs: MaintenanceLogItem[] = [];

      if (includeLineItems && assignedAssets) {
        let totalLogs = 0;
        let openLogs = 0;
        let resolvedLogs = 0;
        let totalRepairSpend = 0;
        let totalMttrDays = 0;
        let mttrCount = 0;
        const conditionMap = new Map<string, { count: number; cost: number }>();

        for (const asset of assignedAssets) {
          const logs = maintLogsByAsset.get(asset.id) || [];
          asset.maintenanceLogs = logs;
          totalLogs += logs.length;
          for (const log of logs) {
            departmentMaintenanceLogs.push({
              ...log,
              department: d.name,
              assetCode: log.assetCode || asset.assetCode,
              assetName: log.assetName || asset.name,
            });
            const cost = log.totalCost ?? log.repairCost ?? 0;
            const cond = log.condition || "other";
            const curCond = conditionMap.get(cond) || { count: 0, cost: 0 };
            curCond.count += 1;
            curCond.cost += cost;
            conditionMap.set(cond, curCond);

            if (log.isResolved) {
              resolvedLogs++;
              if (log.mttrDays != null) {
                totalMttrDays += log.mttrDays;
                mttrCount++;
              }
            } else {
              openLogs++;
            }
            totalRepairSpend += cost;
          }
        }

        departmentMaintenanceLogs.sort((a, b) => b.dateLogged.localeCompare(a.dateLogged));

        deptMaintSummary = {
          totalLogs,
          openLogs,
          resolvedLogs,
          totalRepairSpend,
          avgMttrDays: mttrCount > 0 ? Math.round(totalMttrDays / mttrCount) : null,
          conditionBreakdown: Array.from(conditionMap.entries()).map(([condition, stats]) => ({
            condition,
            count: stats.count,
            cost: stats.cost,
          })),
        };
      }

      return {
        id: d.id,
        departmentName: d.name,
        assetsAssignedCount,
        assetsValue: assetsVal,
        consumablesConsumedCount: cCount,
        consumablesValue: cVal,
        suppliesConsumedCount: sCount,
        suppliesValue: sVal,
        materialsConsumedCount: mCount,
        materialsValue: mVal,
        activeMaintenanceCount,
        activeProjects: activeProjectsCount,
        topAssets,
        ...(includeLineItems
          ? {
              assignedAssets: assignedAssets ?? [],
              consumedSupplies: consumedSupplies ?? [],
              departmentMaintenanceLogs,
              maintenanceSummary: deptMaintSummary,
            }
          : {}),
      };
    });


    return {
      data,
      total: totalDepartments,
      page,
      pageSize,
      totalPages: Math.ceil(totalDepartments / pageSize) || 1,
      summary: {
        totalDepartments,
        totalAssetsDeployed,
        totalAssetsValue,
        totalConsumablesConsumed,
        totalConsumablesValue,
        totalSuppliesConsumed,
        totalSuppliesValue,
        totalMaterialsConsumed,
        totalMaterialsValue,
        mostActiveByAssets,
      },
    };
  }
}
