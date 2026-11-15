import { isAssetOperatorRole, type AppRole } from "@/server/shared/roles";
import { toCsv } from "@/lib/csv";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { ReportRepository } from "./report.repository";
import type {
  BaseReportQuery,
  ExportReportQuery,
  ReportPrintIntentInput,
} from "./report.validation";

export type ReportAuditActor = {
  userId: string;
  displayName: string;
  tenantId?: string;
};

export class ReportService {
  constructor(
    private readonly repo = new ReportRepository(),
    private readonly auditLogs = new AuditLogService()
  ) {}

  // ─── 1. Executive Summary ─────────────────────────────────────────────────

  async getExecutiveSummary(
    actorRole: AppRole,
    tenantId?: string,
    includeSandbox = false
  ) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const data = await this.repo.getExecutiveData(tenantId, includeSandbox);

    if (!canViewCosts) {
      data.assets.totalValue = 0;
      data.consumables.totalValuation = 0;
      data.consumables.monthBurnRateValue = 0;
      data.consumables.suppliesValuation = 0;
      data.consumables.materialsValuation = 0;
      data.consumables.suppliesBurnRateValue = 0;
      data.consumables.materialsBurnRateValue = 0;
      data.procurement.totalSpend30d = 0;
      data.maintenance.totalRepairSpend30d = 0;
      data.charts.monthlySpendTrend = data.charts.monthlySpendTrend.map((m) => ({
        month: m.month,
        procurement: 0,
        maintenance: 0,
      }));
      data.charts.categoryDistribution = data.charts.categoryDistribution.map((c) => ({
        ...c,
        value: 0,
      }));
    }

