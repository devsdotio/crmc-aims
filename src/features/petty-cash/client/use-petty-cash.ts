"use client";

import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { PettyCashVoucher, PettyCashStatus } from "@/types/petty-cash";
import {
  pettyCashApi,
  type CreatePettyCashPayload,
  type UpdatePettyCashPayload,
  type UpdatePettyCashStatusPayload,
  type PettyCashListResponse,
} from "./petty-cash-api";
import { pettyCashQueryKeys } from "./query-keys";
import { invalidateDomains } from "@/features/shared/cache-invalidation";

/**
 * Real-time synchronization hook for petty cash vouchers.
 * Subscribes to database events via Supabase Realtime for the `petty_cash_vouchers` table,
 * automatically invalidating the petty cash query cache on any change.
 */
export function usePettyCashRealtimeSync(enabled: boolean = true, tenantId?: string) {
  const qc = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const triggerInvalidation = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
      }, 200);
    };

    let hasSubscribedOnce = false;

    const filter = tenantId ? `tenant_id=eq.${tenantId}` : undefined;
    const channel = supabase
      .channel(`petty-cash-realtime-sync${tenantId ? `-${tenantId}` : ""}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "petty_cash_vouchers", filter },
        () => triggerInvalidation()
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (!hasSubscribedOnce) {
          hasSubscribedOnce = true;
          return;
        }
        triggerInvalidation();
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc, tenantId]);
}

export function usePettyCashListQuery(filters?: {
  search?: string;
  status?: PettyCashStatus;
  category?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): UseQueryResult<PettyCashListResponse, Error> {
  return useQuery({
    queryKey: pettyCashQueryKeys.list(filters),
    queryFn: () => pettyCashApi.list(filters),
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10 * 1000, // 10s live polling fallback
    refetchOnWindowFocus: true,
  });
}

export function usePettyCashQuery(id: string): UseQueryResult<PettyCashVoucher, Error> {
  return useQuery({
    queryKey: pettyCashQueryKeys.detail(id),
    queryFn: () => pettyCashApi.get(id),
    enabled: Boolean(id),
    refetchInterval: 10 * 1000,
  });
}

export function useNextPcvCodeQuery(
  enabled: boolean = true
): UseQueryResult<{ pcvNumber: string }, Error> {
  return useQuery({
    queryKey: [...pettyCashQueryKeys.all, "next-code"],
    queryFn: () => pettyCashApi.getNextCode(),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

const PETTY_CASH_MUTATION_DOMAINS = ["purchaseLots", "auditLogs"] as const;

export function useCreatePettyCashMutation(): UseMutationResult<
  PettyCashVoucher,
  Error,
  CreatePettyCashPayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => pettyCashApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
      void invalidateDomains(qc, PETTY_CASH_MUTATION_DOMAINS);
    },
  });
}

export function useUpdatePettyCashMutation(): UseMutationResult<
  PettyCashVoucher,
  Error,
  { id: string; payload: UpdatePettyCashPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => pettyCashApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
      void invalidateDomains(qc, PETTY_CASH_MUTATION_DOMAINS);
    },
  });
}

export function useUpdatePettyCashStatusMutation(): UseMutationResult<
  PettyCashVoucher,
  Error,
  { id: string; payload: UpdatePettyCashStatusPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => pettyCashApi.updateStatus(id, payload),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
      void invalidateDomains(qc, PETTY_CASH_MUTATION_DOMAINS);
    },
  });
}

export function useDeletePettyCashMutation(): UseMutationResult<
  { success: boolean },
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pettyCashApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: pettyCashQueryKeys.all });

      const previousLists = qc.getQueriesData<PettyCashListResponse>({
        queryKey: pettyCashQueryKeys.lists(),
      });
      const previousDetail = qc.getQueryData<PettyCashVoucher>(
        pettyCashQueryKeys.detail(id)
      );

      qc.setQueriesData<PettyCashListResponse>(
        { queryKey: pettyCashQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            total: Math.max(0, old.total - 1),
            vouchers: old.vouchers.filter((item) => item.id !== id),
          };
        }
      );
      qc.removeQueries({ queryKey: pettyCashQueryKeys.detail(id) });

      return { previousLists, previousDetail };
    },
    onError: (_err, id, context) => {
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          qc.setQueryData(queryKey, data);
        }
      }
      if (context?.previousDetail) {
        qc.setQueryData(pettyCashQueryKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
      void invalidateDomains(qc, PETTY_CASH_MUTATION_DOMAINS);
    },
  });
}
