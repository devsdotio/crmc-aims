"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
import {
  fetchAssetDrilldownReport,
  fetchAssetRegisterReport,
  fetchConsumablesReport,
  fetchExecutiveSummary,
  fetchMaintenanceReport,
  fetchPurchaseOrdersReport,
  fetchRequestsReport,
} from "./reports-api";

export const reportKeys = {
  all: ["reports"] as const,
  summary: () => [...reportKeys.all, "summary"] as const,
  assets: (filters: BaseReportFilters) => [...reportKeys.all, "assets", filters] as const,
  assetDrilldown: (id: string) => [...reportKeys.all, "asset-drilldown", id] as const,
  consumables: (filters: BaseReportFilters) => [...reportKeys.all, "consumables", filters] as const,
  purchaseOrders: (filters: BaseReportFilters) => [...reportKeys.all, "purchase-orders", filters] as const,
  requests: (filters: BaseReportFilters) => [...reportKeys.all, "requests", filters] as const,
  maintenance: (filters: BaseReportFilters) => [...reportKeys.all, "maintenance", filters] as const,
};

export function useExecutiveReportQuery(initialData?: ExecutiveKpiSummary) {
  return useQuery({
    queryKey: reportKeys.summary(),
    queryFn: fetchExecutiveSummary,
    initialData,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAssetRegisterReportQuery(
  filters: BaseReportFilters,
  initialData?: PaginatedReportResponse<AssetRegisterRow, AssetRegisterSummary>
) {
  return useQuery({
    queryKey: reportKeys.assets(filters),
    queryFn: () => fetchAssetRegisterReport(filters),
    initialData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAssetDrilldownReportQuery(
  assetId: string,
  initialData?: AssetDrilldownReport
) {
  return useQuery({
    queryKey: reportKeys.assetDrilldown(assetId),
    queryFn: () => fetchAssetDrilldownReport(assetId),
    initialData,
    enabled: Boolean(assetId),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useConsumablesReportQuery(
  filters: BaseReportFilters,
  initialData?: PaginatedReportResponse<ConsumableStockRow, ConsumableStockSummary>
) {
  return useQuery({
    queryKey: reportKeys.consumables(filters),
    queryFn: () => fetchConsumablesReport(filters),
    initialData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseOrdersReportQuery(
  filters: BaseReportFilters,
  initialData?: PaginatedReportResponse<PurchaseOrderRow, PurchaseOrdersSummary>
) {
  return useQuery({
    queryKey: reportKeys.purchaseOrders(filters),
    queryFn: () => fetchPurchaseOrdersReport(filters),
    initialData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useRequestsReportQuery(
  filters: BaseReportFilters,
  initialData?: PaginatedReportResponse<RequestReportRow, RequestsSummary>
) {
  return useQuery({
    queryKey: reportKeys.requests(filters),
    queryFn: () => fetchRequestsReport(filters),
    initialData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useMaintenanceReportQuery(
  filters: BaseReportFilters,
  initialData?: PaginatedReportResponse<MaintenanceReportRow, MaintenanceSummary>
) {
  return useQuery({
    queryKey: reportKeys.maintenance(filters),
    queryFn: () => fetchMaintenanceReport(filters),
    initialData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}
