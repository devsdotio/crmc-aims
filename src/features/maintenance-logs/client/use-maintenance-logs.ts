"use client";

/**
 * React Query hooks for maintenance logs.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";

import {
  maintenanceLogsApi,
  type CreateMaintenancePayload,
  type MaintenanceLog,
  type ResolveMaintenancePayload,
  type UpdateOpenMaintenancePayload,
} from "./maintenance-logs-api";
import { maintenanceQueryKeys } from "./query-keys";

/** Flagging, documenting, or resolving a log also flips asset status / lifecycle. */
const MAINTENANCE_DOMAINS = [
  "maintenance",
  "assets",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

export function useMaintenanceLogsQuery(filters?: {
  openOnly?: boolean;
  search?: string;
  condition?: MaintenanceLog["condition"];
  assetId?: string;
}): UseQueryResult<MaintenanceLog[], Error> {
  return useQuery({
    queryKey: maintenanceQueryKeys.list(filters),
    queryFn: () => maintenanceLogsApi.list(filters),
  });
}

export function useSyncMaintenanceOrphansMutation(): UseMutationResult<
  { created: number },
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => maintenanceLogsApi.syncOrphans(),
    onSuccess: () => {
      void invalidateDomains(queryClient, MAINTENANCE_DOMAINS);
    },
  });
}

export function useOpenMaintenanceLogForAssetQuery(
  assetId: string | undefined
): UseQueryResult<MaintenanceLog | null, Error> {
  return useQuery({
    queryKey: maintenanceQueryKeys.list({
      assetId,
      openOnly: true,
    }),
    queryFn: async () => {
      if (!assetId) return null;
      const rows = await maintenanceLogsApi.list({
        assetId,
        openOnly: true,
      });
      return rows[0] ?? null;
    },
    enabled: Boolean(assetId),
  });
}

export function useMaintenanceLogQuery(
  id: string
): UseQueryResult<MaintenanceLog, Error> {
  return useQuery({
    queryKey: maintenanceQueryKeys.detail(id),
    queryFn: () => maintenanceLogsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateMaintenanceLogMutation(): UseMutationResult<
  MaintenanceLog,
  Error,
  CreateMaintenancePayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => maintenanceLogsApi.create(payload),
    onSettled: () => {
      void invalidateDomains(qc, MAINTENANCE_DOMAINS);
    },
  });
}

export function useUpdateMaintenanceLogMutation(): UseMutationResult<
  MaintenanceLog,
  Error,
  { id: string } & UpdateOpenMaintenancePayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      maintenanceLogsApi.updateOpen(id, payload),
    onSettled: () => {
      void invalidateDomains(qc, MAINTENANCE_DOMAINS);
    },
  });
}

export function useResolveMaintenanceLogMutation(): UseMutationResult<
  MaintenanceLog,
  Error,
  { id: string } & ResolveMaintenancePayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => maintenanceLogsApi.resolve(id, payload),
    onSettled: () => {
      void invalidateDomains(qc, MAINTENANCE_DOMAINS);
    },
  });
}
