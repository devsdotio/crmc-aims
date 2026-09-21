"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  Check,
  Wrench,
  Loader2,
  AlertCircle,
  Package,
  PowerOff,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectAssetAssignment } from "@/types/projects";
import { formatPhp } from "./format-money";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type ReportDamageFormInput = {
  mode: "maintenance" | "write_off";
  amount: string;
  assetStatus: "out_of_service" | "retired";
  notes: string;
};

export function ReportDamageDialog({
  isOpen,
  assignment,
  defaultValue,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  assignment: ProjectAssetAssignment | null;
  /** Asset book value for default write-off charge */
  defaultValue?: number | null;
  onClose: () => void;
  onSubmit: (input: ReportDamageFormInput) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"maintenance" | "write_off">("maintenance");
  const [amount, setAmount] = useState("");
  const [assetStatus, setAssetStatus] = useState<"out_of_service" | "retired">(
    "out_of_service"
  );

  const assetStatusOptions = useMemo(
    () => [
      { value: "out_of_service", label: "Out of service" },
      { value: "retired", label: "Retired" },
    ],
    []
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode("maintenance");
    setAmount(
      defaultValue != null && Number.isFinite(defaultValue)
        ? defaultValue.toFixed(2)
        : ""
    );
    setAssetStatus("out_of_service");
    setNotes("");
    setError("");
    setIsSubmitting(false);
  }, [isOpen, assignment?.id, defaultValue]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !assignment) return null;

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Please describe the damage or loss details (required).");
      return;
    }
    if (mode === "write_off" && amount.trim() !== "") {
      const n = Number(amount);
      if (!Number.isFinite(n) || n < 0) {
        setError("Charge amount must be a non-negative number.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        mode,
        amount: amount.trim(),
        assetStatus,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to report damage."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="damage-dialog-heading"
        className="relative w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-repair-bg/15 text-status-repair-text shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 id="damage-dialog-heading" className="text-sm font-bold text-text">
                Report Asset Damage
              </h2>
              <p className="text-[11px] text-text-secondary">
                Flag asset for repair or charge project with write-off expense
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Asset Summary Badge Card */}
          <div className="p-3 rounded-lg border border-border bg-bg-subtle/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-4 w-4 text-text-secondary shrink-0" />
              <span className="font-bold text-text truncate">{assignment.assetName}</span>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg border border-border text-text-secondary shrink-0">
              {assignment.assetCode}
            </span>
          </div>

          {/* Outcome Choice Cards */}
          <div className="space-y-2">
            <span className={labelClass}>
              Select Outcome <span className="text-accent">*</span>
            </span>
            <div className="grid grid-cols-1 gap-2">
              {/* Flag Repair Card */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  mode === "maintenance"
                    ? "border-status-repair-bg/50 bg-status-repair-bg/10 shadow-2xs"
                    : "border-border bg-bg hover:bg-bg-subtle/50"
                )}
              >
                <input
                  type="radio"
                  name="damage-mode"
                  className="mt-0.5 accent-status-repair-bg"
                  checked={mode === "maintenance"}
                  onChange={() => setMode("maintenance")}
                  disabled={isSubmitting}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                    <Wrench className="h-3.5 w-3.5 text-status-repair-text" />
                    <span>Flag for repair</span>
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-status-repair-bg/20 text-status-repair-text">
                      Needs Repair
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                    Keeps asset on project custody; creates maintenance log; status
                    set to needs_repair with zero write-off charges.
                  </p>
                </div>
              </label>

              {/* Write-off Card */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  mode === "write_off"
                    ? "border-status-outofservice-bg/50 bg-status-outofservice-bg/10 shadow-2xs"
                    : "border-border bg-bg hover:bg-bg-subtle/50"
                )}
              >
                <input
                  type="radio"
                  name="damage-mode"
                  className="mt-0.5 accent-status-outofservice-bg"
                  checked={mode === "write_off"}
                  onChange={() => setMode("write_off")}
                  disabled={isSubmitting}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                    <AlertTriangle className="h-3.5 w-3.5 text-status-outofservice-text" />
                    <span>Write off (expense charge)</span>
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-status-outofservice-bg/20 text-status-outofservice-text">
                      Write-off
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                    Closes custody assignment as written-off, charges project budget spend,
                    and updates asset to out of service or retired.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Write-off Specific Inputs */}
          {mode === "write_off" && (
            <div className="space-y-3 p-3 rounded-lg border border-status-outofservice-bg/20 bg-status-outofservice-bg/5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="wo-amount" className={labelClass}>
                    Charge amount (₱)
                  </label>
                  {defaultValue != null && (
                    <span className="text-[10px] text-text-secondary">
                      Book value: <strong className="font-mono text-text">{formatPhp(defaultValue)}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-xs font-bold text-text-secondary">
                    ₱
                  </span>
                  <input
                    id="wo-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSubmitting}
                    className={cn(fieldClass, "pl-7 font-mono tabular-nums")}
                    placeholder="0.00 (or leave blank for book value)"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="wo-status" className={labelClass}>
                  Asset status post write-off
                </label>
                <SearchableSelect
                  id="wo-status"
                  value={assetStatus}
                  onValueChange={(next) =>
                    setAssetStatus(next as "out_of_service" | "retired")
                  }
                  options={assetStatusOptions}
                  disabled={isSubmitting}
                  placeholder="Type to find a status…"
                />
              </div>
            </div>
          )}

          {/* Damage / Loss Notes */}
          <div>
            <label htmlFor="damage-notes" className={labelClass}>
              Damage / incident description <span className="text-accent">*</span>
            </label>
            <textarea
              id="damage-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={4000}
              required
              disabled={isSubmitting}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-16")}
              placeholder="Detail what happened, when it occurred, and current physical condition…"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-xs",
                mode === "write_off"
                  ? "bg-status-outofservice-bg hover:opacity-90"
                  : "bg-status-repair-bg hover:opacity-90"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : mode === "write_off" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              {isSubmitting
                ? "Submitting…"
                : mode === "write_off"
                  ? "Write Off Asset"
                  : "Flag For Repair"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
