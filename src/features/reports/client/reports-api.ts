import type {
  AssetDrilldownReport,
  AssetRegisterRow,
  AssetRegisterSummary,
  BaseReportFilters,
  ConsumableStockRow,
  ConsumableStockSummary,
  ExecutiveKpiSummary,
  MaintenanceReportRow,
  MaintenanceSummary,
  PaginatedReportResponse,
  PurchaseOrderRow,
  PurchaseOrdersSummary,
  RequestReportRow,
  RequestsSummary,
} from "@/types/reports";

function toQueryString(filters: BaseReportFilters): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export async function fetchExecutiveSummary(): Promise<ExecutiveKpiSummary> {
  const res = await fetch("/api/reports/summary");
  if (!res.ok) throw new Error("Failed to fetch executive report summary");
  const json = await res.json();
  return json.data;
}

export async function fetchAssetRegisterReport(
  filters: BaseReportFilters
): Promise<PaginatedReportResponse<AssetRegisterRow, AssetRegisterSummary>> {
  const res = await fetch(`/api/reports/assets${toQueryString(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch asset register report");
  const json = await res.json();
  return json.data;
}

export async function fetchAssetDrilldownReport(
  assetId: string
): Promise<AssetDrilldownReport> {
  const res = await fetch(`/api/reports/assets/${assetId}`);
  if (!res.ok) throw new Error("Failed to fetch asset drilldown report");
  const json = await res.json();
  return json.data;
}

export async function fetchConsumablesReport(
  filters: BaseReportFilters
): Promise<PaginatedReportResponse<ConsumableStockRow, ConsumableStockSummary>> {
  const res = await fetch(`/api/reports/consumables${toQueryString(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch consumables report");
  const json = await res.json();
  return json.data;
}

export async function fetchPurchaseOrdersReport(
  filters: BaseReportFilters
): Promise<PaginatedReportResponse<PurchaseOrderRow, PurchaseOrdersSummary>> {
  const res = await fetch(`/api/reports/purchase-orders${toQueryString(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch purchase orders report");
  const json = await res.json();
  return json.data;
}

export async function fetchRequestsReport(
  filters: BaseReportFilters
): Promise<PaginatedReportResponse<RequestReportRow, RequestsSummary>> {
  const res = await fetch(`/api/reports/requests${toQueryString(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch requests report");
  const json = await res.json();
  return json.data;
}

export async function fetchMaintenanceReport(
  filters: BaseReportFilters
): Promise<PaginatedReportResponse<MaintenanceReportRow, MaintenanceSummary>> {
  const res = await fetch(`/api/reports/maintenance${toQueryString(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch maintenance report");
  const json = await res.json();
  return json.data;
}

export function getExportUrl(
  reportType: string,
  filters: BaseReportFilters = {},
  format: "csv" | "pdf" = "csv"
): string {
  const sp = new URLSearchParams();
  sp.set("reportType", reportType);
  sp.set("format", format);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  }
  return `/api/reports/export?${sp.toString()}`;
}
