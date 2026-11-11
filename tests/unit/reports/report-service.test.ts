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

function createServiceHarness() {
  const execData = buildExecutiveFixture();
  const consData = buildConsumablesFixture();
  const deptData = buildDepartmentsFixture();
  const projData = buildProjectsFixture();

  const repoStub: Partial<ReportRepository> = {
    getExecutiveData: vi.fn(async () => structuredClone(execData)),
    getConsumablesReport: vi.fn(async () => structuredClone(consData)),
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
});
