"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Wrench, AlertTriangle, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConditionState } from "@/types/maintenance-logs";
import type { AssetCategory } from "@/types/shared";
import type { Asset } from "@/types/assets";

export interface FlagForMaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  loadingAssets?: boolean;
  onConfirmFlag: (flagData: {
    assetId: string;
    assetCode: string;
    assetName: string;
    category: AssetCategory;
    condition: ConditionState;
    notes: string;
    scheduledDate?: string;
  }) => void | Promise<void>;
}

interface FlagForMaintenanceDialogFormProps {
  onClose: () => void;
  assets: Asset[];
  loadingAssets?: boolean;
  onConfirmFlag: FlagForMaintenanceDialogProps["onConfirmFlag"];
}

function normalizeSearchToken(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/]/g, "");
}

function assetMatchesSearch(asset: Asset, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const compactQ = normalizeSearchToken(q);
  const fields = [
    asset.name,
    asset.assetCode,
    asset.location ?? "",
    asset.serialNumber ?? "",
  ];
  return fields.some((field) => {
    const lower = field.toLowerCase();
    if (lower.includes(q)) return true;
    return compactQ.length > 0 && normalizeSearchToken(field).includes(compactQ);
  });
}

function FlagForMaintenanceDialogForm({
  onClose,
  assets,
  loadingAssets,
  onConfirmFlag,
}: FlagForMaintenanceDialogFormProps) {
  /** Available free assets only — in-custody must use return / project damage. */
  const selectable = useMemo(
    () =>
      assets.filter(
        (a) =>
          !a.currentHolder &&
          a.status !== "retired" &&
          a.status !== "out_of_service" &&
          a.status !== "missing"
      ),
    [assets]
  );

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [condition, setCondition] =
    useState<ConditionState>("needs_maintenance");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedAssetId("");
    setAssetSearch("");
    setCondition("needs_maintenance");
    setNotes("");
    setScheduledDate("");
    setError("");
    setIsSubmitting(false);
  }, [selectable]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const filteredAssets = useMemo(
    () => selectable.filter((a) => assetMatchesSearch(a, assetSearch)),
    [selectable, assetSearch]
  );

  const targetAsset =
    selectable.find((a) => a.id === selectedAssetId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAsset) {
      setError("Search and select an available asset from the registry.");
      return;
    }
    if (!notes.trim()) {
      setError("Please describe the fault or maintenance issue (required).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onConfirmFlag({
        assetId: targetAsset.id,
        assetCode: targetAsset.assetCode,
        assetName: targetAsset.name,
        category: targetAsset.category,
        condition,
        notes: notes.trim(),
        scheduledDate: scheduledDate || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to flag maintenance."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flag-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 my-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="flag-dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                Flag Asset for Maintenance / Repair
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Creates an open maintenance flag &amp; sets status to needs
                repair
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close flag dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="flag-asset-search"
              className="block text-xs font-semibold text-text"
            >
              Target Institutional Asset <span className="text-accent">*</span>
            </label>
            {loadingAssets ? (
              <div className="h-9 rounded-lg bg-border animate-pulse" />
            ) : selectable.length === 0 ? (
              <p className="text-[11px] text-text-secondary border border-dashed border-border rounded-lg p-3">
                No free assets available. Return borrowed items or resolve
                project custody first. Assets currently with a requester must be
                returned (with repair condition) — project-held assets should use{" "}
                <strong>Report damage</strong> on the project.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/60 pointer-events-none" />
                  <input
                    id="flag-asset-search"
                    type="search"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search by name, asset code, serial, or location…"
                    disabled={isSubmitting}
                    className="w-full h-9 pl-8 pr-8 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {assetSearch && (
                    <button
                      type="button"
                      onClick={() => setAssetSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-secondary hover:text-text rounded cursor-pointer"
                      aria-label="Clear asset search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {targetAsset && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-text truncate">
                        {targetAsset.name}
                      </p>
                      <p className="font-mono text-[11px] text-text-secondary">
                        {targetAsset.assetCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAssetId("")}
                      className="text-[11px] font-semibold text-accent hover:underline cursor-pointer shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                {!targetAsset && (
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {filteredAssets.length === 0 ? (
                      <p className="p-3 text-xs text-text-secondary">
                        No assets match &quot;{assetSearch.trim()}&quot;.
                      </p>
                    ) : (
                      filteredAssets.slice(0, 40).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAssetId(a.id);
                            setAssetSearch("");
                            if (error) setError("");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-bg-subtle transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-bold text-text truncate">
                            {a.name}
                          </p>
                          <p className="text-[11px] font-mono text-text-secondary">
                            {a.assetCode}
                            {a.location ? ` · ${a.location}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="flag-condition-select"
              className="block text-xs font-semibold text-text"
            >
              Flagged Condition Status <span className="text-accent">*</span>
            </label>
            <select
              id="flag-condition-select"
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as ConditionState)
              }
              disabled={isSubmitting}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="needs_maintenance">
                Needs Maintenance / Repair
              </option>
              <option value="damaged">Damaged / Out of Service</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="scheduled-date-input"
              className="block text-xs font-semibold text-text"
            >
              Target Service Completion Date (Optional)
            </label>
            <input
              id="scheduled-date-input"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="flag-notes-input"
              className="block text-xs font-semibold text-text"
            >
              Issue Description / Fault Details{" "}
              <span className="text-accent">*</span>
            </label>
            <textarea
              id="flag-notes-input"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              disabled={isSubmitting}
              placeholder="Describe the defect, sticky controls, physical damage, or required cleaning…"
              className={cn(
                "w-full p-2.5 text-xs bg-bg border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent",
                error ? "border-status-outofservice-bg" : "border-border"
              )}
            />
          </div>

          {targetAsset && (
            <div className="p-3 rounded-lg border border-border bg-bg-subtle text-[11px] text-text-secondary flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                Sets asset{" "}
                <strong className="font-mono text-text">
                  {targetAsset.assetCode}
                </strong>{" "}
                to <strong>needs repair</strong> until the log is resolved.
              </span>
            </div>
          )}

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
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-lg border border-border bg-bg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetAsset}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {isSubmitting ? "Flagging…" : "Confirm Maintenance Flag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FlagForMaintenanceDialog({
  isOpen,
  onClose,
  assets,
  loadingAssets,
  onConfirmFlag,
}: FlagForMaintenanceDialogProps) {
  if (!isOpen) return null;

  return (
    <FlagForMaintenanceDialogForm
      key="flag"
      onClose={onClose}
      assets={assets}
      loadingAssets={loadingAssets}
      onConfirmFlag={onConfirmFlag}
    />
  );
}
