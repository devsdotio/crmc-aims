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
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number | false;
}): UseQueryResult<PaginatedResponse<ConsumableRequest[]>, Error> {
  const { enabled = true, refetchInterval, ...listFilters } = filters ?? {};
  return useQuery({
    queryKey: consumableRequestQueryKeys.list(listFilters),
    queryFn: () => consumableRequestsApi.list(listFilters),
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
        : "Supply Requisition";

      qc.setQueriesData<PaginatedResponse<ConsumableRequest[]>>(
        { queryKey: consumableRequestQueryKeys.lists() },
        (old) => {
          if (!old) {
            return {
              data: [newRequest],
              meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };
          }
          return {
            ...old,
            data: [newRequest, ...old.data],
            meta: {
              ...old.meta,
              total: old.meta.total + 1,
            },
          };
        }
      );

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
            },
            pendingRequests: [
              {
                id: newRequest.id,
                itemDescription: itemDesc,
                requesterName: newRequest.requesterName,
                department: newRequest.department,
                items: newRequest.lines.map((l) => ({
                  itemDescription: l.itemName,
                  quantity: l.quantityRequested,
                  itemType: "consumable",
                })),
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
    onSuccess: (_, { id }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueriesData<any>({ queryKey: dashboardQueryKeys.snapshot() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          summary: {
            ...old.summary,
            pendingApprovals: Math.max(0, (old.summary?.pendingApprovals || 1) - 1),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pendingRequests: (old.pendingRequests || []).filter((r: any) => r.id !== id),
        };
      });
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
