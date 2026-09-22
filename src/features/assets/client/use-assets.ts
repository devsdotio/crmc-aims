"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  assetsApi,
  type AssetLifecycleEvent,
  type FlagMaintenanceInput,
  type ReleaseAssetInput,
  type ReportMissingInput,
  type ScanResolveResult,
} from "@/features/assets/client/assets-api";
import { assetQueryKeys } from "@/features/assets/client/query-keys";
import {
  CUSTODY_DOMAINS,
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";
import type {
  Asset,
  AssetStatus,
  CreateAssetInput,
  ReturnAssetInput,
  UpdateAssetInput,
} from "@/types/assets";

/** Registry edits: the asset row, its lifecycle feed and dashboard rollups. */
const REGISTRY_DOMAINS = [
  "assets",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

/** Creating an asset with a value also opens a purchase lot server-side. */
const REGISTRY_CREATE_DOMAINS = [
  ...REGISTRY_DOMAINS,
  "purchaseLots",
] as const satisfies readonly CacheDomain[];

/** Flagging writes a maintenance log and flips asset status. */
const MAINTENANCE_FLAG_DOMAINS = [
  "assets",
  "maintenance",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

/** Lists are cached per status filter, so update each one that is loaded. */
function updateCachedAssetLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (assets: Asset[], status?: AssetStatus) => Asset[]
) {
  const entries = queryClient.getQueriesData<Asset[]>({
    queryKey: assetQueryKeys.lists(),
  });

  entries.forEach(([queryKey, assets]) => {
    if (!assets) return;
    const status = (
      queryKey[2] as { status?: AssetStatus } | undefined
    )?.status;
    queryClient.setQueryData<Asset[]>(queryKey, updater(assets, status));
  });

  return entries;
}

function restoreCachedAssetLists(
  queryClient: ReturnType<typeof useQueryClient>,
  entries?: ReturnType<typeof updateCachedAssetLists>
) {
  entries?.forEach(([queryKey, assets]) => {
    queryClient.setQueryData(queryKey, assets);
  });
}

export function useAssetsQuery(status?: AssetStatus): UseQueryResult<Asset[], Error> {
  return useQuery({
    queryKey: assetQueryKeys.list({ status }),
    queryFn: () => assetsApi.listAssets(status),
    // Custody changes constantly, so fall back to the global 30s stale window
    // and let the cached list render while the refresh runs behind it.
    // Surface timeouts quickly — default multi-retry looked like infinite skeleton
    retry: 0,
  });
}

export function useAssetQuery(id: string): UseQueryResult<Asset, Error> {
  return useQuery({
    queryKey: assetQueryKeys.detail(id),
    queryFn: () => assetsApi.getAssetById(id),
    enabled: Boolean(id),
  });
}

export function useAssetLifecycleQuery(
  id: string,
  limit?: number
): UseQueryResult<AssetLifecycleEvent[], Error> {
  return useQuery({
    queryKey: assetQueryKeys.lifecycle(id),
    queryFn: () => assetsApi.listLifecycle(id, limit),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function useCreateAssetMutation(): UseMutationResult<Asset, Error, CreateAssetInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => assetsApi.createAsset(payload),
    onMutate: async (newAsset) => {
      await queryClient.cancelQueries({ queryKey: assetQueryKeys.lists() });

      const optimisticAsset: Asset = {
        id: `temp-${Date.now()}`,
        assetCode: newAsset.assetCode || `TEMP-${Date.now()}`,
        name: newAsset.name || "New Asset",
        category: newAsset.category || "",
        status: newAsset.status || "active",
        assignmentType: newAsset.assignmentType || "borrowable",
        serialNumber: newAsset.serialNumber,
        location: newAsset.location || "Unknown",
        department: newAsset.department,
        purchaseDate: newAsset.purchaseDate,
        value: newAsset.value,
        notes: newAsset.notes,
        lastUpdated: new Date().toISOString(),
        maintenanceHistory: [],
      };

      const previousLists = updateCachedAssetLists(
        queryClient,
        (assets, status) =>
          status && status !== optimisticAsset.status
            ? assets
            : [...assets, optimisticAsset]
      );

      return { previousLists };
    },
    onError: (_err, _newAsset, context) => {
      restoreCachedAssetLists(queryClient, context?.previousLists);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, REGISTRY_CREATE_DOMAINS);
    },
  });
}

export function useUpdateAssetMutation(): UseMutationResult<
  Asset,
  Error,
  { id: string; payload: UpdateAssetInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => assetsApi.updateAsset(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: assetQueryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: assetQueryKeys.detail(id) });

      const previousAsset = queryClient.getQueryData<Asset>(assetQueryKeys.detail(id));

      const previousLists = updateCachedAssetLists(queryClient, (assets) =>
        assets.map((asset) =>
          asset.id === id
            ? { ...asset, ...payload, lastUpdated: new Date().toISOString() }
            : asset
        )
      );

      if (previousAsset) {
        queryClient.setQueryData<Asset>(assetQueryKeys.detail(id), {
          ...previousAsset,
          ...payload,
          lastUpdated: new Date().toISOString(),
        });
      }

      return { previousLists, previousAsset };
    },
    onError: (_err, variables, context) => {
      restoreCachedAssetLists(queryClient, context?.previousLists);
      if (context?.previousAsset) {
        queryClient.setQueryData(assetQueryKeys.detail(variables.id), context.previousAsset);
      }
    },
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, REGISTRY_DOMAINS);
    },
  });
}

export function useDeleteAssetMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => assetsApi.deleteAsset(id),
    onSuccess: (_void, id) => {
      queryClient.removeQueries({ queryKey: assetQueryKeys.detail(id) });
    },
    onSettled: () => {
      void invalidateDomains(queryClient, REGISTRY_DOMAINS);
    },
  });
}

export function useReleaseAssetMutation(): UseMutationResult<
  Asset,
  Error,
  { id: string; payload: ReleaseAssetInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => assetsApi.releaseAsset(id, payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}

export function useReturnAssetMutation(): UseMutationResult<
  Asset,
  Error,
  { id: string; payload: ReturnAssetInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => assetsApi.returnAsset(id, payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}

export function useFlagMaintenanceMutation(): UseMutationResult<
  Asset,
  Error,
  { id: string; payload: FlagMaintenanceInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => assetsApi.flagForMaintenance(id, payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, MAINTENANCE_FLAG_DOMAINS);
    },
  });
}

export function useReportMissingMutation(): UseMutationResult<
  Asset,
  Error,
  { id: string; payload: ReportMissingInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => assetsApi.reportMissing(id, payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, MAINTENANCE_FLAG_DOMAINS);
    },
  });
}

export function useResolveScanMutation(): UseMutationResult<
  ScanResolveResult,
  Error,
  string
> {
  return useMutation({
    mutationFn: (code) => assetsApi.resolveScan(code),
  });
}

export function useScanReleaseMutation(): UseMutationResult<
  Asset,
  Error,
  ReleaseAssetInput & { code: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => assetsApi.scanRelease(payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}

export function useScanReturnMutation(): UseMutationResult<
  Asset,
  Error,
  ReturnAssetInput & { code: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => assetsApi.scanReturn(payload),
    onSuccess: (asset) => {
      queryClient.setQueryData(assetQueryKeys.detail(asset.id), asset);
    },
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}
