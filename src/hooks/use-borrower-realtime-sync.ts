"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";
import { borrowRequestQueryKeys } from "@/features/borrow-requests/client/query-keys";
import { consumableRequestQueryKeys } from "@/features/consumable-requests/client/query-keys";
import { borrowLogQueryKeys } from "@/features/borrow-log/client/query-keys";

interface UseBorrowerRealtimeSyncOptions {
  enabled?: boolean;
  tenantId?: string;
}

/**
 * Subscribes to database changes for borrow requests, supply requisitions,
 * and borrow transactions, ensuring the borrower's dashboard and request queues
 * stay in real-time sync with database events.
 */
export function useBorrowerRealtimeSync(
  options: UseBorrowerRealtimeSyncOptions = {}
) {
  const { enabled = true, tenantId } = options;
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
        void Promise.all([
          qc.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
          qc.invalidateQueries({ queryKey: borrowRequestQueryKeys.all }),
          qc.invalidateQueries({ queryKey: consumableRequestQueryKeys.all }),
          qc.invalidateQueries({ queryKey: borrowLogQueryKeys.all }),
        ]);
      }, 250);
    };

    const filter = tenantId ? `tenant_id=eq.${tenantId}` : undefined;
    const channelName = `borrower-realtime-sync-${tenantId ?? "all"}-${Math.random().toString(36).slice(2)}`;
    const requestConfig = filter
      ? { event: "*" as const, schema: "public", table: "requests", filter }
      : { event: "*" as const, schema: "public", table: "requests" };
    const supplyConfig = filter
      ? { event: "*" as const, schema: "public", table: "consumable_requests", filter }
      : { event: "*" as const, schema: "public", table: "consumable_requests" };
    const custodyConfig = filter
      ? { event: "*" as const, schema: "public", table: "borrow_transactions", filter }
      : { event: "*" as const, schema: "public", table: "borrow_transactions" };
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", requestConfig, () => triggerInvalidation())
      .on("postgres_changes", supplyConfig, () => triggerInvalidation())
      .on("postgres_changes", custodyConfig, () => triggerInvalidation())
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
  }, [enabled, qc, tenantId]);
}
