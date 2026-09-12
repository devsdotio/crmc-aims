"use client";

import { useState } from "react";
import { Loader2, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import { useFlagMaintenanceMutation } from "@/features/assets/client";

export interface FlagMaintenanceDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function FlagMaintenanceDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: FlagMaintenanceDialogProps) {
  const [notes, setNotes] = useState("");
  const mutation = useFlagMaintenanceMutation();

  if (!isOpen || !asset) return null;

  const submit = async () => {
    const trimmed = notes.trim();
    try {
      await mutation.mutateAsync({
        id: asset.id,
        payload: trimmed ? { notes: trimmed } : {},
      });
      onSuccess?.(
        `${asset.assetCode} flagged for maintenance. Resolve it under Maintenance Logs when repaired.`
      );
      setNotes("");
      onClose();
    } catch {
      // Mutation error surfaces via toast / query; keep dialog open.
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
        aria-labelledby="flag-maintenance-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-bg shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-repair-bg/15 text-status-repair-text shrink-0">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="flag-maintenance-title"
                className="text-sm font-bold text-text"
              >
                Flag for maintenance
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                {asset.assetCode} · {asset.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            Marks this asset as needs repair and opens a Maintenance Logs entry
            so it can be marked serviceable again after work is done.
          </p>
          <div className="space-y-1">
            <label
              htmlFor="flag-maintenance-notes"
              className="block text-xs font-semibold text-text"
            >
              Issue notes{" "}
              <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              id="flag-maintenance-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Fan noisy, screen flicker on wake…"
              disabled={mutation.isPending}
              className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={mutation.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-status-repair-bg text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wrench className="h-3.5 w-3.5" />
            )}
            Flag for repair
          </button>
        </div>
      </div>
    </div>
  );
}
