"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AssetDialogShell } from "./asset-dialog-shell";
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

  const pending = mutation.isPending;

  return (
    <AssetDialogShell
      title="Report missing asset"
      subtitle={`${asset.assetCode} · ${asset.name}`}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      busy={pending}
      alert={
        mutation.isError ? (
          <p role="alert" className="text-xs text-status-outofservice-text">
            {mutation.error.message || "Could not mark asset missing."}
          </p>
        ) : null
      }
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 cursor-pointer rounded-lg border border-border px-4 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!notes.trim() || pending}
            onClick={() => void submit()}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-status-outofservice-bg px-4 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Mark missing
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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

      </div>
    </AssetDialogShell>
  );
}
