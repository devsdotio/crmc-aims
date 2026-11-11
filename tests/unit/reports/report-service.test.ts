import { describe, expect, it, vi } from "vitest";

import { ReportService } from "@/server/modules/reports/report.service";
import type { ReportRepository } from "@/server/modules/reports/report.repository";
import type { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import type {
  DepartmentReportRow,
  DepartmentReportSummary,
  ProjectReportRow,
  ProjectReportSummary,
} from "@/types/reports";

function buildExecutiveFixture(): Awaited<ReturnType<ReportRepository["getExecutiveData"]>> {
  return {
    assets: {
      totalCount: 40,
      activeCount: 36,
      inRepairCount: 4,
      totalValue: 450000,
    },
    consumables: {
      totalItems: 12,
      lowStockCount: 3,
      totalValuation: 95000,
      monthBurnRateValue: 18500,
      suppliesCount: 7,
      materialsCount: 5,
      suppliesLowStockCount: 1,
      materialsLowStockCount: 2,
      suppliesValuation: 35000,
      materialsValuation: 60000,
      suppliesBurnRateValue: 6500,
      materialsBurnRateValue: 12000,
    },
    procurement: {
      openOrdersCount: 3,
      totalSpend30d: 82000,
      pendingDeliveryCount: 2,
    },
    requests: {
      pendingCount: 4,
      fulfilledThisMonth: 9,
      avgApprovalHours: 5.2,
      supplyPendingCount: 2,
      materialPendingCount: 1,
      mixedPendingCount: 1,
      borrowPendingCount: 0,
    },
    maintenance: {
      activeIssuesCount: 2,
      resolvedThisMonth: 6,
      totalRepairSpend30d: 14000,
      avgMttrDays: 2.5,
    },
    charts: {
      monthlySpendTrend: [
        { month: "2026-10", procurement: 50000, maintenance: 7000 },
      ],
      categoryDistribution: [
        { name: "Computing", count: 10, value: 250000, kind: "asset" },
      ],
      statusDistribution: [{ status: "active", count: 36 }],
    },
  };
}

function buildConsumablesFixture(): Awaited<ReturnType<ReportRepository["getConsumablesReport"]>> {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 2,
    data: [
      {
        id: "con-1",
        itemCode: "SUP-001",
        name: "Bond Paper A4",
        category: "Office Supplies",
        classification: "supply",
        unit: "ream",
        currentQty: 12,
        reservedQty: 2,
        availableQty: 10,
        minThreshold: 5,
        location: "Main Store",
        unitCost: 180,
        stockValuation: 2160,
        usage30d: 4,
        usage90d: 10,
        estimatedDaysRemaining: 75,
        isLowStock: false,
        lastRestocked: "2026-10-01",
      },
      {
        id: "con-2",
        itemCode: "MAT-001",
        name: "Portland Cement",
        category: "Construction Materials",
        classification: "material",
        unit: "bag",
        currentQty: 6,
        reservedQty: 3,
        availableQty: 3,
        minThreshold: 5,
        location: "Yard B",
        unitCost: 310,
        stockValuation: 1860,
        usage30d: 8,
        usage90d: 15,
        estimatedDaysRemaining: 11,
        isLowStock: true,
        lastRestocked: "2026-10-03",
      },
    ],
    summary: {
      totalSkus: 2,
      lowStockItemsCount: 1,
      totalDispatched30d: 12,
      totalDispatchedValue30d: 3200,
      totalInventoryValuation: 4020,
      totalReservedQty: 5,
      suppliesCount: 1,
      materialsCount: 1,
      suppliesLowStockCount: 0,
      materialsLowStockCount: 1,
      suppliesValuation: 2160,
      materialsValuation: 1860,
      suppliesDispatched30d: 4,
      materialsDispatched30d: 8,
      suppliesDispatchedValue30d: 720,
      materialsDispatchedValue30d: 2480,
      topConsumingDepartments: [
        { departmentName: "Facilities", unitsConsumed: 8, spendValue: 2480 },
      ],
    },
  };
}

