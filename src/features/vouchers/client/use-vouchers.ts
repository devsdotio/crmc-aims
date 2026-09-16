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
import type { Voucher, VoucherStatus, VoucherType } from "@/types/vouchers";
import {
  vouchersApi,
  type CreateVoucherPayload,
  type UpdateVoucherPayload,
  type UpdateVoucherStatusPayload,
  type VoucherListResponse,
} from "./vouchers-api";
import { voucherQueryKeys } from "./query-keys";

/**
 * Real-time synchronization hook for vouchers.
 * Subscribes to database events via Supabase Realtime for the `vouchers` table,
 * automatically invalidating the voucher query cache on any INSERT, UPDATE, or DELETE.
 */
export function useVouchersRealtimeSync(enabled: boolean = true) {
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
        void qc.invalidateQueries({ queryKey: voucherQueryKeys.all });
      }, 200);
    };

    const channel = supabase
      .channel("vouchers-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vouchers" },
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

export function useVouchersQuery(filters?: {
  search?: string;
  type?: VoucherType;
  status?: VoucherStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): UseQueryResult<VoucherListResponse, Error> {
  return useQuery({
    queryKey: voucherQueryKeys.list(filters),
    queryFn: () => vouchersApi.list(filters),
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10 * 1000, // 10s live polling fallback
    refetchOnWindowFocus: true,
  });
}

export function useVoucherQuery(id: string): UseQueryResult<Voucher, Error> {
  return useQuery({
    queryKey: voucherQueryKeys.detail(id),
    queryFn: () => vouchersApi.get(id),
    enabled: Boolean(id),
    refetchInterval: 10 * 1000,
  });
}

export function useCreateVoucherMutation(): UseMutationResult<
  Voucher,
  Error,
  CreateVoucherPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vouchersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherQueryKeys.all });
    },
  });
}

export function useUpdateVoucherMutation(): UseMutationResult<
  Voucher,
  Error,
  { id: string; payload: UpdateVoucherPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => vouchersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherQueryKeys.all });
    },
  });
}

export function useUpdateVoucherStatusMutation(): UseMutationResult<
  Voucher,
  Error,
  { id: string; payload: UpdateVoucherStatusPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => vouchersApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherQueryKeys.all });
    },
  });
}

export function useDeleteVoucherMutation(): UseMutationResult<
  { success: boolean },
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => vouchersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherQueryKeys.all });
    },
  });
}