    return {
      ...data,
      canViewCosts,
    };
  }

  // ─── 2. Asset Register Report ─────────────────────────────────────────────

  async getAssetRegisterReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getAssetRegisterReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalValuation = 0;
      result.data = result.data.map((row) => ({
        ...row,
        purchaseCost: null,
        currentValue: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 3. Asset Drill-down Report ───────────────────────────────────────────

  async getAssetDrilldownReport(assetId: string, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getAssetDrilldownReport(assetId, tenantId);
    if (!result) return null;

    if (!canViewCosts) {
      result.asset.value = null;
      if (result.purchaseInfo) {
        result.purchaseInfo.unitCost = null;
      }
      result.maintenanceHistory = result.maintenanceHistory.map((m) => ({
        ...m,
        repairCost: null,
        totalCost: null,
        repairParts: (m.repairParts ?? []).map((p) => ({ name: p.name, cost: null })),
      }));
      result.tco = {
        purchaseCost: 0,
        maintenanceCost: 0,
        consumablesCost: 0,
        totalCostOfOwnership: 0,
      };
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 4. Consumables Report ────────────────────────────────────────────────

  async getConsumablesReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getConsumablesReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalInventoryValuation = 0;
      result.summary.totalDispatchedValue30d = 0;
      result.summary.suppliesValuation = 0;
      result.summary.materialsValuation = 0;
      result.summary.suppliesDispatchedValue30d = 0;
      result.summary.materialsDispatchedValue30d = 0;
      if (result.summary.topConsumingDepartments) {
        result.summary.topConsumingDepartments = result.summary.topConsumingDepartments.map(
          (d) => ({ ...d, spendValue: 0 })
        );
      }
      result.data = result.data.map((row) => ({
        ...row,
        unitCost: null,
        stockValuation: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 5. Purchase Orders Report ────────────────────────────────────────────

  async getPurchaseOrdersReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getPurchaseOrdersReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalSpend = 0;
      result.summary.suppliesSpend = 0;
      result.summary.materialsSpend = 0;
      result.summary.assetsSpend = 0;
      result.summary.topSuppliers = result.summary.topSuppliers.map((s) => ({
        ...s,
        spend: 0,
      }));
      result.data = result.data.map((row) => ({
        ...row,
        totalAmount: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 6. Requests Report ───────────────────────────────────────────────────

  async getRequestsReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getRequestsReport(filters, tenantId);

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 7. Maintenance Report ────────────────────────────────────────────────

  async getMaintenanceReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getMaintenanceReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalRepairSpend = 0;
      result.summary.topFaultyAssets = result.summary.topFaultyAssets.map((f) => ({
        ...f,
        totalCost: 0,
      }));
      result.data = result.data.map((row) => ({
        ...row,
        repairCost: null,
        repairParts: (row.repairParts ?? []).map((p) => ({ name: p.name, cost: null })),
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 8. Projects Report ───────────────────────────────────────────────────

  async getProjectsReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getProjectsReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalProjectSpend = 0;
      result.data = result.data.map((row) => ({
        ...row,
        consumablesValue: null,
        suppliesValue: null,
        materialsValue: null,
        totalProjectCost: null,
        consumedSupplies: row.consumedSupplies?.map((s) => ({
          ...s,
          unitCost: null,
          totalCost: null,
        })),
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 9. Departments Report ────────────────────────────────────────────────

  async getDepartmentsReport(filters: BaseReportQuery, actorRole: AppRole, tenantId?: string) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getDepartmentsReport(filters, tenantId);

    if (!canViewCosts) {
      result.summary.totalAssetsValue = 0;
      result.summary.totalConsumablesValue = 0;
      result.summary.totalSuppliesValue = 0;
      result.summary.totalMaterialsValue = 0;
      result.data = result.data.map((row) => ({
        ...row,
        assetsValue: null,
        consumablesValue: null,
        suppliesValue: null,
        materialsValue: null,
        consumedSupplies: row.consumedSupplies?.map((s) => ({
          ...s,
          unitCost: null,
          totalCost: null,
        })),
        maintenanceSummary: row.maintenanceSummary
          ? {
              ...row.maintenanceSummary,
              totalRepairSpend: 0,
              conditionBreakdown: (row.maintenanceSummary.conditionBreakdown || []).map((c) => ({
                ...c,
                cost: 0,
              })),
            }
          : undefined,
        departmentMaintenanceLogs: (row.departmentMaintenanceLogs || []).map((l) => ({
          ...l,
          repairCost: null,
          totalCost: null,
          repairParts: (l.repairParts || []).map((p) => ({ ...p, cost: null })),
        })),
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 10. CSV Export & Audit Intent ────────────────────────────────────────

  async recordPrintIntent(
    input: ReportPrintIntentInput,
    actor: ReportAuditActor
  ): Promise<void> {
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.report,
      entityId: input.reportType,
      action: AUDIT_ACTION.reportPrintRequested,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Requested print/PDF for ${input.reportType} report.`,
      metadata: {
        reportType: input.reportType,
        filters: input.filters ?? null,
        tenantId: actor.tenantId ?? null,
      },
    });
  }

  async exportReportCsv(
    query: ExportReportQuery,
    actorRole: AppRole,
    tenantId?: string,
    actor?: ReportAuditActor
  ): Promise<{ filename: string; csv: string }> {
    const result = await this.buildReportCsv(query, actorRole, tenantId);
    if (actor) {
      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.report,
        entityId: query.reportType,
        action: AUDIT_ACTION.reportExported,
        actorName: actor.displayName,
        actorUserId: actor.userId,
        notes: `Exported ${query.reportType} report as ${query.format.toUpperCase()}.`,
        metadata: {
          reportType: query.reportType,
          format: query.format,
          filters: query,
          tenantId: actor.tenantId ?? tenantId ?? null,
        },
      });
    }
    return result;
  }

  private async buildReportCsv(
    query: ExportReportQuery,
    actorRole: AppRole,
    tenantId?: string
  ): Promise<{ filename: string; csv: string }> {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const dateStamp = new Date().toISOString().split("T")[0];

    // Export uses page size 2000 to capture complete export dataset
    const exportFilters: BaseReportQuery = {
      ...query,
      page: 1,
      pageSize: 2000,
    };

    switch (query.reportType) {
      case "assets": {
        const res = await this.getAssetRegisterReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Asset Code",
          "Name",
          "Category",
          "Classification",
          "Status",
          "Assignment Type",
          "Location",
          "Department",
          "Current Holder",
          "Purchase Date",
          ...(canViewCosts ? ["Cost / Valuation"] : []),
          "Serial Number",
        ];
        const rows = res.data.map((r) => [
          r.assetCode,
          r.name,
          r.category,
          r.classification || "",
          r.status,
          r.assignmentType,
          r.location,
          r.department || "",
          r.currentHolder || "",
          r.purchaseDate || "",
          ...(canViewCosts ? [r.currentValue != null ? r.currentValue.toFixed(2) : ""] : []),
          r.serialNumber || "",
        ]);
        return {
          filename: `asset-register-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "consumables": {
        const res = await this.getConsumablesReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Item Code",
          "Name",
          "Category",
          "Classification",
          "Unit",
          "Current Qty",
          "Reserved Qty",
          "Available Qty",
          "Min Threshold",
          "Location",
          ...(canViewCosts ? ["Unit Cost", "Stock Value"] : []),
          "30d Usage",
          "90d Usage",
          "Days Remaining",
          "Low Stock Alert",
        ];
        const rows = res.data.map((r) => [
          r.itemCode,
          r.name,
          r.category,
          r.classification || "",
          r.unit,
          r.currentQty,
          r.reservedQty,
          r.availableQty,
          r.minThreshold,
          r.location,
          ...(canViewCosts
            ? [
                r.unitCost != null ? r.unitCost.toFixed(2) : "",
                r.stockValuation != null ? r.stockValuation.toFixed(2) : "",
              ]
            : []),
          r.usage30d,
          r.usage90d,
          r.estimatedDaysRemaining ?? "N/A",
          r.isLowStock ? "YES" : "NO",
        ]);
        return {
          filename: `consumables-stock-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "purchase-orders": {
        const res = await this.getPurchaseOrdersReport(exportFilters, actorRole, tenantId);
        const headers = [
          "PO Number",
          "Supplier",
          "Status",
          "Type",
          "Classification",
          ...(canViewCosts ? ["Total Amount"] : []),
          "Quantity",
          "Purchased On",
          "Items Preview",
        ];
        const rows = res.data.map((r) => [
          r.poNumber,
          r.supplierName,
          r.status,
          r.itemType,
          r.classification === "material"
            ? "Material"
            : r.classification === "supply"
              ? "Supply"
              : "Asset",
          ...(canViewCosts ? [r.totalAmount != null ? r.totalAmount.toFixed(2) : ""] : []),
          r.totalQuantity,
          r.purchasedOn,
          r.itemsPreview,
        ]);
        return {
          filename: `purchase-orders-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "requests": {
        const res = await this.getRequestsReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Request Code",
          "Type",
          "Classification",
          "Requester",
          "Department",
          "Status",
          "Items Count",
          "Summary",
          "Requested At",
        ];
        const rows = res.data.map((r) => {
          const classification: string | undefined = r.classification;
          return [
            r.requestCode,
            r.requestType,
            classification || r.requestType,
            r.requesterName,
            r.department,
            r.status,
            r.itemsCount,
            r.itemsSummary,
            r.requestedAt,
          ];
        });
        return {
          filename: `requests-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "maintenance": {
        const res = await this.getMaintenanceReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Log Code",
          "Asset Code",
          "Asset Name",
          "Category",
          "Department",
          "Condition",
          "Date Logged",
          "Status",
          "Resolution Date",
          ...(canViewCosts ? ["Repair Cost"] : []),
          "MTTR (Days)",
          "Logged By",
          "Issue Notes",
          "Work Notes",
          "Parts",
          "Resolution Notes",
        ];
        const rows = res.data.map((r) => {
          const partsLabel = (r.repairParts ?? [])
            .map((p) =>
              canViewCosts && p.cost != null && p.cost !== ""
                ? `${p.name} (${p.cost})`
                : p.name
            )
            .join("; ");
          return [
            r.logCode,
            r.assetCode,
            r.assetName,
            r.category,
            r.department || "General",
            r.condition,
            r.dateLogged,
            r.isResolved ? "Resolved" : "Open",
            r.resolutionDate || "",
            ...(canViewCosts ? [r.repairCost != null ? r.repairCost.toFixed(2) : ""] : []),
            r.mttrDays ?? "",
            r.loggedByName,
            r.notes ?? "",
            r.workNotes ?? "",
            partsLabel,
            r.resolutionNotes ?? "",
          ];
        });
        return {
          filename: `maintenance-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "projects": {
        const res = await this.getProjectsReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Project Code",
          "Project Name",
          "Department",
          "Status",
          "Start Date",
          "End Date",
          "Assigned Assets",
          "Supplies Consumed",
          "Materials Consumed",
          "Total Consumables Consumed",
          ...(canViewCosts
            ? ["Supplies Value", "Materials Value", "Consumables Value", "Total Project Cost"]
            : []),
          "Manager",
          "Description",
        ];
        const rows = res.data.map((r) => [
          r.projectCode,
          r.projectName,
          r.department,
          r.status,
          r.startDate,
          r.endDate || "",
          r.assignedAssetsCount,
          r.suppliesConsumedCount ?? 0,
          r.materialsConsumedCount ?? 0,
          r.consumablesConsumedCount,
          ...(canViewCosts
            ? [
                r.suppliesValue != null ? r.suppliesValue.toFixed(2) : "",
                r.materialsValue != null ? r.materialsValue.toFixed(2) : "",
                r.consumablesValue != null ? r.consumablesValue.toFixed(2) : "",
                r.totalProjectCost != null ? r.totalProjectCost.toFixed(2) : "",
              ]
            : []),
          r.managerName || "",
          r.description || "",
        ]);
        return {
          filename: `project-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "departments": {
        const res = await this.getDepartmentsReport(exportFilters, actorRole, tenantId);
        const headers = [
          "Department Name",
          "Assets Assigned",
          ...(canViewCosts ? ["Assets Valuation"] : []),
          "Supplies Consumed",
          "Materials Consumed",
          "Total Consumables Consumed",
          ...(canViewCosts
            ? ["Supplies Valuation", "Materials Valuation", "Total Consumables Valuation"]
            : []),
          "Active Maintenance",
          "Active Projects",
          "Top Assets",
        ];
        const rows = res.data.map((r) => [
          r.departmentName,
          r.assetsAssignedCount,
          ...(canViewCosts ? [r.assetsValue != null ? r.assetsValue.toFixed(2) : ""] : []),
          r.suppliesConsumedCount ?? 0,
          r.materialsConsumedCount ?? 0,
          r.consumablesConsumedCount,
          ...(canViewCosts
            ? [
                r.suppliesValue != null ? r.suppliesValue.toFixed(2) : "",
                r.materialsValue != null ? r.materialsValue.toFixed(2) : "",
                r.consumablesValue != null ? r.consumablesValue.toFixed(2) : "",
              ]
            : []),
          r.activeMaintenanceCount,
          r.activeProjects,
          (r.topAssets || []).join("; "),
        ]);
        return {
          filename: `department-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "executive": {
        const summary = await this.getExecutiveSummary(
          actorRole,
          tenantId,
          query.includeSandbox
        );
        const headers = [
          "Operational Domain",
          "Primary Metric / Valuation",
          "Unit / Volume",
          "Active / Health Status",
          "Operational Efficiency / Remarks",
        ];
        const rows: (string | number)[][] = [
          [
            "Capital Asset Registry",
            canViewCosts ? summary.assets.totalValue.toFixed(2) : "N/A",
            `${summary.assets.totalCount} Units`,
            `${summary.assets.activeCount} Active Ready`,
            `${summary.assets.inRepairCount} Under Repair`,
          ],
          [
            "Consumable Supplies",
            canViewCosts
              ? (summary.consumables.suppliesValuation ?? 0).toFixed(2)
              : "N/A",
            `${summary.consumables.suppliesCount ?? 0} SKUs`,
            (summary.consumables.suppliesLowStockCount ?? 0) > 0
              ? `${summary.consumables.suppliesLowStockCount} Below Threshold`
              : "Healthy",
            canViewCosts
              ? `₱${(summary.consumables.suppliesBurnRateValue ?? 0).toFixed(2)} 30d burn`
              : "N/A",
          ],
          [
            "Consumable Materials",
            canViewCosts
              ? (summary.consumables.materialsValuation ?? 0).toFixed(2)
              : "N/A",
            `${summary.consumables.materialsCount ?? 0} SKUs`,
            (summary.consumables.materialsLowStockCount ?? 0) > 0
              ? `${summary.consumables.materialsLowStockCount} Below Threshold`
              : "Healthy",
            canViewCosts
              ? `₱${(summary.consumables.materialsBurnRateValue ?? 0).toFixed(2)} 30d burn`
              : "N/A",
          ],
          [
            "Procurement & Purchase Orders",
            canViewCosts ? summary.procurement.totalSpend30d.toFixed(2) : "N/A",
            `${summary.procurement.openOrdersCount} Open POs`,
            `${summary.procurement.pendingDeliveryCount} Pending Delivery`,
            "30-Day Window",
          ],
          [
            "Requisitions (Borrow, Supplies & Materials)",
            `${summary.requests.fulfilledThisMonth} Fulfilled`,
            `${summary.requests.pendingCount} Pending (${summary.requests.borrowPendingCount ?? 0} Borrow · ${summary.requests.supplyPendingCount ?? 0} Supplies · ${summary.requests.materialPendingCount ?? 0} Materials)`,
            summary.requests.pendingCount === 0 ? "Queue Clear" : "Action Required",
            `${summary.requests.avgApprovalHours}h Avg Turnaround`,
          ],
          [
            "Maintenance & Repairs",
            canViewCosts ? summary.maintenance.totalRepairSpend30d.toFixed(2) : "N/A",
            `${summary.maintenance.activeIssuesCount} Active Work Orders`,
            `${summary.maintenance.resolvedThisMonth} Resolved this Month`,
            `${summary.maintenance.avgMttrDays} Days MTTR`,
          ],
        ];

        // Append monthly spend and categories if available
        let csvContent = toCsv(headers, rows);
        if (summary.charts.monthlySpendTrend && summary.charts.monthlySpendTrend.length > 0) {
          const spendHeaders = ["Month", ...(canViewCosts ? ["Procurement Spend", "Maintenance Spend"] : ["Status"])];
          const spendRows = summary.charts.monthlySpendTrend.map((m) => [
            m.month,
            ...(canViewCosts ? [m.procurement.toFixed(2), m.maintenance.toFixed(2)] : ["Recorded"]),
          ]);
          csvContent += "\r\n\r\n" + toCsv(spendHeaders, spendRows);
        }

        if (summary.charts.categoryDistribution && summary.charts.categoryDistribution.length > 0) {
          const catHeaders = ["Category Name", "Item Count", ...(canViewCosts ? ["Total Valuation"] : [])];
          const catRows = summary.charts.categoryDistribution.map((c) => [
            c.name,
            c.count,
            ...(canViewCosts ? [c.value.toFixed(2)] : []),
          ]);
          csvContent += "\r\n\r\n" + toCsv(catHeaders, catRows);
        }

        return {
          filename: `executive-overview-report-${dateStamp}.csv`,
          csv: csvContent,
        };
      }

      default: {
        return {
          filename: `report-${dateStamp}.csv`,
          csv: "Report,Type\r\nExecutive,Summary",
        };
      }
    }
  }
}
