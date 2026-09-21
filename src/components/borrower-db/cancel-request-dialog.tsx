"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, AlertTriangle, XCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatItemDescription, formatQuantityWithUnit } from "@/lib/sanitize-display";
import { useRequestModalDismiss } from "@/hooks/use-request-modal-dismiss";
import type { PortalBorrowRequest } from "./types";

interface CancelRequestDialogProps {
  request: PortalBorrowRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CancelRequestDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
}: CancelRequestDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const { requestClose, onBackdropClick } = useRequestModalDismiss({
    open,
    isPending: isCancelling,
    isDirty: false,
    onRequestClose: () => onOpenChange(false),
  });

  // Reset fields when opening or switching request
  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
      const id = window.setTimeout(() => reasonRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, request?.id]);

  if (!open) return null;

  const isApproved = request.status === "approved";

  const handleConfirm = async () => {
    if (isCancelling) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Please provide a reason for cancelling this request.");
      return;
    }
    if (trimmedReason.length < 3) {
      setError("Cancellation reason must be at least 3 characters long.");
      return;
    }

    setError(null);
    setIsCancelling(true);
    try {
      await onConfirm(trimmedReason);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel request. Please try again."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      aria-describedby="cancel-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onBackdropClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="cancel-dialog-title"
                className="text-base font-bold text-text"
              >
                Cancel Request
              </h2>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide",
                  isApproved
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                )}
              >
                {isApproved ? "Approved Request" : "Pending Review"}
              </span>
            </div>
            <p id="cancel-dialog-desc" className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to cancel this request? Once cancelled, this action cannot be undone.
            </p>
          </div>
        </div>

        {/* Warning banner for approved status */}
        {isApproved && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Notice for approved requests</p>
              <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                This request was already approved. Cancelling it will revoke the approval and release any reserved supplies or items back to available inventory.
              </p>
            </div>
          </div>
        )}

        {/* Request Summary Box */}
        <div className="rounded-xl bg-bg-subtle border border-border p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-text-secondary">
              {request.requestCode}
            </span>
            <span className="text-[11px] text-text-secondary">
              {request.items?.length || 0} requested item{(request.items?.length || 0) !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto divide-y divide-border/60">
            {request.items?.map((item, idx) => (
              <div key={idx} className={cn("flex items-center justify-between text-xs", idx !== 0 && "pt-1.5")}>
                <span className="font-medium text-text truncate max-w-xs">
                  {formatItemDescription(item.itemDescription, item.category, item.itemType)}
                </span>
                <span className="text-text-secondary shrink-0 font-mono text-[11px] ml-2">
                  × {formatQuantityWithUnit(item.quantity, item.unit, item.itemType)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cancellation Reason Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cancellation-reason-input"
              className="text-xs font-bold text-text flex items-center gap-1"
            >
              Cancellation Reason
              <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-text-secondary/70 font-mono">
              {reason.length}/500
            </span>
          </div>

          <textarea
            ref={reasonRef}
            id="cancellation-reason-input"
            rows={3}
            maxLength={500}
            value={reason}
            disabled={isCancelling}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Please specify why you are cancelling this request (e.g. event rescheduled, item no longer needed, requested duplicate by mistake)..."
            className={cn(
              "w-full rounded-xl border bg-bg px-3.5 py-2.5 text-xs text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent resize-none transition-colors",
              error
                ? "border-destructive focus:ring-destructive/30"
                : "border-border"
            )}
          />

          {error ? (
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : (
            <p className="text-[11px] text-text-secondary/80 flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0 text-text-secondary/60" />
              This reason will be recorded in the request logs for audit and custodian reference.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={requestClose}
            disabled={isCancelling}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Keep Request
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isCancelling}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-60 shadow-xs cursor-pointer"
          >
            {isCancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isCancelling ? "Cancelling Request…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