function buildDepartmentsFixture(): {
  page: number;
  pageSize: number;
  totalPages: number;
  data: DepartmentReportRow[];
  total: number;
  summary: DepartmentReportSummary;
} {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 1,
    data: [
      {
        id: "dept-1",
        departmentName: "Engineering Office",
        assetsAssignedCount: 5,
        assetsValue: 120000,
        consumablesConsumedCount: 7,
        consumablesValue: 1650,
        suppliesConsumedCount: 3,
        suppliesValue: 450,
        materialsConsumedCount: 4,
        materialsValue: 1200,
        activeMaintenanceCount: 0,
        staffCount: 12,
        activeProjects: 1,
        topAssets: [],
        assignedAssets: [],
        consumedSupplies: [
          {
            id: "mv-1",
            itemCode: "SUP-001",
            name: "Bond Paper A4",
            category: "Office Supplies",
            classification: "supply",
            source: "request",
            referenceCode: "CRQ-001",
            quantity: 3,
            unit: "ream",
            unitCost: 150,
            totalCost: 450,
          },
          {
            id: "mv-2",
            itemCode: "MAT-001",
            name: "Portland Cement",
            category: "Construction Materials",
            classification: "material",
            source: "direct_issue",
            referenceCode: null,
            quantity: 4,
            unit: "bag",
            unitCost: 300,
            totalCost: 1200,
          },
        ],
      },
    ],
    summary: {
      totalDepartments: 1,
      totalAssetsDeployed: 5,
      totalAssetsValue: 120000,
      totalConsumablesConsumed: 7,
      totalConsumablesValue: 1650,
      totalSuppliesConsumed: 3,
      totalSuppliesValue: 450,
      totalMaterialsConsumed: 4,
      totalMaterialsValue: 1200,
      mostActiveByAssets: "Engineering Office",
    },
  };
}

function buildProjectsFixture(): {
  page: number;
  pageSize: number;
  totalPages: number;
  data: ProjectReportRow[];
  total: number;
  summary: ProjectReportSummary;
} {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 1,
    data: [
      {
        id: "prj-1",
        projectCode: "PRJ-001",
        projectName: "Science Wing Annex",
        managerName: null,
        description: null,
        status: "active",
        startDate: "2026-09-01",
        endDate: null,
        assignedAssetsCount: 2,
        consumablesConsumedCount: 5,
        consumablesValue: 1400,
        suppliesConsumedCount: 2,
        suppliesValue: 300,
        materialsConsumedCount: 3,
        materialsValue: 1100,
        totalProjectCost: 1400,
        department: "Physical Plant",
        consumedSupplies: [
          {
            id: "exp-1",
            itemCode: "SUP-002",
            name: "Marker Pens",
            category: "Office Supplies",
            classification: "supply",
            source: "request",
            referenceCode: "CRQ-010",
            quantity: 2,
            unit: "box",
            unitCost: 150,
            totalCost: 300,
          },
          {
            id: "exp-2",
            itemCode: "MAT-005",
            name: "Steel Rebar",
            category: "Construction Materials",
            classification: "material",
            source: "direct_issue",
            referenceCode: null,
            quantity: 3,
            unit: "pcs",
            unitCost: 366.67,
            totalCost: 1100,
          },
        ],
      },
    ],
    summary: {
      totalProjects: 1,
      activeProjects: 1,
      completedProjects: 0,
      totalAssetsAssigned: 2,
      totalConsumablesConsumed: 5,
      totalSuppliesConsumed: 2,
      totalMaterialsConsumed: 3,
      totalProjectSpend: 1400,
    },
  };
}

function buildAssetsFixture(): Awaited<ReturnType<ReportRepository["getAssetRegisterReport"]>> {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 1,
    data: [
      {
        id: "ast-1",
        assetCode: "CE-001",
        name: "=CMD|'/C calc'!A0",
        category: "Computers",
        classification: "Electronics",
        status: "active",
        assignmentType: "borrowable",
        location: "Lab 1",
        department: "IT Dept",
        currentHolder: null,
        purchaseDate: "2026-01-10",
        purchaseCost: 42000,
        currentValue: 42000,
        supplierName: null,
        serialNumber: "SN-1",
        hasActiveMaintenance: false,
        lastUpdated: "2026-10-01",
      },
    ],
    summary: {
      totalAssets: 1,
      activeCount: 1,
      needsRepairCount: 0,
      outOfServiceCount: 0,
      retiredCount: 0,
      totalValuation: 42000,
    },
  };
}

function buildDrilldownFixture(): NonNullable<
  Awaited<ReturnType<ReportRepository["getAssetDrilldownReport"]>>
