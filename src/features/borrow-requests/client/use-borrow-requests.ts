"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type {
  ApproveBorrowRequestPayload,
  BorrowRequest,
  CreateBorrowRequestPayload,
  ReleaseBorrowRequestPayload,
  UpdateBorrowRequestPayload,
} from "./borrow-requests-api";
import { borrowRequestsApi } from "./borrow-requests-api";
import { borrowRequestQueryKeys } from "./query-keys";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";
import {
  CUSTODY_DOMAINS,
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";
import type { PaginatedResponse } from "@/features/shared/fetch-json";

/** Queue decisions that only move a request between statuses. */
const REQUEST_QUEUE_DOMAINS = [
  "borrowRequests",
  "dashboard",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

type CacheSnapshot = [readonly unknown[], unknown][];

/** Captures request caches so a failed optimistic status flip can be undone. */
function snapshotRequestCaches(
  qc: ReturnType<typeof useQueryClient>
): CacheSnapshot {
  return qc.getQueriesData({ queryKey: borrowRequestQueryKeys.all });
}

function restoreRequestCaches(
  qc: ReturnType<typeof useQueryClient>,
  snapshot?: CacheSnapshot
) {
  snapshot?.forEach(([queryKey, data]) => {
    qc.setQueryData(queryKey, data);
  });
}

/** Flips a request's status in every cached list and detail entry. */
function applyOptimisticStatus(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  status: BorrowRequest["status"]
) {
  qc.setQueriesData<PaginatedResponse<BorrowRequest[]>>(
    { queryKey: borrowRequestQueryKeys.lists() },
    (old) => {
      if (!old || !Array.isArray(old.data)) return old;
      return {
        ...old,
        data: old.data.map((req) => (req.id === id ? { ...req, status } : req)),
      };
    }
  );
  qc.setQueryData<BorrowRequest>(borrowRequestQueryKeys.detail(id), (old) =>
    old ? { ...old, status } : old
  );
}

export function useBorrowRequests(filters?: {
  status?: BorrowRequest["status"];
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  requestType?: "borrowable" | "assignable";
  enabled?: boolean;
  refetchInterval?: number | false;
}): UseQueryResult<PaginatedResponse<BorrowRequest[]>, Error> {
  const { enabled = true, refetchInterval, ...listFilters } = filters ?? {};
  return useQuery({
    queryKey: borrowRequestQueryKeys.list(listFilters),
    queryFn: () => borrowRequestsApi.list(listFilters),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function useBorrowRequestQuery(
  id: string
): UseQueryResult<BorrowRequest, Error> {
  return useQuery({
    queryKey: borrowRequestQueryKeys.detail(id),
    queryFn: () => borrowRequestsApi.getById(id),
    enabled: Boolean(id),
  });
}



export function useCreateBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  CreateBorrowRequestPayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => borrowRequestsApi.create(payload),
    onSuccess: (newRequest) => {
      // 1. Optimistically add to lists
      qc.setQueriesData<PaginatedResponse<BorrowRequest[]>>(
        { queryKey: borrowRequestQueryKeys.lists() },
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

      // 2. Optimistically update dashboard snapshot
      const firstItem = newRequest.items?.[0];
      const itemDesc = firstItem?.itemDescription || "Borrow Request";
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
                items: newRequest.items,
                requestedAt: newRequest.requestedAt,
                relativeTime: newRequest.relativeTime || "Just now",
              },
              ...(old.pendingRequests || []),
            ],
          };
        }
      );

    },
    // 3. Eventually consistent re-fetch
    onSettled: () => {
      void invalidateDomains(qc, REQUEST_QUEUE_DOMAINS);
    },
  });
}

export function useUpdateBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; payload: UpdateBorrowRequestPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => borrowRequestsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueriesData<BorrowRequest>(
        { queryKey: borrowRequestQueryKeys.detail(updated.id) },
        () => updated
      );
      qc.invalidateQueries({ queryKey: borrowRequestQueryKeys.all });
      qc.invalidateQueries({ queryKey: dashboardQueryKeys.all });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useApproveBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; payload?: ApproveBorrowRequestPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => borrowRequestsApi.approve(id, payload),
    onSuccess: (_, { id }) => {
      // Optimistically update dashboard
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
    onSettled: () => {
      void invalidateDomains(qc, REQUEST_QUEUE_DOMAINS);
    },
  });
}

export function useRejectBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; reason: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => borrowRequestsApi.reject(id, reason),
    onSuccess: (_, { id }) => {
      // Optimistically update dashboard
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
    onSettled: () => {
      void invalidateDomains(qc, REQUEST_QUEUE_DOMAINS);
    },
  });
}

export function useCancelBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; reason?: string; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, note }) =>
      borrowRequestsApi.cancel(id, { reason, note }),
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
    onSettled: () => {
      void invalidateDomains(qc, REQUEST_QUEUE_DOMAINS);
    },
  });
}

export function useUndoBorrowRequestApprovalMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => borrowRequestsApi.undoApproval(id, note),
    onSuccess: (updatedRequest) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueriesData<any>({ queryKey: dashboardQueryKeys.snapshot() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          summary: {
            ...old.summary,
            pendingApprovals: (old.summary?.pendingApprovals || 0) + 1,
          },
          pendingRequests: [
            {
              id: updatedRequest.id,
              requesterName: updatedRequest.requesterName,
              department: updatedRequest.department,
              items: updatedRequest.items,
              requestedAt: updatedRequest.requestedAt,
              relativeTime: updatedRequest.relativeTime,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(old.pendingRequests || []).filter((r: any) => r.id !== updatedRequest.id),
          ],
        };
      });
    },
    onSettled: () => {
      void invalidateDomains(qc, REQUEST_QUEUE_DOMAINS);
    },
  });
}

export function useReleaseBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; payload: ReleaseBorrowRequestPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => borrowRequestsApi.release(id, payload),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: borrowRequestQueryKeys.all });
      const previous = snapshotRequestCaches(qc);
      applyOptimisticStatus(qc, id, "released");
      return { previous };
    },
    onError: (_err, _variables, context) => {
      restoreRequestCaches(qc, context?.previous);
    },
    onSettled: () => {
      void invalidateDomains(qc, CUSTODY_DOMAINS);
    },
  });
}

export function useMarkUnreleasedBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; payload?: { note?: string } }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => borrowRequestsApi.markUnreleased(id, payload),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: borrowRequestQueryKeys.all });
      const previous = snapshotRequestCaches(qc);
      applyOptimisticStatus(qc, id, "unreleased");
      return { previous };
    },
    onError: (_err, _variables, context) => {
      restoreRequestCaches(qc, context?.previous);
    },
    onSettled: () => {
      void invalidateDomains(qc, CUSTODY_DOMAINS);
    },
  });
}

export function useMarkReturnedBorrowRequestMutation(): UseMutationResult<
  BorrowRequest,
  Error,
  { id: string; payload: { returnedBy: string; note?: string } }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => borrowRequestsApi.markReturned(id, payload),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: borrowRequestQueryKeys.all });
      const previous = snapshotRequestCaches(qc);
      applyOptimisticStatus(qc, id, "returned");
      return { previous };
    },
    onError: (_err, _variables, context) => {
      restoreRequestCaches(qc, context?.previous);
    },
    onSettled: () => {
      void invalidateDomains(qc, CUSTODY_DOMAINS);
    },
  });
}
