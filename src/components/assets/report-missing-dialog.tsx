"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import {
  useReportMissingMutation,
  type ReportMissingInput,
} from "@/features/assets/client";

type MissingReason = ReportMissingInput["reason"];

export interface ReportMissingDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function ReportMissingDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: ReportMissingDialogProps) {
  const [reason, setReason] = useState<MissingReason>("lost");
  const [notes, setNotes] = useState("");
  const mutation = useReportMissingMutation();

  if (!isOpen || !asset) return null;

  const submit = async () => {
    const trimmed = notes.trim();
    if (!trimmed) return;
    try {
      await mutation.mutateAsync({
        id: asset.id,
        payload: { reason, notes: trimmed },
      });
      onSuccess?.(
        `${asset.assetCode} marked as missing (${reason.replace(/_/g, " ")}).`
      );
      setNotes("");
      setReason("lost");
      onClose();
    } catch {
      // Toast / query error surfaces via mutation; keep dialog open.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-missing-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-bg shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-outofservice-bg/15 text-status-outofservice-text shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="report-missing-title"
                className="text-sm font-bold text-text"
              >
                Report missing asset
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                {asset.assetCode} · {asset.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-subtle hover:text-text cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Closes any open custody, clears the holder, and sets status to{" "}
            <strong className="text-text">Missing</strong>. Use this for lost,
            stolen, or otherwise unaccounted units — not for repair or retirement.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Reason
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "lost", label: "Lost" },
                  { id: "stolen", label: "Stolen" },
                  { id: "missing", label: "Unaccounted" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReason(opt.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                    reason === opt.id
                      ? "bg-status-outofservice-bg/15 border-status-outofservice-bg/40 text-status-outofservice-text"
                      : "bg-bg border-border text-text-secondary hover:border-primary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Notes (required)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Circumstances, last known location, report reference…"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-secondary/70 focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-20"
            />
          </label>

          {mutation.isError && (
            <p className="text-xs text-status-outofservice-text">
              {mutation.error.message || "Could not mark asset missing."}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-text-secondary hover:text-text cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!notes.trim() || mutation.isPending}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-status-outofservice-bg text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Mark missing
          </button>
        </div>
      </div>
    </div>
  );
}
