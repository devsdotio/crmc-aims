/**
 * Maintenance logs client data layer — prepared for UI integration, not wired yet.
 */

export { maintenanceLogsApi } from "./maintenance-logs-api";
export type {
  CreateMaintenancePayload,
  MaintenanceLog,
} from "./maintenance-logs-api";
export { maintenanceQueryKeys } from "./query-keys";
export {
  useCreateMaintenanceLogMutation,
  useMaintenanceLogQuery,
  useMaintenanceLogsQuery,
  useResolveMaintenanceLogMutation,
} from "./use-maintenance-logs";
