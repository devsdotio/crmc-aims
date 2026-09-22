"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Wrench, X } from "lucide-react";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { useUpdateMaintenanceLogMutation } from "@/features/maintenance-logs/client";
import {
  RepairPartsCostFields,
  partLinesFromRecord,
  serializePartLines,
  partsCostSummary,
  type RepairPartLine,
} from "@/components/maintenance-logs/repair-parts-cost-fields";

export interface DocumentMaintenanceDialogProps {
  record: MaintenanceLogRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

function DocumentMaintenanceDialogForm({
  record,
  onClose,
  onSaved,
}: {
  record: MaintenanceLogRecord;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const updateMutation = useUpdateMaintenanceLogMutation();
  const [workNotes, setWorkNotes] = useState(record.workNotes ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    record.scheduledDate ?? ""
  );
  const [overallCost, setOverallCost] = useState(
    record.repairCost != null ? String(record.repairCost) : ""
  );
  const [parts, setParts] = useState<RepairPartLine[]>(() =>
    partLinesFromRecord(record.repairParts)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !updateMutation.isPending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, updateMutation.isPending]);

  const saveProgress = async () => {
    const repairParts = serializePartLines(parts);
    const { hasAnyPartCost, partsSum } = partsCostSummary(parts);
    const overallBlank = !overallCost.trim();
    const repairCost = overallBlank
      ? hasAnyPartCost
        ? partsSum.toFixed(2)
        : null
      : overallCost.trim();

    setError("");
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        workNotes: workNotes.trim(),
        repairParts,
        repairCost,
        scheduledDate: scheduledDate || null,
      });
      onSaved?.("Repair progress saved.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={updateMutation.isPending ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-maintenance-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 my-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-repair-bg/15 text-status-repair-text shrink-0">
              <Wrench className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="document-maintenance-title"
                className="text-base font-bold text-text leading-tight"
              >
                Document repair work
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-mono truncate">
                {record.logCode} · {record.assetCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Close"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl border border-border bg-bg-subtle text-xs text-text-secondary">
          <span className="font-semibold text-text">Logged issue:</span>{" "}
          {record.notes?.trim() || "No issue notes."}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor={`doc-work-notes-${record.id}`}
              className="block text-xs font-semibold text-text"
            >
              Work performed / what was fixed
            </label>
            <textarea
              id={`doc-work-notes-${record.id}`}
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              rows={3}
              disabled={updateMutation.isPending}
              placeholder="e.g. Replaced fan bearing; cleaned dust from vents…"
              className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`doc-sched-${record.id}`}
              className="block text-xs font-semibold text-text"
            >
              Target service date{" "}
              <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input
              id={`doc-sched-${record.id}`}
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={updateMutation.isPending}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <RepairPartsCostFields
            parts={parts}
            onPartsChange={setParts}
            overallCost={overallCost}
            onOverallCostChange={setOverallCost}
            disabled={updateMutation.isPending}
          />

          {error && (
            <p className="text-xs font-bold text-status-outofservice-text">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text rounded-lg border border-border bg-bg cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveProgress()}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save progress
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentMaintenanceDialog({
  record,
  isOpen,
  onClose,
  onSaved,
}: DocumentMaintenanceDialogProps) {
  if (!isOpen || !record) return null;

  return (
    <DocumentMaintenanceDialogForm
      key={record.id}
      record={record}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