> {
  return {
    asset: {
      id: "ast-1",
      assetCode: "CE-001",
      name: "Workstation",
      category: "Computers",
      classification: "Electronics",
      unit: "unit",
      status: "active",
      assignmentType: "borrowable",
      location: "Lab 1",
      department: "IT Dept",
      currentHolder: null,
      purchaseDate: "2026-01-10",
      value: 42000,
      supplierName: "TechMart",
      serialNumber: "SN-1",
      imageUrl: null,
      notes: null,
      createdAt: "2026-01-10T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
    purchaseInfo: {
      lotCode: "PO-2026-001",
      poNumber: "PO-2026-001",
      purchasedOn: "2026-01-10",
      supplierName: "TechMart",
      unitCost: 42000,
      reference: "INV-1",
      receiptUrl: null,
    },
    maintenanceHistory: [
      {
        id: "mnt-1",
        logCode: "MNT-001",
        condition: "resolved",
        source: "manual_flag",
        dateLogged: "2026-09-01",
        isResolved: true,
        resolutionDate: "2026-09-03",
        repairCost: 1800,
        totalCost: 1800,
        serviceProvider: "Vendor",
        loggedByName: "Admin",
        resolvedByName: "Tech",
        notes: "Fan",
        workNotes: null,
        resolutionNotes: "Replaced",
        repairParts: [{ name: "Cooling Fan", cost: "1800.00" }],
      },
    ],
    custodyHistory: [],
    consumablesConsumed: [],
    tco: {
      purchaseCost: 42000,
      maintenanceCost: 1800,
      consumablesCost: 0,
      totalCostOfOwnership: 43800,
    },
    canViewCosts: true,
  };
}

function buildPurchaseOrdersFixture(): Awaited<
  ReturnType<ReportRepository["getPurchaseOrdersReport"]>
> {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 1,
    data: [
      {
        poNumber: "PO-2026-001",
        supplierName: "Acme Supply",
        status: "delivered",
        itemType: "consumable",
        classification: "supply",
        totalAmount: 15000,
        totalQuantity: 50,
        lineItemCount: 2,
        purchasedOn: "2026-09-15",
        approvedAt: "2026-09-16",
        deliveredAt: "2026-09-18",
        leadTimeDays: 3,
        itemsPreview: "Bond Paper (50)",
      },
    ],
    summary: {
      totalSpend: 15000,
      openOrdersCount: 0,
      deliveredCount: 1,
      avgLeadTimeDays: 3,
      suppliesSpend: 15000,
      materialsSpend: 0,
      assetsSpend: 0,
      suppliesOrdersCount: 1,
      materialsOrdersCount: 0,
      assetsOrdersCount: 0,
      topSuppliers: [{ name: "Acme Supply", spend: 15000 }],
    },
  };
}

function buildMaintenanceFixture(): Awaited<
  ReturnType<ReportRepository["getMaintenanceReport"]>
> {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 1,
    total: 1,
    data: [
      {
        id: "mnt-1",
        logCode: "MNT-001",
        assetCode: "CE-001",
        assetName: "Workstation",
        category: "Computers",
        department: "IT Dept",
        condition: "resolved",
        source: "manual_flag",
        dateLogged: "2026-09-01",
        isResolved: true,
        resolutionDate: "2026-09-03",
        repairCost: 1800,
        mttrDays: 2,
        loggedByName: "Admin",
        resolvedByName: "Tech",
        notes: "Fan",
        workNotes: null,
        resolutionNotes: "Done",
        repairParts: [{ name: "Cooling Fan", cost: "1800.00" }],
      },
    ],
    summary: {
      totalWorkOrders: 1,
      openWorkOrders: 0,
      resolvedWorkOrders: 1,
      totalRepairSpend: 1800,
      avgMttrDays: 2,
      topFaultyAssets: [
        { assetCode: "CE-001", name: "Workstation", count: 1, totalCost: 1800 },
      ],
      conditionBreakdown: [{ condition: "resolved", count: 1, cost: 1800 }],
    },
  };
}

function createServiceHarness() {
  const execData = buildExecutiveFixture();
  const assetsData = buildAssetsFixture();
  const drilldownData = buildDrilldownFixture();
  const consData = buildConsumablesFixture();
  const poData = buildPurchaseOrdersFixture();
  const maintData = buildMaintenanceFixture();
  const deptData = buildDepartmentsFixture();
  const projData = buildProjectsFixture();

  const repoStub: Partial<ReportRepository> = {
    getExecutiveData: vi.fn(async () => structuredClone(execData)),
    getAssetRegisterReport: vi.fn(async () => structuredClone(assetsData)),
    getAssetDrilldownReport: vi.fn(async () => structuredClone(drilldownData)),
    getConsumablesReport: vi.fn(async () => structuredClone(consData)),
    getPurchaseOrdersReport: vi.fn(async () => structuredClone(poData)),
    getMaintenanceReport: vi.fn(async () => structuredClone(maintData)),
    getDepartmentsReport: vi.fn(async () => structuredClone(deptData)),
    getProjectsReport: vi.fn(async () => structuredClone(projData)),
  };

  const logFn = vi.fn(async () => ({
    id: "audit-1",
    tenantId: "tenant-1",
    notes: null,
    actorUserId: "usr-1",
    actorName: "Chief Custodian",
    metadata: null,
    entityType: "report",
    entityId: "consumables",
    action: "report.exported",
    timestamp: new Date(),
  }));
  const auditStub: Partial<AuditLogService> = {
    log: logFn as AuditLogService["log"],
  };

  const service = new ReportService(
    repoStub as unknown as ReportRepository,
    auditStub as unknown as AuditLogService
  );

  return { service, repoStub, logFn };
}

