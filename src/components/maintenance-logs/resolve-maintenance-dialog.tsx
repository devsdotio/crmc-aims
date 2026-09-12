"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { filterMoneyInput } from "@/lib/numeric-input";

export type ResolveMaintenanceConfirmPayload = {
  resolutionNotes: string;
  technician: string;
  resolutionDate: string;
  repairCost?: string | null;
};

export interface ResolveMaintenanceDialogProps {
  record: MaintenanceLogRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmResolve: (
    record: MaintenanceLogRecord,
    payload: ResolveMaintenanceConfirmPayload
  ) => void | Promise<void>;
}

interface ResolveMaintenanceDialogFormProps {
  record: MaintenanceLogRecord;
  onClose: () => void;
  onConfirmResolve: ResolveMaintenanceDialogProps["onConfirmResolve"];
}

function ResolveMaintenanceDialogForm({
  record,
  onClose,
  onConfirmResolve,
}: ResolveMaintenanceDialogFormProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [technician, setTechnician] = useState("IT Helpdesk");
  const [resolutionDate, setResolutionDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [repairCost, setRepairCost] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError("Please state the resolution details or repair work performed.");
      return;
    }
    if (!technician.trim()) {
      setError("Please specify the technician or team who resolved the issue.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onConfirmResolve(record, {
        resolutionNotes: resolutionNotes.trim(),
        technician: technician.trim(),
        resolutionDate,
        repairCost: repairCost.trim() ? repairCost.trim() : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-active-bg/20 text-status-active-text shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="resolve-dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                Resolve Maintenance Flag
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {record.logCode} · Tag {record.assetCode}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close resolve dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-bg-subtle space-y-1 text-xs">
          <p className="text-text">
            <strong className="font-bold">Asset:</strong> {record.assetName} (
            {record.assetCode})
          </p>
          <p className="text-text-secondary">
            <strong className="font-bold text-text">Logged Issue:</strong>{" "}
            {record.notes}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="resolution-notes-input"
              className="block text-xs font-semibold text-text"
            >
              Repair &amp; Maintenance Resolution Details{" "}
              <span className="text-accent">*</span>
            </label>
            <textarea
              id="resolution-notes-input"
              value={resolutionNotes}
              onChange={(e) => {
                setResolutionNotes(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              placeholder="e.g. Replaced faulty autofocus gear ring. Passed 24h stress test."
              disabled={isSubmitting}
              className={cn(
                "w-full p-2.5 text-xs bg-bg border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent",
                error ? "border-status-outofservice-bg" : "border-border"
              )}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="repair-cost-input"
              className="block text-xs font-semibold text-text"
            >
              Repair Cost{" "}
              <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                ₱
              </span>
              <input
                id="repair-cost-input"
                type="text"
                inputMode="decimal"
                value={repairCost}
                onChange={(e) => {
                  const next = filterMoneyInput(e.target.value);
                  if (next !== null) setRepairCost(next);
                }}
                placeholder="0.00"
                disabled={isSubmitting}
                className="w-full h-9 pl-7 pr-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <p className="text-[11px] text-text-secondary">
              Leave blank if cost was not recorded. Enter 0 for free / warranty work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="technician-input"
                className="block text-xs font-semibold text-text"
              >
                Technician / Service Unit <span className="text-accent">*</span>
              </label>
              <input
                id="technician-input"
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="e.g. IT Helpdesk, Carpentry"
                disabled={isSubmitting}
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="resolution-date-input"
                className="block text-xs font-semibold text-text"
              >
                Completion Date
              </label>
              <input
                id="resolution-date-input"
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-status-active-bg/30 bg-status-active-bg/10 text-[11px] text-text flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-status-active-text shrink-0 mt-0.5" />
            <span>
              <strong>Cross-Feature Effect:</strong> Resolving this maintenance
              flag will restore asset tag{" "}
              <strong className="font-mono text-text">{record.assetCode}</strong>{" "}
              status back to{" "}
              <strong className="text-status-active-text font-bold">
                &quot;Active&quot;
              </strong>{" "}
              when no other open repair flags remain.
            </span>
          </div>

          {error && (
            <p className="text-xs font-bold text-status-outofservice-text">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {isSubmitting ? "Saving…" : "Confirm Resolution & Restore Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResolveMaintenanceDialog({
  record,
  isOpen,
  onClose,
  onConfirmResolve,
}: ResolveMaintenanceDialogProps) {
  if (!isOpen || !record) return null;

  return (
    <ResolveMaintenanceDialogForm
      key={record.id}
      record={record}
      onClose={onClose}
      onConfirmResolve={onConfirmResolve}
    />
  );
}
