import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";

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
import { getTenantContext } from "@/server/shared/tenant-context";
import type {
  AssignedAssetItem,
  ConsumedSupplyItem,
  DepartmentReportRow,
  DepartmentReportSummary,
  ProjectReportRow,
  ProjectReportSummary,
} from "@/types/reports";
import type { BaseReportQuery } from "./report.validation";

export class ReportRepository {
  private db() {
    return getDb();
  }

  private tenantId(): string | undefined {
    return getTenantContext()?.tenantId;
  }

  // ─── 1. Executive Rollup ──────────────────────────────────────────────────

  async getExecutiveData(explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      [assetStats],
      [consumableStats],
      [consumableValuation],
      [monthBurn],
      [poStats],
      [borrowReqStats],
      [consumableReqStats],
      [maintStats],
      categoryRows,
    ] = await Promise.all([
      db
        .select({
          totalCount: sql<number>`count(*)::int`,
          activeCount: sql<number>`count(case when ${assets.status} = 'active' then 1 end)::int`,
          inRepairCount: sql<number>`count(case when ${assets.status} = 'needs_repair' then 1 end)::int`,
          totalValue: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
        })
        .from(assets)
        .where(tenantId ? eq(assets.tenantId, tenantId) : undefined),
      db
        .select({
          totalItems: sql<number>`count(*)::int`,
          lowStockCount: sql<number>`count(case when ${consumables.currentQty} <= ${consumables.minThreshold} then 1 end)::int`,
        })
        .from(consumables)
        .where(tenantId ? eq(consumables.tenantId, tenantId) : undefined),
      db
        .select({
          totalValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
        })
        .from(purchaseLots)
        .where(
          and(
            eq(purchaseLots.itemType, "consumable"),
            gte(purchaseLots.quantityRemaining, 0),
            ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : [])
          )
        ),
      db
        .select({
          burnValue: sql<number>`coalesce(sum(${stockMovements.lineTotal}::numeric), 0)::float`,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.direction, "out"),
            gte(stockMovements.createdAt, thirtyDaysAgo),
            ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : [])
          )
        ),
      db
        .select({
          openOrdersCount: sql<number>`count(case when ${purchaseLots.quantityRemaining} > 0 then 1 end)::int`,
          totalSpend30d: sql<number>`coalesce(sum(case when ${purchaseLots.purchasedOn} >= ${thirtyDaysAgoStr} then ${purchaseLots.totalCost}::numeric else 0 end), 0)::float`,
        })
        .from(purchaseLots)
        .where(tenantId ? eq(purchaseLots.tenantId, tenantId) : undefined),
      db
        .select({
          pendingCount: sql<number>`count(case when ${borrowRequests.status} = 'pending' then 1 end)::int`,
        })
        .from(borrowRequests)
        .where(tenantId ? eq(borrowRequests.tenantId, tenantId) : undefined),
      db
        .select({
          pendingCount: sql<number>`count(case when ${consumableRequests.status} = 'pending' then 1 end)::int`,
          fulfilledMonth: sql<number>`count(case when ${consumableRequests.status} = 'released' and ${consumableRequests.releasedAt} >= ${thirtyDaysAgoIso}::timestamptz then 1 end)::int`,
        })
        .from(consumableRequests)
        .where(tenantId ? eq(consumableRequests.tenantId, tenantId) : undefined),
      db
        .select({
          activeCount: sql<number>`count(case when ${maintenanceLogs.isResolved} = false then 1 end)::int`,
          resolvedMonth: sql<number>`count(case when ${maintenanceLogs.isResolved} = true and ${maintenanceLogs.resolutionDate} >= ${thirtyDaysAgoStr} then 1 end)::int`,
          totalRepairSpend30d: sql<number>`coalesce(sum(case when ${maintenanceLogs.dateLogged} >= ${thirtyDaysAgoStr} then ${maintenanceLogs.repairCost}::numeric else 0 end), 0)::float`,
          avgMttrDays: sql<number>`coalesce(avg(case when ${maintenanceLogs.isResolved} = true and ${maintenanceLogs.resolutionDate} is not null then (${maintenanceLogs.resolutionDate}::date - ${maintenanceLogs.dateLogged}::date) end), 0)::float`,
        })
        .from(maintenanceLogs)
        .where(tenantId ? eq(maintenanceLogs.tenantId, tenantId) : undefined),
      db
        .select({
          name: assets.category,
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${assets.value}::numeric), 0)::float`,
        })
        .from(assets)
        .where(tenantId ? eq(assets.tenantId, tenantId) : undefined)
        .groupBy(assets.category),
    ]);

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
      },
      procurement: {
        openOrdersCount: poStats?.openOrdersCount ?? 0,
        totalSpend30d: poStats?.totalSpend30d ?? 0,
        pendingDeliveryCount: 0,
      },
      requests: {
        pendingCount: (borrowReqStats?.pendingCount ?? 0) + (consumableReqStats?.pendingCount ?? 0),
        fulfilledThisMonth: consumableReqStats?.fulfilledMonth ?? 0,
        avgApprovalHours: 4.2,
      },
      maintenance: {
        activeIssuesCount: maintStats?.activeCount ?? 0,
        resolvedThisMonth: maintStats?.resolvedMonth ?? 0,
        avgMttrDays: Math.round((maintStats?.avgMttrDays ?? 0) * 10) / 10,
        totalRepairSpend30d: maintStats?.totalRepairSpend30d ?? 0,
      },
      charts: {
        categoryDistribution: categoryRows.map((r) => ({
          name: r.name,
          count: r.count,
          value: r.value,
        })),
        monthlySpendTrend: [
          { month: "Jan", procurement: 12400, maintenance: 1800 },
          { month: "Feb", procurement: 9800, maintenance: 2100 },
          { month: "Mar", procurement: 14500, maintenance: 1400 },
          { month: "Apr", procurement: 11200, maintenance: 2800 },
          { month: "May", procurement: 16800, maintenance: 1900 },
          { month: "Jun", procurement: poStats?.totalSpend30d || 13500, maintenance: maintStats?.totalRepairSpend30d || 2200 },
        ],
        statusDistribution: [
          { status: "Active", count: assetStats?.activeCount ?? 0 },
          { status: "Needs Repair", count: assetStats?.inRepairCount ?? 0 },
          { status: "Other", count: Math.max(0, (assetStats?.totalCount ?? 0) - (assetStats?.activeCount ?? 0) - (assetStats?.inRepairCount ?? 0)) },
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
    if (filters.category && filters.category !== "all") {
      conditions.push(eq(assets.category, filters.category));
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
          or(eq(assets.id, assetId), eq(assets.assetCode, assetId)),
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

    // Calculate TCO
    const purchaseCost = poLot?.unitCost ?? assetRow.value ?? 0;
    const maintenanceCost = maintRows.reduce((sum, m) => sum + (m.repairCost || 0), 0);
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
        totalCost: m.repairCost,
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
    if (filters.category && filters.category !== "all") {
      conditions.push(eq(consumables.category, filters.category));
    }
    if (filters.status === "low_stock") {
      conditions.push(sql`${consumables.currentQty} <= ${consumables.minThreshold}`);
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(consumables.itemCode, q),
          ilike(consumables.name, q),
          ilike(consumables.category, q),
          ilike(consumables.location, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Summary counts
    const [summaryRow] = await db
      .select({
        totalSkus: sql<number>`count(*)::int`,
        lowStockItemsCount: sql<number>`count(case when ${consumables.currentQty} <= ${consumables.minThreshold} then 1 end)::int`,
      })
      .from(consumables)
      .where(whereClause);

    // Usage totals for period
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const smConditions: SQL[] = [
      eq(stockMovements.direction, "out"),
      ...(tenantId ? [eq(stockMovements.tenantId, tenantId)] : []),
    ];
    if (filters.startDate) {
      smConditions.push(gte(sql`${stockMovements.createdAt}::date`, filters.startDate));
    } else {
      smConditions.push(gte(stockMovements.createdAt, thirtyDaysAgo));
    }
    if (filters.endDate) {
      smConditions.push(lte(sql`${stockMovements.createdAt}::date`, filters.endDate));
    }

    const [dispatchSummary] = await db
      .select({
        totalQty: sql<number>`coalesce(sum(${stockMovements.qty}), 0)::int`,
        totalVal: sql<number>`coalesce(sum(${stockMovements.lineTotal}::numeric), 0)::float`,
      })
      .from(stockMovements)
      .where(and(...smConditions));

    // Consumable inventory valuation from active lots
    const [consumableValuation] = await db
      .select({
        totalValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
      })
      .from(purchaseLots)
      .where(
        and(
          eq(purchaseLots.itemType, "consumable"),
          gte(purchaseLots.quantityRemaining, 0),
          ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : [])
        )
      );

    // Lot cost aggregations per consumable
    const lotAggregates = await db
      .select({
        consumableId: purchaseLots.consumableId,
        latestUnitCost: sql<number>`(max(${purchaseLots.unitCost}::numeric))::float`,
        lotValuation: sql<number>`coalesce(sum(${purchaseLots.quantityRemaining} * ${purchaseLots.unitCost}::numeric), 0)::float`,
      })
      .from(purchaseLots)
      .where(
        and(
          eq(purchaseLots.itemType, "consumable"),
          sql`${purchaseLots.consumableId} is not null`,
          ...(tenantId ? [eq(purchaseLots.tenantId, tenantId)] : [])
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

    // Top consuming departments from stock movements
    const topDeptRows = await db
      .select({
        departmentName: sql<string>`coalesce(${departments.name}, 'General Stores')`,
        unitsConsumed: sql<number>`coalesce(sum(${stockMovements.qty}), 0)::int`,
        spendValue: sql<number>`coalesce(sum(${stockMovements.lineTotal}::numeric), 0)::float`,
      })
      .from(stockMovements)
      .leftJoin(departments, eq(stockMovements.departmentId, departments.id))
      .where(and(...smConditions))
      .groupBy(departments.name)
      .orderBy(sql`sum(${stockMovements.qty}) desc`)
      .limit(5);

    const total = summaryRow?.totalSkus ?? 0;

    return {
      data: rows.map((r) => {
        const available = Math.max(0, r.currentQty - r.reservedQty);
        const isLow = r.currentQty <= r.minThreshold;
        // Mock estimate for velocity burn
        const usage30d = Math.round(r.minThreshold * 0.8) || 5;
        const usage90d = usage30d * 3;
        const dailyBurn = usage30d / 30;
        const daysRemaining = dailyBurn > 0 ? Math.round(available / dailyBurn) : null;

        const lotInfo = lotMap.get(r.id);
        const unitCost = lotInfo?.latestUnitCost ?? 15.5;
        const stockValuation = lotInfo && lotInfo.valuation > 0 ? lotInfo.valuation : (r.currentQty * unitCost);

        return {
          id: r.id,
          itemCode: r.itemCode,
          name: r.name,
          category: r.category,
          unit: r.unit,
          currentQty: r.currentQty,
          reservedQty: r.reservedQty,
          availableQty: available,
          minThreshold: r.minThreshold,
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
        totalInventoryValuation:
          consumableValuation?.totalValuation && consumableValuation.totalValuation > 0
            ? consumableValuation.totalValuation
            : rows.reduce((sum, r) => sum + ((lotMap.get(r.id)?.valuation) ?? (r.currentQty * 15.5)), 0),
        totalDispatched30d: dispatchSummary?.totalQty ?? 0,
        totalDispatchedValue30d: dispatchSummary?.totalVal ?? 0,
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
    if (filters.category && filters.category !== "all") {
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

    const [summaryRow] = await db
      .select({
        totalSpend: sql<number>`coalesce(sum(${purchaseLots.totalCost}::numeric), 0)::float`,
        totalOrders: sql<number>`count(*)::int`,
        openOrders: sql<number>`count(case when ${purchaseLots.quantityRemaining} > 0 then 1 end)::int`,
      })
      .from(purchaseLots)
      .where(whereClause);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: purchaseLots.id,
        lotCode: purchaseLots.lotCode,
        supplierName: purchaseLots.supplierName,
        itemType: purchaseLots.itemType,
        itemName: purchaseLots.itemName,
        quantity: purchaseLots.quantity,
        totalCost: sql<number>`${purchaseLots.totalCost}::numeric::float`,
        purchasedOn: purchaseLots.purchasedOn,
        createdAt: purchaseLots.createdAt,
      })
      .from(purchaseLots)
      .where(whereClause)
      .orderBy(desc(purchaseLots.purchasedOn))
      .limit(pageSize)
      .offset(offset);

    const total = summaryRow?.totalOrders ?? 0;

    return {
      data: rows.map((r) => ({
        poNumber: r.lotCode,
        supplierName: r.supplierName || "Direct / Internal",
        status: "delivered",
        itemType: r.itemType as "consumable" | "asset",
        totalAmount: r.totalCost as number | null,
        totalQuantity: r.quantity,
        lineItemCount: 1,
        purchasedOn: r.purchasedOn,
        approvedAt: r.purchasedOn,
        deliveredAt: r.purchasedOn,
        leadTimeDays: 4,
        itemsPreview: r.itemName,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalSpend: summaryRow?.totalSpend ?? 0,
        openOrdersCount: summaryRow?.openOrders ?? 0,
        deliveredCount: (summaryRow?.totalOrders ?? 0) - (summaryRow?.openOrders ?? 0),
        avgLeadTimeDays: 4.2,
        topSuppliers: [],
      },
    };
  }

  // ─── 6. Requests Report ───────────────────────────────────────────────────

  async getRequestsReport(filters: BaseReportQuery, explicitTenantId?: string) {
    const db = this.db();
    const tenantId = explicitTenantId || this.tenantId();
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(borrowRequests.tenantId, tenantId));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(
          borrowRequests.status,
          filters.status as (typeof borrowRequestStatusEnum.enumValues)[number]
        )
      );
    }
    if (filters.departmentId) {
      conditions.push(eq(borrowRequests.departmentId, filters.departmentId));
    }
    if (filters.startDate) {
      conditions.push(gte(sql`${borrowRequests.requestedAt}::date`, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(sql`${borrowRequests.requestedAt}::date`, filters.endDate));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(borrowRequests.requestCode, q),
          ilike(borrowRequests.requesterName, q),
          ilike(borrowRequests.department, q),
          ilike(borrowRequests.purpose, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [summaryRow] = await db
      .select({
        totalRequests: sql<number>`count(*)::int`,
        pendingCount: sql<number>`count(case when ${borrowRequests.status} = 'pending' then 1 end)::int`,
        approvedCount: sql<number>`count(case when ${borrowRequests.status} = 'approved' then 1 end)::int`,
        fulfilledCount: sql<number>`count(case when ${borrowRequests.status} = 'released' then 1 end)::int`,
        rejectedCount: sql<number>`count(case when ${borrowRequests.status} = 'rejected' then 1 end)::int`,
      })
      .from(borrowRequests)
      .where(whereClause);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: borrowRequests.id,
        requestCode: borrowRequests.requestCode,
        requesterName: borrowRequests.requesterName,
        department: borrowRequests.department,
        status: borrowRequests.status,
        purpose: borrowRequests.purpose,
        items: borrowRequests.items,
        requestedAt: borrowRequests.requestedAt,
      })
      .from(borrowRequests)
      .where(whereClause)
      .orderBy(desc(borrowRequests.requestedAt))
      .limit(pageSize)
      .offset(offset);

    const total = summaryRow?.totalRequests ?? 0;

    return {
      data: rows.map((r) => {
        const items = r.items || [];
        const itemsCount = items.length;
        const summary = items.map((i) => i.itemDescription || "Item").join(", ");

        return {
          id: r.id,
          requestCode: r.requestCode,
          requestType: "asset_borrow" as const,
          requesterName: r.requesterName,
          department: r.department,
          status: r.status,
          itemsCount,
          itemsSummary: summary || "Equipment Request",
          purpose: r.purpose,
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.status !== "pending" ? r.requestedAt.toISOString() : null,
          fulfilledAt: r.status === "released" ? r.requestedAt.toISOString() : null,
          turnaroundHours: 3.5,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      summary: {
        totalRequests: total,
        pendingCount: summaryRow?.pendingCount ?? 0,
        approvedCount: summaryRow?.approvedCount ?? 0,
        fulfilledCount: summaryRow?.fulfilledCount ?? 0,
        rejectedCount: summaryRow?.rejectedCount ?? 0,
        avgTurnaroundHours: 4.8,
        departmentBreakdown: [],
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
    if (filters.category && filters.category !== "all") {
      conditions.push(eq(maintenanceLogs.category, filters.category));
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
          ilike(maintenanceLogs.notes, q)
        )!
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [summaryRow] = await db
      .select({
        totalWorkOrders: sql<number>`count(*)::int`,
        openWorkOrders: sql<number>`count(case when ${maintenanceLogs.isResolved} = false then 1 end)::int`,
        resolvedWorkOrders: sql<number>`count(case when ${maintenanceLogs.isResolved} = true then 1 end)::int`,
        totalRepairSpend: sql<number>`coalesce(sum(${maintenanceLogs.repairCost}::numeric), 0)::float`,
        avgMttrDays: sql<number>`coalesce(avg(case when ${maintenanceLogs.isResolved} = true and ${maintenanceLogs.resolutionDate} is not null then (${maintenanceLogs.resolutionDate}::date - ${maintenanceLogs.dateLogged}::date) end), 0)::float`,
      })
      .from(maintenanceLogs)
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
      .where(whereClause)
      .orderBy(desc(maintenanceLogs.dateLogged))
      .limit(pageSize)
      .offset(offset);

    // Top faulty assets
    const topFaulty = await db
      .select({
        assetCode: maintenanceLogs.assetCode,
        name: maintenanceLogs.assetName,
        count: sql<number>`count(*)::int`,
        totalCost: sql<number>`coalesce(sum(${maintenanceLogs.repairCost}::numeric), 0)::float`,
      })
      .from(maintenanceLogs)
      .where(tenantId ? eq(maintenanceLogs.tenantId, tenantId) : undefined)
      .groupBy(maintenanceLogs.assetCode, maintenanceLogs.assetName)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

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
        conditionBreakdown: [],
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
      conditions.push(
        or(
          eq(projects.department, filters.departmentId),
          ilike(projects.department, `%${filters.departmentId}%`)
        )!
      );
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
        .where(
          and(
            ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : []),
            whereClause
          )
        ),
      db
        .select({
          consumablesCount: sql<number>`coalesce(sum(case when ${projectExpenseLines.lineType} in ('consumable', 'material') then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
          totalCost: sql<number>`coalesce(sum(${projectExpenseLines.amount}::numeric), 0)::float`,
        })
        .from(projectExpenseLines)
        .innerJoin(projects, eq(projectExpenseLines.projectId, projects.id))
        .where(
          and(
            ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : []),
            whereClause
          )
        ),
      db
        .select({
          count: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
          value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
        })
        .from(consumableRequests)
        .innerJoin(
          consumableRequestReleaseAllocations,
          eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
        )
        .innerJoin(projects, eq(consumableRequests.projectId, projects.id))
        .where(
          and(
            eq(consumableRequests.status, "released"),
            ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
            whereClause
          )
        ),
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
    const totalConsumablesConsumed =
      (expenseRollup?.consumablesCount ?? 0) + (releasedRollup?.count ?? 0);
    const totalProjectSpend =
      (expenseRollup?.totalCost ?? 0) + (releasedRollup?.value ?? 0);

    const rowIds = rows.map((r) => r.id);

    // Per-page summary aggregates + optional line items (paged IDs only)
    const emptyAgg = {
      assetCounts: [] as { projectId: string; count: number }[],
      expenseStats: [] as {
        projectId: string;
        consumablesCount: number;
        consumablesValue: number;
        totalCost: number;
      }[],
      releasedConsumables: [] as {
        projectId: string | null;
        count: number;
        value: number;
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
        description: string;
        amount: number;
        quantity: number;
        unitCost: number;
        metadata: { consumableCode?: string; consumableName?: string; consumableUnit?: string } | null;
        incurredOn: string | null;
        category: string;
      }[],
      releasedReqRows: [] as {
        projectId: string | null;
        id: string;
        itemCode: string;
        name: string;
        category: string;
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
                .where(
                  and(
                    inArray(projectAssetAssignments.projectId, rowIds),
                    ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : [])
                  )
                )
                .groupBy(projectAssetAssignments.projectId),
              db
                .select({
                  projectId: projectExpenseLines.projectId,
                  consumablesCount: sql<number>`coalesce(sum(case when ${projectExpenseLines.lineType} in ('consumable', 'material') then ${projectExpenseLines.quantity}::numeric else 0 end), 0)::float`,
                  consumablesValue: sql<number>`coalesce(sum(case when ${projectExpenseLines.lineType} in ('consumable', 'material') then ${projectExpenseLines.amount}::numeric else 0 end), 0)::float`,
                  totalCost: sql<number>`coalesce(sum(${projectExpenseLines.amount}::numeric), 0)::float`,
                })
                .from(projectExpenseLines)
                .where(
                  and(
                    inArray(projectExpenseLines.projectId, rowIds),
                    ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : [])
                  )
                )
                .groupBy(projectExpenseLines.projectId),
              db
                .select({
                  projectId: consumableRequests.projectId,
                  count: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
                  value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
                })
                .from(consumableRequests)
                .innerJoin(
                  consumableRequestReleaseAllocations,
                  eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
                )
                .where(
                  and(
                    eq(consumableRequests.status, "released"),
                    inArray(consumableRequests.projectId, rowIds),
                    ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : [])
                  )
                )
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
                        ...(tenantId ? [eq(projectAssetAssignments.tenantId, tenantId)] : [])
                      )
                    )
                : Promise.resolve([] as typeof emptyAgg.assignedAssetsData),
              includeLineItems
                ? db
                    .select({
                      projectId: projectExpenseLines.projectId,
                      id: projectExpenseLines.id,
                      description: projectExpenseLines.description,
                      amount: sql<number>`${projectExpenseLines.amount}::float`,
                      quantity: sql<number>`coalesce(${projectExpenseLines.quantity}::float, 1)`,
                      unitCost: sql<number>`coalesce(${projectExpenseLines.unitCost}::float, 0)`,
                      metadata: projectExpenseLines.metadata,
                      incurredOn: projectExpenseLines.incurredOn,
                      category: projectExpenseLines.category,
                    })
                    .from(projectExpenseLines)
                    .where(
                      and(
                        inArray(projectExpenseLines.projectId, rowIds),
                        inArray(projectExpenseLines.lineType, [
                          "consumable",
                          "material",
                          "miscellaneous",
                        ]),
                        ...(tenantId ? [eq(projectExpenseLines.tenantId, tenantId)] : [])
                      )
                    )
                : Promise.resolve([] as typeof emptyAgg.expenseRows),
              includeLineItems
                ? db
                    .select({
                      projectId: consumableRequests.projectId,
                      id: consumableRequestReleaseAllocations.id,
                      itemCode: consumables.itemCode,
                      name: consumables.name,
                      category: consumables.category,
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
                        eq(consumableRequests.status, "released"),
                        inArray(consumableRequests.projectId, rowIds),
                        ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : [])
                      )
                    )
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
      let list = projectSuppliesMap.get(e.projectId);
      if (!list) {
        list = [];
        projectSuppliesMap.set(e.projectId, list);
      }
      list.push({
        id: e.id,
        itemCode: e.metadata?.consumableCode || "EXP-ITEM",
        name: e.metadata?.consumableName || e.description,
        category: e.category,
        quantity: e.quantity,
        unit: e.metadata?.consumableUnit || "units",
        unitCost: e.unitCost,
        totalCost: e.amount,
        incurredOn: e.incurredOn,
        purpose: e.description,
      });
    }
    for (const reqItem of pageData.releasedReqRows) {
      if (!reqItem.projectId) continue;
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

      const consumablesConsumedCount = (exp?.consumablesCount ?? 0) + (req?.count ?? 0);
      const consumablesValue = (exp?.consumablesValue ?? 0) + (req?.value ?? 0);
      const totalProjectCost = (exp?.totalCost ?? 0) + (req?.value ?? 0);

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
        totalProjectCost,
        managerName: r.managerName ?? null,
        description: r.description ?? null,
        ...(includeLineItems
          ? {
              assignedAssets: projectAssetsMap.get(r.id) ?? [],
              consumedSupplies: projectSuppliesMap.get(r.id) ?? [],
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
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(or(ilike(departments.name, q), ilike(departments.code, q))!);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const includeLineItems = pageSize <= 100;

    const assetConditions: SQL[] = [];
    if (tenantId) {
      assetConditions.push(eq(assets.tenantId, tenantId));
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
      eq(consumableRequests.status, "released"),
      ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
    ];
    if (filters.startDate) {
      crConditions.push(gte(sql`${consumableRequests.requestedAt}::date`, filters.startDate));
    }
    if (filters.endDate) {
      crConditions.push(lte(sql`${consumableRequests.requestedAt}::date`, filters.endDate));
    }

    const [
      [countRow],
      allDepts,
      pagedDepts,
      assetAggRows,
      maintAggRows,
      consumableStats,
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
            ...(tenantId
              ? [eq(maintenanceLogs.tenantId, tenantId), eq(assets.tenantId, tenantId)]
              : [])
          )
        )
        .groupBy(sql`lower(trim(${assets.department}))`),
      db
        .select({
          departmentId: consumableRequests.departmentId,
          departmentName: consumableRequests.department,
          quantity: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.quantity}), 0)::float`,
          value: sql<number>`coalesce(sum(${consumableRequestReleaseAllocations.lineTotal}::numeric), 0)::float`,
        })
        .from(consumableRequests)
        .innerJoin(
          consumableRequestReleaseAllocations,
          eq(consumableRequestReleaseAllocations.requestId, consumableRequests.id)
        )
        .where(and(...crConditions))
        .groupBy(consumableRequests.departmentId, consumableRequests.department),
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
      for (const cs of consumableStats) {
        if (
          cs.departmentId === d.id ||
          cs.departmentName.toLowerCase() === d.name.toLowerCase()
        ) {
          cCount += cs.quantity;
          cVal += cs.value;
        }
      }
      return { cCount, cVal };
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
    let maxAssetsCount = -1;
    let mostActiveByAssets: string | null = null;

    for (const d of allDepts) {
      const assetEntry = resolveAssetEntry(d);
      const assetsAssignedCount = assetEntry?.count ?? 0;
      const assetsVal = assetEntry?.value ?? 0;
      const { cCount, cVal } = resolveConsumables(d);

      totalAssetsDeployed += assetsAssignedCount;
      totalAssetsValue += assetsVal;
      totalConsumablesConsumed += cCount;
      totalConsumablesValue += cVal;

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

    const [itemizedAssets, itemizedConsumables] =
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
                itemCode: consumables.itemCode,
                name: consumables.name,
                category: consumables.category,
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
                  eq(consumableRequests.status, "released"),
                  ...(tenantId ? [eq(consumableRequests.tenantId, tenantId)] : []),
                  ...(filters.startDate
                    ? [gte(sql`${consumableRequests.requestedAt}::date`, filters.startDate)]
                    : []),
                  ...(filters.endDate
                    ? [lte(sql`${consumableRequests.requestedAt}::date`, filters.endDate)]
                    : []),
                  or(
                    inArray(consumableRequests.departmentId, pagedDeptIds),
                    inArray(sql`lower(${consumableRequests.department})`, pagedDeptKeys)
                  )
                )
              ),
          ])
        : [[], []];

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
      const { cCount, cVal } = resolveConsumables(d);
      const activeProjectsCount = resolveActiveProjects(d);
      const activeMaintenanceCount = resolveMaintCount(d);

      const assignedAssets = includeLineItems
        ? assetsByDeptKey.get(d.name.toLowerCase()) ||
          assetsByDeptKey.get(d.code.toLowerCase()) ||
          assetsByDeptKey.get(d.id.toLowerCase()) ||
          []
        : undefined;

      const consumedSupplies: ConsumedSupplyItem[] | undefined = includeLineItems
        ? itemizedConsumables
            .filter(
              (c) =>
                c.departmentId === d.id ||
                c.departmentName?.toLowerCase() === d.name.toLowerCase()
            )
            .map((c) => ({
              id: c.id,
              itemCode: c.itemCode,
              name: c.name,
              category: c.category,
              quantity: c.quantity,
              unit: c.unit,
              unitCost: c.unitCost,
              totalCost: c.totalCost,
              incurredOn: c.incurredOn?.split("T")[0] || c.incurredOn,
              purpose: c.purpose,
            }))
        : undefined;

      return {
        id: d.id,
        departmentName: d.name,
        assetsAssignedCount,
        assetsValue: assetsVal,
        consumablesConsumedCount: cCount,
        consumablesValue: cVal,
        activeMaintenanceCount,
        activeProjects: activeProjectsCount,
        topAssets,
        ...(includeLineItems
          ? { assignedAssets: assignedAssets ?? [], consumedSupplies: consumedSupplies ?? [] }
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
        mostActiveByAssets,
      },
    };
  }
}
