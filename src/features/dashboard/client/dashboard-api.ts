import type {
  DashboardSnapshotDTO,
  DashboardSummaryDTO,
  DashboardNotificationItem,
  DashboardAssetRowDTO,
  StockVolumeResponseDTO,
  DashboardCategoryCount,
  DashboardPendingRequest as DashboardPendingRequestDTO,
} from "@/server/modules/dashboard/dashboard.service";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type DashboardSnapshot = DashboardSnapshotDTO;
export type DashboardSummary = DashboardSummaryDTO;
export type DashboardNotification = DashboardNotificationItem;
export type DashboardAssetRow = DashboardAssetRowDTO;
export type DashboardPendingRequest = DashboardPendingRequestDTO;
export type StockVolumeData = StockVolumeResponseDTO;
export type TopCategoryItem = DashboardCategoryCount;

export const dashboardApi = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const res = await fetchJson<ApiResponse<DashboardSnapshot>>("/api/dashboard");
    return res.data;
  },

  /** Sidebar badge counts only (cheap). */
  async getSidebarSummary(): Promise<DashboardSummary> {
    const res = await fetchJson<ApiResponse<DashboardSummary>>(
      "/api/dashboard?scope=sidebar"
    );
    return res.data;
  },

  /** Header bell alerts (overdue, pending, low stock). */
  async getNotifications(): Promise<DashboardNotification[]> {
    const res = await fetchJson<ApiResponse<DashboardNotification[]>>(
      "/api/dashboard?scope=notifications"
    );
    return res.data;
  },

  /** Stock volume time-series (inflow vs outflow). */
  async getStockVolume(params?: {
    timeframe?: "weekly" | "monthly" | "yearly";
    category?: string;
  }): Promise<StockVolumeData> {
    const searchParams = new URLSearchParams();
    if (params?.timeframe) searchParams.set("timeframe", params.timeframe);
    if (params?.category && params.category !== "all") {
      searchParams.set("category", params.category);
    }
    const queryString = searchParams.toString();
    const url = `/api/dashboard/stock-volume${queryString ? `?${queryString}` : ""}`;
    const res = await fetchJson<ApiResponse<StockVolumeData>>(url);
    return res.data;
  },

  /** Live dashboard asset rows with custody and valuation. */
  async getDashboardAssets(params?: {
    limit?: number;
    search?: string;
    tag?: string;
  }): Promise<DashboardAssetRow[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.tag) searchParams.set("tag", params.tag);
    const queryString = searchParams.toString();
    const url = `/api/dashboard/assets${queryString ? `?${queryString}` : ""}`;
    const res = await fetchJson<ApiResponse<DashboardAssetRow[]>>(url);
    return res.data;
  },

  /** Combined category distribution (assets + consumables). */
  async getTopCategories(params?: {
    limit?: number;
    source?: "all" | "assets" | "consumables";
  }): Promise<TopCategoryItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.source) searchParams.set("source", params.source);
    const queryString = searchParams.toString();
    const url = `/api/dashboard/top-categories${queryString ? `?${queryString}` : ""}`;
    const res = await fetchJson<ApiResponse<TopCategoryItem[]>>(url);
    return res.data;
  },
};
