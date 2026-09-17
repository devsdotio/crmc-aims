export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  snapshot: () => [...dashboardQueryKeys.all, "snapshot"] as const,
  sidebarSummary: () => [...dashboardQueryKeys.all, "sidebar-summary"] as const,
  notifications: () => [...dashboardQueryKeys.all, "notifications"] as const,
  stockVolume: (params?: { timeframe?: string; category?: string }) =>
    [...dashboardQueryKeys.all, "stock-volume", params] as const,
  assets: (params?: { limit?: number; search?: string; tag?: string }) =>
    [...dashboardQueryKeys.all, "assets", params] as const,
  topCategories: (params?: { limit?: number; source?: string }) =>
    [...dashboardQueryKeys.all, "top-categories", params] as const,
};
