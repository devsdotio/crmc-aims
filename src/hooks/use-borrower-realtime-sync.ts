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

type SyncDomain = "requests" | "supplies" | "custody";

/**
 * Subscribes to database changes for borrow requests, supply requisitions,
 * and borrow transactions, ensuring the borrower's dashboard and request queues
 * stay in real-time sync with database events.
 *
 * Invalidates only the affected query domains (plus dashboard snapshot), not
 * all four on every change.
 */
export function useBorrowerRealtimeSync(
  options: UseBorrowerRealtimeSyncOptions = {}
) {
  const { enabled = true, tenantId } = options;
  const qc = useQueryClient();
  const debounceTimersRef = useRef<
    Partial<Record<SyncDomain, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let hasSubscribedOnce = false;

    const invalidateDomain = (domain: SyncDomain) => {
      const existing = debounceTimersRef.current[domain];
      if (existing) clearTimeout(existing);

      debounceTimersRef.current[domain] = setTimeout(() => {
        const jobs: Array<Promise<unknown>> = [
          qc.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
        ];
        if (domain === "requests") {
          jobs.push(
            qc.invalidateQueries({ queryKey: borrowRequestQueryKeys.all })
          );
        } else if (domain === "supplies") {
          jobs.push(
            qc.invalidateQueries({ queryKey: consumableRequestQueryKeys.all })
          );
        } else {
          jobs.push(qc.invalidateQueries({ queryKey: borrowLogQueryKeys.all }));
        }
        void Promise.all(jobs);
      }, 250);
    };

    const invalidateAll = () => {
      invalidateDomain("requests");
      invalidateDomain("supplies");
      invalidateDomain("custody");
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
      .on("postgres_changes", requestConfig, () => invalidateDomain("requests"))
      .on("postgres_changes", supplyConfig, () => invalidateDomain("supplies"))
      .on("postgres_changes", custodyConfig, () => invalidateDomain("custody"))
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // First subscribe races the page's own queries. Resync only after a
        // reconnect so an error/timeout does not leave the UI on stale data.
        if (!hasSubscribedOnce) {
          hasSubscribedOnce = true;
          return;
        }
        invalidateAll();
      });

    return () => {
      for (const timer of Object.values(debounceTimersRef.current)) {
        if (timer) clearTimeout(timer);
      }
      debounceTimersRef.current = {};
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc, tenantId]);
}