describe("ReportService split consumables & cost-masking behavior", () => {
  it("preserves supplies & materials valuations for operators and masks all cost fields for borrowers", async () => {
    const { service } = createServiceHarness();

    const opExec = await service.getExecutiveSummary("admin", "tenant-1");
    expect(opExec.canViewCosts).toBe(true);
    expect(opExec.consumables.suppliesValuation).toBe(35000);
    expect(opExec.consumables.materialsValuation).toBe(60000);

    const borExec = await service.getExecutiveSummary("borrower", "tenant-1");
    expect(borExec.canViewCosts).toBe(false);
    expect(borExec.consumables.suppliesValuation).toBe(0);
    expect(borExec.consumables.materialsValuation).toBe(0);
    expect(borExec.consumables.suppliesBurnRateValue).toBe(0);
    expect(borExec.consumables.materialsBurnRateValue).toBe(0);
    expect(borExec.consumables.totalValuation).toBe(0);
    expect(borExec.procurement.totalSpend30d).toBe(0);
    expect(borExec.maintenance.totalRepairSpend30d).toBe(0);
    expect(borExec.charts.monthlySpendTrend[0]?.procurement).toBe(0);
    expect(borExec.charts.categoryDistribution[0]?.value).toBe(0);
  });

  it("masks split supplies/materials summary & row values in consumables, departments, and projects", async () => {
    const { service } = createServiceHarness();
    const filters = { page: 1, pageSize: 25, sortOrder: "desc" as const, includeSandbox: false };

    const consMasked = await service.getConsumablesReport(filters, "borrower");
    expect(consMasked.canViewCosts).toBe(false);
    expect(consMasked.summary.suppliesValuation).toBe(0);
    expect(consMasked.summary.materialsValuation).toBe(0);
    expect(consMasked.summary.suppliesDispatchedValue30d).toBe(0);
    expect(consMasked.summary.materialsDispatchedValue30d).toBe(0);
    expect(consMasked.summary.topConsumingDepartments?.[0]?.spendValue).toBe(0);
    expect(consMasked.data.every((r) => r.unitCost === null && r.stockValuation === null)).toBe(true);

    const deptMasked = await service.getDepartmentsReport(filters, "borrower");
    expect(deptMasked.summary.totalSuppliesValue).toBe(0);
    expect(deptMasked.summary.totalMaterialsValue).toBe(0);
    expect(deptMasked.data[0]?.suppliesValue).toBeNull();
    expect(deptMasked.data[0]?.materialsValue).toBeNull();
    expect(
      deptMasked.data[0]?.consumedSupplies?.every(
        (s) => s.unitCost === null && s.totalCost === null
      )
    ).toBe(true);

    const projMasked = await service.getProjectsReport(filters, "borrower");
    expect(projMasked.data[0]?.suppliesValue).toBeNull();
    expect(projMasked.data[0]?.materialsValue).toBeNull();
    expect(projMasked.data[0]?.totalProjectCost).toBeNull();
    expect(
      projMasked.data[0]?.consumedSupplies?.every(
        (s) => s.unitCost === null && s.totalCost === null
      )
    ).toBe(true);
  });

  it("exports split supply/material columns in CSV reports and logs export + print-intent audit entries", async () => {
    const { service, logFn } = createServiceHarness();
    const actor = { userId: "usr-1", displayName: "Chief Custodian", tenantId: "tenant-1" };

    const consumablesCsv = await service.exportReportCsv(
      { reportType: "consumables", format: "csv", page: 1, pageSize: 200, sortOrder: "desc", includeSandbox: false },
      "admin",
      "tenant-1",
      actor
    );
    expect(consumablesCsv.csv).toContain("Classification");
    expect(consumablesCsv.csv).toContain("Reserved Qty");
    expect(consumablesCsv.csv).toContain("Available Qty");
    expect(consumablesCsv.csv).toContain("Bond Paper A4");
    expect(consumablesCsv.csv).toContain("Portland Cement");
    expect(logFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AUDIT_ENTITY.report,
        entityId: "consumables",
        action: AUDIT_ACTION.reportExported,
        actorUserId: "usr-1",
      })
    );

    const deptCsv = await service.exportReportCsv(
      { reportType: "departments", format: "csv", page: 1, pageSize: 200, sortOrder: "desc", includeSandbox: false },
      "admin"
    );
    expect(deptCsv.csv).toContain("Supplies Consumed");
    expect(deptCsv.csv).toContain("Materials Consumed");
    expect(deptCsv.csv).toContain("Supplies Valuation");
    expect(deptCsv.csv).toContain("Materials Valuation");

    const execCsv = await service.exportReportCsv(
      { reportType: "executive", format: "csv", page: 1, pageSize: 200, sortOrder: "desc", includeSandbox: false },
      "admin"
    );
    expect(execCsv.csv).toContain("Consumable Supplies");
    expect(execCsv.csv).toContain("Consumable Materials");

    await service.recordPrintIntent(
      { reportType: "consumables", filters: { classification: "material" } },
      actor
    );
    expect(logFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AUDIT_ENTITY.report,
        entityId: "consumables",
        action: AUDIT_ACTION.reportPrintRequested,
        actorName: "Chief Custodian",
      })
    );
  });

  it("masks costs for staff across all report endpoints, CSV exports, and neutralizes CSV formula injections", async () => {
    const { service, repoStub } = createServiceHarness();
    const filters = {
      page: 1,
      pageSize: 25,
      sortOrder: "desc" as const,
      includeSandbox: false,
    };

    const exec = await service.getExecutiveSummary("staff", "tenant-1");
    expect(exec.canViewCosts).toBe(false);
    expect(exec.assets.totalValue).toBe(0);
    expect(exec.consumables.suppliesValuation).toBe(0);

    const assets = await service.getAssetRegisterReport(filters, "staff", "tenant-1");
    expect(assets.canViewCosts).toBe(false);
    expect(assets.summary.totalValuation).toBe(0);
    expect(assets.data[0]?.purchaseCost).toBeNull();
    expect(assets.data[0]?.currentValue).toBeNull();

    const drilldown = await service.getAssetDrilldownReport("CE-001", "staff", "tenant-1");
    expect(drilldown?.canViewCosts).toBe(false);
    expect(drilldown?.asset.value).toBeNull();
    expect(drilldown?.purchaseInfo?.unitCost).toBeNull();
    expect(drilldown?.tco.totalCostOfOwnership).toBe(0);
    expect(drilldown?.maintenanceHistory[0]?.repairCost).toBeNull();
    expect(drilldown?.maintenanceHistory[0]?.repairParts[0]?.cost).toBeNull();

    const pos = await service.getPurchaseOrdersReport(filters, "staff", "tenant-1");
    expect(pos.canViewCosts).toBe(false);
    expect(pos.summary.totalSpend).toBe(0);
    expect(pos.data[0]?.totalAmount).toBeNull();

    const maint = await service.getMaintenanceReport(filters, "staff", "tenant-1");
    expect(maint.canViewCosts).toBe(false);
    expect(maint.summary.totalRepairSpend).toBe(0);
    expect(maint.data[0]?.repairCost).toBeNull();
    expect(maint.data[0]?.repairParts[0]?.cost).toBeNull();

    const staffAssetsCsv = await service.exportReportCsv(
      {
        reportType: "assets",
        format: "csv",
        page: 1,
        pageSize: 200,
        sortOrder: "desc",
        includeSandbox: false,
      },
      "staff",
      "tenant-1"
    );
    expect(staffAssetsCsv.csv).not.toContain("Cost / Valuation");
    expect(staffAssetsCsv.csv).not.toContain("42000");
    expect(staffAssetsCsv.csv).toContain("'=CMD|'/C calc'!A0");

    const staffConsCsv = await service.exportReportCsv(
      {
        reportType: "consumables",
        format: "csv",
        page: 1,
        pageSize: 200,
        sortOrder: "desc",
        includeSandbox: false,
      },
      "staff",
      "tenant-1"
    );
    expect(staffConsCsv.csv).not.toContain("Unit Cost");
    expect(staffConsCsv.csv).not.toContain("Stock Value");
    expect(staffConsCsv.csv).not.toContain("2160");

    // Null drilldown & dependency failure propagation
    (repoStub.getAssetDrilldownReport as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    expect(await service.getAssetDrilldownReport("MISSING", "admin", "tenant-1")).toBeNull();

    (repoStub.getConsumablesReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("DB offline")
    );
    await expect(service.getConsumablesReport(filters, "admin")).rejects.toThrow("DB offline");
  });
});
