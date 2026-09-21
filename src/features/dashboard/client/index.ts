/**
 * Dashboard client data layer.
 */

export { dashboardApi } from "./dashboard-api";
export type {
  DashboardSnapshot,
  DashboardSummary,
  DashboardNotification,
} from "./dashboard-api";
export { dashboardQueryKeys } from "./query-keys";
export {
  useDashboardNotificationsQuery,
  useDashboardSidebarSummaryQuery,
  useDashboardSnapshotQuery,
} from "./use-dashboard";
