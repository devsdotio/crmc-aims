"use client";

/**
 * React Query hooks for dashboard aggregates with optimized client-side caching.
 * - staleTime: data remains fresh for 60s without refetching
 * - gcTime: cached in memory for 5 minutes
 * - placeholderData: keeps previous data during background re-validations (prevents skeleton flashes)
 * - refetchInterval: 60s background polling so the dashboard stays live without user interaction
 * - refetchOnWindowFocus: true so returning to the tab immediately resyncs if data is stale
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  dashboardApi,
  type DashboardSnapshot,
  type DashboardSummary,
  type DashboardNotification,
  type DashboardAssetRow,
  type StockVolumeData,
  type TopCategoryItem,
} from "./dashboard-api";
import { dashboardQueryKeys } from "./query-keys";

/** Full dashboard widgets — only enable on the dashboard page. */
export function useDashboardSnapshotQuery(options?: {
  enabled?: boolean;
  refetchInterval?: number | false;
}): UseQueryResult<DashboardSnapshot, Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.snapshot(),
    queryFn: () => dashboardApi.getSnapshot(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    // Re-enable window-focus sync so returning to the tab picks up changes made
    // elsewhere (another tab, another user). placeholderData prevents flashes.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Background poll — keeps widgets live without requiring navigation.
    refetchInterval: options?.refetchInterval ?? 60_000,
  });
}

/** Nav badge counts — safe to run from the shell; defer with `enabled` so page lists go first. */
export function useDashboardSidebarSummaryQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<DashboardSummary, Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.sidebarSummary(),
    queryFn: () => dashboardApi.getSidebarSummary(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    // Keep sidebar badge counts (pending, overdue, low-stock) live.
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

/** Header notification bell. */
export function useDashboardNotificationsQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<DashboardNotification[], Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.notifications(),
    queryFn: () => dashboardApi.getNotifications(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}

/** Stock Volume inflow vs outflow query. */
export function useStockVolumeQuery(params?: {
  timeframe?: "weekly" | "monthly" | "yearly";
  category?: string;
  enabled?: boolean;
}): UseQueryResult<StockVolumeData, Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.stockVolume({
      timeframe: params?.timeframe,
      category: params?.category,
    }),
    queryFn: () =>
      dashboardApi.getStockVolume({
        timeframe: params?.timeframe,
        category: params?.category,
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    enabled: params?.enabled ?? true,
  });
}

/** Live dashboard asset rows query with search and tag filters. */
export function useDashboardAssetsQuery(params?: {
  limit?: number;
  search?: string;
  tag?: string;
  enabled?: boolean;
}): UseQueryResult<DashboardAssetRow[], Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.assets({
      limit: params?.limit,
      search: params?.search,
      tag: params?.tag,
    }),
    queryFn: () =>
      dashboardApi.getDashboardAssets({
        limit: params?.limit,
        search: params?.search,
        tag: params?.tag,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    enabled: params?.enabled ?? true,
  });
}

/** Combined top categories query. */
export function useTopCategoriesQuery(params?: {
  limit?: number;
  source?: "all" | "assets" | "consumables";
  enabled?: boolean;
}): UseQueryResult<TopCategoryItem[], Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.topCategories({
      limit: params?.limit,
      source: params?.source,
    }),
    queryFn: () =>
      dashboardApi.getTopCategories({
        limit: params?.limit,
        source: params?.source,
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    enabled: params?.enabled ?? true,
  });
}
