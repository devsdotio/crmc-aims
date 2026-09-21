"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/components/providers/toast-context";
import {
  formatFriendlyNetworkError,
  isAuthNetworkError,
} from "@/lib/network-error";

const NETWORK_TOAST_DEBOUNCE_MS = 2_500;
const AUTH_TOAST_DEBOUNCE_MS = 30_000;

const AUTH_SESSION_MESSAGE =
  "Your session has ended. Sign in again to continue.";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 45_000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: 800,
        // Custodians and borrowers act on the same records from different tabs,
        // so returning to a tab resyncs anything older than the stale window.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  });
}

function signInHref(): string {
  if (typeof window === "undefined") return "/sign-in?error=session_expired";
  const next = window.location.pathname + window.location.search;
  const params = new URLSearchParams({ error: "session_expired" });
  if (next && next !== "/" && !next.startsWith("/sign-in")) {
    params.set("next", next);
  }
  return `/sign-in?${params.toString()}`;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [queryClient] = useState(createQueryClient);

  // Subscribe to query/mutation errors in effect to keep render pure
  useEffect(() => {
    let lastError = { message: "", timestamp: 0 };

    function notifyQueryError(error: unknown, networkFallback: string) {
      const now = Date.now();

      if (isAuthNetworkError(error)) {
        if (
          lastError.message === AUTH_SESSION_MESSAGE &&
          now - lastError.timestamp < AUTH_TOAST_DEBOUNCE_MS
        ) {
          return;
        }
        lastError = { message: AUTH_SESSION_MESSAGE, timestamp: now };
        toast.warning(AUTH_SESSION_MESSAGE, {
          duration: 12_000,
          action: {
            label: "Sign In",
            onClick: () => {
              window.location.assign(signInHref());
            },
          },
        });
        return;
      }

      const friendly = formatFriendlyNetworkError(error, networkFallback);
      if (
        lastError.message === friendly &&
        now - lastError.timestamp < NETWORK_TOAST_DEBOUNCE_MS
      ) {
        return;
      }
      lastError = { message: friendly, timestamp: now };
      toast.warning(friendly, {
        action: {
          label: "Retry Connection",
          onClick: () => {
            void queryClient.refetchQueries({ type: "active" });
          },
        },
      });
    }

    const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        notifyQueryError(
          event.action.error,
          "Failed to load data. Please check your connection."
        );
      }
    });

    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          notifyQueryError(
            event.action.error,
            "Operation could not be completed. Please try again."
          );
        }
      });

    return () => {
      unsubscribeQuery();
      unsubscribeMutation();
    };
  }, [toast, queryClient]);

  // Listen to browser network changes (offline/online)
  useEffect(() => {
    function handleOffline() {
      toast.error(
        "You are currently offline. Actions will be unavailable until connection is restored.",
        {
          action: {
            label: "Retry Connection",
            onClick: () => {
              void queryClient.refetchQueries({ type: "active" });
            },
          },
        }
      );
    }
    function handleOnline() {
      toast.success("Connection restored. You are back online.");
      queryClient.invalidateQueries();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [toast, queryClient]);

  // Pass height so layouts can own scoped scroll (`h-full` + `overflow-y-auto`).
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </QueryClientProvider>
  );
}
