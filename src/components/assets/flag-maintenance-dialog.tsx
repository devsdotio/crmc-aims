"use client";

import { useState, useEffect } from "react";
import { Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import { useFlagMaintenanceMutation } from "@/features/assets/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AssetDialogShell } from "./asset-dialog-shell";

export interface FlagMaintenanceDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

type FlagCondition = "needs_maintenance" | "damaged";

export function FlagMaintenanceDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: FlagMaintenanceDialogProps) {
  const [notes, setNotes] = useState("");
  const [condition, setCondition] =
    useState<FlagCondition>("needs_maintenance");
  const [scheduledDate, setScheduledDate] = useState("");
  const [error, setError] = useState("");
  const mutation = useFlagMaintenanceMutation();

  useEffect(() => {
    if (!isOpen) return;
    setNotes("");
    setCondition("needs_maintenance");
    setScheduledDate("");
    setError("");
  }, [isOpen, asset?.id]);

  if (!isOpen || !asset) return null;

  const submit = async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Please describe the fault or maintenance issue.");
      return;
    }
    try {
      await mutation.mutateAsync({
        id: asset.id,
        payload: {
          notes: trimmed,
          condition,
          scheduledDate: scheduledDate || undefined,
        },
      });
      onSuccess?.(
        `${asset.assetCode} flagged for maintenance. Document parts and costs on the asset, then mark serviceable when repaired.`
      );
      setNotes("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to flag for maintenance."
      );
    }
  };

  const pending = mutation.isPending;

  return (
    <AssetDialogShell
      title="Flag for maintenance"
      subtitle={`${asset.assetCode} · ${asset.name}`}
      icon={<Wrench className="h-5 w-5" />}
      onClose={onClose}
      busy={pending}
      initialFocusSelector="#flag-condition-select"
      alert={
        error ? (
          <p role="alert" className="text-xs font-bold text-status-outofservice-text">
            {error}
          </p>
        ) : null
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 cursor-pointer rounded-lg border border-border bg-bg px-4 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-status-repair-bg px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wrench className="h-3.5 w-3.5" />
            )}
            Flag for repair
          </button>
        </div>
      }
    >
      <div className="space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            Marks this asset as needs repair and opens a Maintenance Logs entry.
            You can document parts, costs, and work notes on the asset while the
            flag is open.
            {asset.currentHolder ? (
              <>
                {" "}
                Currently assigned to{" "}
                <strong className="text-text">{asset.currentHolder}</strong> —
                custody stays; the assignee is recorded on the maintenance log.
              </>
            ) : null}
          </p>

          <div className="space-y-1">
            <label
              htmlFor="flag-condition-select"
              className="block text-xs font-semibold text-text"
            >
              Condition <span className="text-accent">*</span>
            </label>
            <SearchableSelect
              id="flag-condition-select"
              value={condition}
              onValueChange={(next) => setCondition(next as FlagCondition)}
              options={[
                {
                  value: "needs_maintenance",
                  label: "Needs Maintenance / Repair",
                },
                { value: "damaged", label: "Damaged / Out of Service" },
              ]}
              disabled={mutation.isPending}
              placeholder="Type to find a condition…"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="flag-scheduled-date"
              className="block text-xs font-semibold text-text"
            >
              Target service date{" "}
              <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input
              id="flag-scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={mutation.isPending}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="flag-maintenance-notes"
              className="block text-xs font-semibold text-text"
            >
              Issue description <span className="text-accent">*</span>
            </label>
            <textarea
              id="flag-maintenance-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              placeholder="e.g. Fan noisy, screen flicker on wake…"
              disabled={pending}
              className={cn(
                "w-full p-2.5 text-xs bg-bg border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent",
                error ? "border-status-outofservice-bg" : "border-border"
              )}
            />
          </div>
      </div>
    </AssetDialogShell>
  );
}
