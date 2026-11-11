"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { PaginatedResponse } from "@/features/shared/fetch-json";
import {
  STOCK_DOMAINS,
  invalidateDomains,
} from "@/features/shared/cache-invalidation";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";

import {
  deriveConsumableRequestKind,
  type ConsumableRequestKind,
} from "@/lib/consumable-classification";
import {
  consumableRequestsApi,
  type ApproveConsumableRequestPayload,
  type ConsumableRequest,
  type CreateConsumableRequestPayload,
  type ReleaseConsumableRequestPayload,
  type UpdateConsumableRequestPayload,
} from "./consumable-requests-api";
import { consumableRequestQueryKeys } from "./query-keys";

/**
 * Every requisition decision either reserves, frees or issues stock, so the
 * whole stock chain refreshes alongside the queue itself.
 */
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void invalidateDomains(qc, STOCK_DOMAINS);
}

export function useConsumableRequests(filters?: {
  status?: ConsumableRequest["status"];
  classification?: ConsumableRequestKind;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number | false;
  fetchAll?: boolean;
}): UseQueryResult<PaginatedResponse<ConsumableRequest[]>, Error> {
  const { enabled = true, refetchInterval, fetchAll = false, ...listFilters } = filters ?? {};
  return useQuery({
    queryKey: consumableRequestQueryKeys.list({ ...listFilters, fetchAll }),
    queryFn: () =>
      fetchAll
        ? consumableRequestsApi.listAll(listFilters)
        : consumableRequestsApi.list(listFilters),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function useCreateConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  CreateConsumableRequestPayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => consumableRequestsApi.create(payload),
    onSuccess: (newRequest) => {
      const firstLine = newRequest.lines?.[0];
      const itemDesc = firstLine
        ? `${firstLine.itemName}${newRequest.lines.length > 1 ? ` (+${newRequest.lines.length - 1} more)` : ""}`
        : "Consumable Requisition";
      const requestKind =
        newRequest.classification ??
        deriveConsumableRequestKind(
          (newRequest.lines ?? []).map((l) => l.classification)
        );

      const listQueries = qc.getQueriesData<PaginatedResponse<ConsumableRequest[]>>({
        queryKey: consumableRequestQueryKeys.lists(),
      });
      for (const [queryKey, old] of listQueries) {
        const filters = (queryKey[2] ?? {}) as {
          status?: string;
          classification?: ConsumableRequestKind;
          search?: string;
        };
        if (filters.status && filters.status !== "pending") continue;
        if (filters.search?.trim()) continue;
        if (filters.classification && filters.classification !== requestKind) continue;
        if (!old) continue;
        if (old.data.some((r) => r.id === newRequest.id)) continue;
        qc.setQueryData<PaginatedResponse<ConsumableRequest[]>>(queryKey, {
          ...old,
          data: [newRequest, ...old.data],
          meta: {
            ...old.meta,
            total: old.meta.total + 1,
          },
        });
      }

      // Optimistically update dashboard snapshot
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueriesData<any>(
        { queryKey: dashboardQueryKeys.snapshot() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            summary: {
              ...old.summary,
              pendingApprovals: (old.summary?.pendingApprovals || 0) + 1,
              totalRequests: (old.summary?.totalRequests || 0) + 1,
              ...(requestKind === "material"
                ? {
                    pendingMaterialRequests:
                      (old.summary?.pendingMaterialRequests || 0) + 1,
                  }
                : requestKind === "mixed"
                  ? {
                      pendingMixedRequests:
                        (old.summary?.pendingMixedRequests || 0) + 1,
                    }
                  : {
                      pendingSupplyRequests:
                        (old.summary?.pendingSupplyRequests || 0) + 1,
                    }),
            },
            pendingRequests: [
              {
                id: newRequest.id,
                requestCode: newRequest.requestCode,
                kind: requestKind,
                itemDescription: itemDesc,
                requesterName: newRequest.requesterName,
                department: newRequest.department,
                requestedAt: newRequest.requestedAt,
                relativeTime: newRequest.relativeTime || "Just now",
              },
              ...(old.pendingRequests || []),
            ],
          };
        }
      );
    },
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; payload: UpdateConsumableRequestPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => consumableRequestsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueriesData<ConsumableRequest>(
        { queryKey: consumableRequestQueryKeys.detail(updated.id) },
        () => updated
      );
      invalidate(qc);
    },
  });
}

