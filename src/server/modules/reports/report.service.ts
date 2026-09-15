import { isAssetOperatorRole, type AppRole } from "@/server/shared/roles";
import { ReportRepository } from "./report.repository";
import type { BaseReportQuery, ExportReportQuery } from "./report.validation";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((r) => r.map(escapeCsvField).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

export class ReportService {
  constructor(private readonly repo = new ReportRepository()) {}

  // ─── 1. Executive Summary ─────────────────────────────────────────────────

  async getExecutiveSummary(actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const data = await this.repo.getExecutiveData();

    if (!canViewCosts) {
      data.assets.totalValue = 0;
      data.consumables.totalValuation = 0;
      data.consumables.monthBurnRateValue = 0;
      data.procurement.totalSpend30d = 0;
      data.maintenance.totalRepairSpend30d = 0;
      data.charts.monthlySpendTrend = data.charts.monthlySpendTrend.map((m) => ({
        month: m.month,
        procurement: 0,
        maintenance: 0,
      }));
      data.charts.categoryDistribution = data.charts.categoryDistribution.map((c) => ({
        name: c.name,
        count: c.count,
        value: 0,
      }));
    }

    return {
      ...data,
      canViewCosts,
    };
  }

  // ─── 2. Asset Register Report ─────────────────────────────────────────────

  async getAssetRegisterReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getAssetRegisterReport(filters);

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

  async getAssetDrilldownReport(assetId: string, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getAssetDrilldownReport(assetId);
    if (!result) return null;

    if (!canViewCosts) {
      result.asset.value = null;
      if (result.purchaseInfo) {
        result.purchaseInfo.unitCost = null;
      }
      result.maintenanceHistory = result.maintenanceHistory.map((m) => ({
        ...m,
        repairCost: null,
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

  async getConsumablesReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getConsumablesReport(filters);

    if (!canViewCosts) {
      result.summary.totalInventoryValuation = 0;
      result.summary.totalDispatchedValue30d = 0;
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

  async getPurchaseOrdersReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getPurchaseOrdersReport(filters);

    if (!canViewCosts) {
      result.summary.totalSpend = 0;
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

  async getRequestsReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getRequestsReport(filters);

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 7. Maintenance Report ────────────────────────────────────────────────

  async getMaintenanceReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getMaintenanceReport(filters);

    if (!canViewCosts) {
      result.summary.totalRepairSpend = 0;
      result.summary.topFaultyAssets = result.summary.topFaultyAssets.map((f) => ({
        ...f,
        totalCost: 0,
      }));
      result.data = result.data.map((row) => ({
        ...row,
        repairCost: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 8. Projects Report ───────────────────────────────────────────────────

  async getProjectsReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getProjectsReport(filters);

    if (!canViewCosts) {
      result.summary.totalProjectSpend = 0;
      result.data = result.data.map((row) => ({
        ...row,
        consumablesValue: null,
        totalProjectCost: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 9. Departments Report ────────────────────────────────────────────────

  async getDepartmentsReport(filters: BaseReportQuery, actorRole: AppRole) {
    const canViewCosts = isAssetOperatorRole(actorRole);
    const result = await this.repo.getDepartmentsReport(filters);

    if (!canViewCosts) {
      result.summary.totalAssetsValue = 0;
      result.summary.totalConsumablesValue = 0;
      result.data = result.data.map((row) => ({
        ...row,
        assetsValue: null,
        consumablesValue: null,
      }));
    }

    return {
      ...result,
      canViewCosts,
    };
  }

  // ─── 10. CSV Export Generation ────────────────────────────────────────────

  async exportReportCsv(query: ExportReportQuery, actorRole: AppRole): Promise<{ filename: string; csv: string }> {
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
        const res = await this.getAssetRegisterReport(exportFilters, actorRole);
        const headers = [
          "Asset Code",
          "Name",
          "Category",
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
        const res = await this.getConsumablesReport(exportFilters, actorRole);
        const headers = [
          "Item Code",
          "Name",
          "Category",
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
        const res = await this.getPurchaseOrdersReport(exportFilters, actorRole);
        const headers = [
          "PO Number",
          "Supplier",
          "Status",
          "Type",
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
        const res = await this.getRequestsReport(exportFilters, actorRole);
        const headers = [
          "Request Code",
          "Type",
          "Requester",
          "Department",
          "Status",
          "Items Count",
          "Summary",
          "Requested At",
        ];
        const rows = res.data.map((r) => [
          r.requestCode,
          r.requestType,
          r.requesterName,
          r.department,
          r.status,
          r.itemsCount,
          r.itemsSummary,
          r.requestedAt,
        ]);
        return {
          filename: `requests-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "maintenance": {
        const res = await this.getMaintenanceReport(exportFilters, actorRole);
        const headers = [
          "Log Code",
          "Asset Code",
          "Asset Name",
          "Category",
          "Condition",
          "Date Logged",
          "Status",
          "Resolution Date",
          ...(canViewCosts ? ["Repair Cost"] : []),
          "MTTR (Days)",
          "Logged By",
          "Notes",
        ];
        const rows = res.data.map((r) => [
          r.logCode,
          r.assetCode,
          r.assetName,
          r.category,
          r.condition,
          r.dateLogged,
          r.isResolved ? "Resolved" : "Open",
          r.resolutionDate || "",
          ...(canViewCosts ? [r.repairCost != null ? r.repairCost.toFixed(2) : ""] : []),
          r.mttrDays ?? "",
          r.loggedByName,
          r.notes,
        ]);
        return {
          filename: `maintenance-report-${dateStamp}.csv`,
          csv: toCsv(headers, rows),
        };
      }

      case "projects": {
        const res = await this.getProjectsReport(exportFilters, actorRole);
        const headers = [
          "Project Code",
          "Project Name",
          "Department",
          "Status",
          "Start Date",
          "End Date",
          "Assigned Assets",
          "Consumables Consumed",
          ...(canViewCosts ? ["Consumables Value", "Total Project Cost"] : []),
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
          r.consumablesConsumedCount,
          ...(canViewCosts
            ? [
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
        const res = await this.getDepartmentsReport(exportFilters, actorRole);
        const headers = [
          "Department Name",
          "Assets Assigned",
          ...(canViewCosts ? ["Assets Valuation"] : []),
          "Consumables Consumed",
          ...(canViewCosts ? ["Consumables Valuation"] : []),
          "Active Maintenance",
          "Active Projects",
          "Top Assets",
        ];
        const rows = res.data.map((r) => [
          r.departmentName,
          r.assetsAssignedCount,
          ...(canViewCosts ? [r.assetsValue != null ? r.assetsValue.toFixed(2) : ""] : []),
          r.consumablesConsumedCount,
          ...(canViewCosts ? [r.consumablesValue != null ? r.consumablesValue.toFixed(2) : ""] : []),
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
        const summary = await this.getExecutiveSummary(actorRole);
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
            "Consumable Supply Stores",
            canViewCosts ? summary.consumables.totalValuation.toFixed(2) : "N/A",
            `${summary.consumables.totalItems} SKUs`,
            summary.consumables.lowStockCount ? `${summary.consumables.lowStockCount} Below Threshold` : "Healthy",
            canViewCosts ? `₱${summary.consumables.monthBurnRateValue.toFixed(2)} 30d burn` : "N/A",
          ],
          [
            "Procurement & Purchase Orders",
            canViewCosts ? summary.procurement.totalSpend30d.toFixed(2) : "N/A",
            `${summary.procurement.openOrdersCount} Open POs`,
            `${summary.procurement.pendingDeliveryCount} Pending Delivery`,
            "30-Day Window",
          ],
          [
            "Supply Requests & Requisitions",
            `${summary.requests.fulfilledThisMonth} Fulfilled`,
            `${summary.requests.pendingCount} Pending Action`,
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
