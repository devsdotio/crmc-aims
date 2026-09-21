"use client";

import { useEffect, useMemo, useState } from "react";
import { X, PackageCheck, Check, AlertCircle, Loader2, Package, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type AssignAssetFormInput = {
  assetId: string;
  notes: string;
};

export function AssignAssetDialog({
  isOpen,
  assets,
  loadingAssets,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  assets: Asset[];
  loadingAssets?: boolean;
  onClose: () => void;
  onSubmit: (input: AssignAssetFormInput) => void | Promise<void>;
}) {
  const assignable = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.status === "active" &&
          !a.currentHolder &&
          a.assignmentType === "assignable"
      ),
    [assets]
  );

  const assetOptions = useMemo(
    () =>
      assignable.map((a) => ({
        value: a.id,
        label: `${a.assetCode} — ${a.name}`,
        keywords: `${a.assetCode} ${a.category ?? ""} ${a.serialNumber ?? ""}`,
      })),
    [assignable]
  );

  const [assetId, setAssetId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAssetId(assignable[0]?.id ?? "");
    setNotes("");
    setError("");
    setIsSubmitting(false);
  }, [isOpen, assignable]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const selected = assignable.find((a) => a.id === assetId) ?? null;

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Select an active asset that is not currently in custody.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        assetId: selected.id,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign asset."
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
        aria-labelledby="assign-asset-heading"
        className="relative w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 id="assign-asset-heading" className="text-sm font-bold text-text">
                Assign Fixed Asset
              </h2>
              <p className="text-[11px] text-text-secondary">
                Places active asset in project custody without a personal borrower
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
          {/* Asset Selection */}
          <div>
            <label htmlFor="assign-asset" className={labelClass}>
              Select Asset <span className="text-accent">*</span>
            </label>
            {loadingAssets ? (
              <div className="h-9 rounded-lg bg-border animate-pulse" />
            ) : assignable.length === 0 ? (
              <div className="p-3.5 rounded-lg border border-dashed border-border bg-bg-subtle/40 flex items-start gap-2.5 text-xs text-text-secondary">
                <Package className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-text mb-0.5">No assignable assets available</p>
                  <p className="text-[11px] leading-relaxed">
                    Ensure assets have Assignment Type set to <strong>Assignable</strong>, are marked
                    Active, and are not currently borrowed or reserved.
                  </p>
                </div>
              </div>
            ) : (
              <SearchableSelect
                id="assign-asset"
                value={assetId}
                onValueChange={setAssetId}
                options={assetOptions}
                disabled={isSubmitting}
                placeholder="Type to find an asset…"
                emptyMessage="No assignable assets available"
                inputClassName="bg-bg-subtle"
              />
            )}
          </div>

          {/* Selected Asset Quick-Card */}
          {selected && (
            <div className="p-3 rounded-lg border border-border bg-bg-subtle/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text truncate">{selected.name}</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg border border-border text-text-secondary shrink-0">
                  {selected.assetCode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                <Tag className="h-3 w-3 shrink-0" />
                <span>{selected.category || "Asset"}</span>
                {selected.serialNumber && <span>· SN: {selected.serialNumber}</span>}
                {selected.location && <span>· {selected.location}</span>}
              </div>
            </div>
          )}

          {/* Assignment Notes */}
          <div>
            <label htmlFor="assign-notes" className={labelClass}>
              Assignment Notes
            </label>
            <textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              disabled={isSubmitting}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="e.g. Assigned to site foreman for Room 204 electrical testing…"
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
              disabled={isSubmitting || !selected}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Assigning…" : "Assign Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
