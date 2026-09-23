/**
 * Maintenance logs client data layer.
 */

export { maintenanceLogsApi } from "./maintenance-logs-api";
export type {
  CreateMaintenancePayload,
  MaintenanceLog,
  ResolveMaintenancePayload,
  UpdateOpenMaintenancePayload,
} from "./maintenance-logs-api";
export { maintenanceQueryKeys } from "./query-keys";
export {
  useCreateMaintenanceLogMutation,
  useMaintenanceLogQuery,
  useMaintenanceLogsQuery,
  useOpenMaintenanceLogForAssetQuery,
  useResolveMaintenanceLogMutation,
  useUpdateMaintenanceLogMutation,
} from "./use-maintenance-logs";
