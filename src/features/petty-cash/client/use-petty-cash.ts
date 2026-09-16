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

/**
 * Real-time synchronization hook for petty cash vouchers.
 * Subscribes to database events via Supabase Realtime for the `petty_cash_vouchers` table,
 * automatically invalidating the petty cash query cache on any change.
 */
export function usePettyCashRealtimeSync(enabled: boolean = true) {
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

    const channel = supabase
      .channel("petty-cash-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "petty_cash_vouchers" },
        () => triggerInvalidation()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          triggerInvalidation();
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pettyCashQueryKeys.all });
    },
  });
}
