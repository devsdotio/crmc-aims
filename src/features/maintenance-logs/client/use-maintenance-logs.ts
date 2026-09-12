"use client";

/**
 * React Query hooks for maintenance logs.
 * Ready for page integration — UI still uses mocks until wired.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useSandboxVisibility } from "@/components/providers/sandbox-visibility-context";
import {
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";

import {
  maintenanceLogsApi,
  type CreateMaintenancePayload,
  type MaintenanceLog,
} from "./maintenance-logs-api";
import { maintenanceQueryKeys } from "./query-keys";

/** Flagging or resolving a log also flips asset status and lifecycle history. */
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
}): UseQueryResult<MaintenanceLog[], Error> {
  const { includeSandbox } = useSandboxVisibility();
  const listFilters = { ...filters, includeSandbox };
  return useQuery({
    queryKey: maintenanceQueryKeys.list(listFilters),
    queryFn: () => maintenanceLogsApi.list(listFilters),
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

export function useResolveMaintenanceLogMutation(): UseMutationResult<
  MaintenanceLog,
  Error,
  { id: string } & import("./maintenance-logs-api").ResolveMaintenancePayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => maintenanceLogsApi.resolve(id, payload),
    onSettled: () => {
      void invalidateDomains(qc, MAINTENANCE_DOMAINS);
    },
  });
}
