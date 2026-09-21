/**
 * Assets client data layer — list/CRUD + lifecycle + custody mutations.
 */

export {
  assetsApi,
  type AssetChangesMap,
  type AssetFieldChange,
  type AssetLifecycleEvent,
  type AssetLifecycleEventPayload,
  type FlagMaintenanceInput,
  type ReleaseAssetInput,
  type ReportMissingInput,
  type ScanResolveResult,
} from "./assets-api";
export { assetQueryKeys } from "./query-keys";
export {
  useAssetLifecycleQuery,
  useAssetQuery,
  useAssetsQuery,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useFlagMaintenanceMutation,
  useReleaseAssetMutation,
  useReportMissingMutation,
  useResolveScanMutation,
  useReturnAssetMutation,
  useScanReleaseMutation,
  useScanReturnMutation,
  useUpdateAssetMutation,
} from "./use-assets";
