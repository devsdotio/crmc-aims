"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { formatFriendlyNetworkError } from "@/lib/network-error";

/**
 * Inline fail-state for list and dashboard pages so errors never look like perpetual skeletons.
 */
export function QueryErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const friendlyMessage = formatFriendlyNetworkError(message);

  return (
    <div className="mx-4 md:mx-6 mt-3 flex items-start gap-2.5 rounded-xl border border-status-outofservice-bg/30 bg-status-outofservice-bg/10 p-3 text-xs text-status-outofservice-text">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium leading-relaxed">{friendlyMessage}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-bold underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <RefreshCw className="h-3 w-3" />
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