export function useApproveConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; payload?: ApproveConsumableRequestPayload; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, note }) =>
      consumableRequestsApi.approve(id, payload ?? (note ? { note } : undefined)),
    onSettled: () => invalidate(qc),
  });
}

export function useRejectConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; reason: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => consumableRequestsApi.reject(id, reason),
    onSettled: () => invalidate(qc),
  });
}

export function useCancelConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; reason?: string; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, note }) =>
      consumableRequestsApi.cancel(id, { reason, note }),
    onMutate: async ({ id, reason, note }) => {
      await qc.cancelQueries({ queryKey: consumableRequestQueryKeys.lists() });
      const prevLists = qc.getQueriesData<PaginatedResponse<ConsumableRequest[]>>({
        queryKey: consumableRequestQueryKeys.lists(),
      });
      const prevSnapshots = qc.getQueriesData<{
        summary?: { pendingApprovals?: number };
        pendingRequests?: Array<{ id: string }>;
      }>({
        queryKey: dashboardQueryKeys.snapshot(),
      });
      let cancelledPending = false;
      for (const [queryKey, old] of prevLists) {
        if (!old) continue;
        const match = old.data.find((r) => r.id === id);
        if (match?.status === "pending") cancelledPending = true;
        const filters = (queryKey[2] ?? {}) as { status?: string };
        const shouldRemove = Boolean(filters.status && filters.status !== "cancelled");
        qc.setQueryData<PaginatedResponse<ConsumableRequest[]>>(queryKey, {
          ...old,
          data: shouldRemove
            ? old.data.filter((r) => r.id !== id)
            : old.data.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: "cancelled",
                      cancellationReason: (reason ?? note ?? "").trim() || r.cancellationReason,
                    }
                  : r
              ),
        });
      }
      qc.setQueriesData<{
        summary?: { pendingApprovals?: number };
        pendingRequests?: Array<{ id: string }>;
      }>({ queryKey: dashboardQueryKeys.snapshot() }, (old) => {
        if (!old) return old;
        const inPending = (old.pendingRequests || []).some((r) => r.id === id);
        return {
          ...old,
          summary: {
            ...old.summary,
            pendingApprovals:
              cancelledPending || inPending
                ? Math.max(0, (old.summary?.pendingApprovals || 1) - 1)
                : old.summary?.pendingApprovals,
          },
          pendingRequests: (old.pendingRequests || []).filter((r) => r.id !== id),
        };
      });
      return { prevLists, prevSnapshots };
    },
    onError: (_err, _vars, ctx) => {
      const typed = ctx as {
        prevLists?: Array<[readonly unknown[], PaginatedResponse<ConsumableRequest[]> | undefined]>;
        prevSnapshots?: Array<
          [
            readonly unknown[],
            | {
                summary?: { pendingApprovals?: number };
                pendingRequests?: Array<{ id: string }>;
              }
            | undefined,
          ]
        >;
      } | undefined;
      for (const [key, data] of typed?.prevLists ?? []) {
        qc.setQueryData(key, data);
      }
      for (const [key, data] of typed?.prevSnapshots ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => invalidate(qc),
  });
}

export function useUndoConsumableRequestApprovalMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => consumableRequestsApi.undoApproval(id, note),
    onSettled: () => invalidate(qc),
  });
}

export function useReleaseConsumableRequestMutation(): UseMutationResult<
  ConsumableRequest,
  Error,
  { id: string; payload: ReleaseConsumableRequestPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => consumableRequestsApi.release(id, payload),
    onSettled: () => invalidate(qc),
  });
}
