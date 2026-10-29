"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Wrench, AlertTriangle, Check, Search, Tag, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConditionState } from "@/types/maintenance-logs";
import type { AssetCategory } from "@/types/shared";
import type { Asset } from "@/types/assets";
import {
  DEFAULT_SUGGESTED_CONDITIONS,
  getSavedCustomConditions,
  saveCustomCondition,
  removeCustomCondition,
  formatConditionNotes,
} from "@/lib/custom-condition";

import { SearchableSelect } from "@/components/ui/searchable-select";

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
  /** Active / repairable assets — including those still borrowed or assigned. */
  const selectable = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.status !== "retired" &&
          a.status !== "out_of_service" &&
          a.status !== "missing"
      ),
    [assets]
  );

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("needs_maintenance");
  const [condition, setCondition] =
    useState<ConditionState>("needs_maintenance");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customConditionText, setCustomConditionText] = useState("");
  const [saveConditionToQuickList, setSaveConditionToQuickList] = useState(true);
  const [savedConditions, setSavedConditions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customInputRef = useRef<HTMLInputElement>(null);

  const conditionOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; keywords?: string }> = [
      {
        value: "needs_maintenance",
        label: "Needs Maintenance / Repair",
        keywords: "standard repair maintenance fix serviceable",
      },
      {
        value: "damaged",
        label: "Damaged / Out of Service",
        keywords: "broken defective critical unusable fault",
      },
    ];

    if (savedConditions.length > 0) {
      for (const cond of savedConditions) {
        list.push({
          value: `saved:${cond}`,
          label: `${cond} (Custom)`,
          keywords: `custom condition ${cond}`,
        });
      }
    }

    list.push({
      value: "__add_new_custom__",
      label: "+ Add new custom condition…",
      keywords: "add create new custom condition",
    });

    return list;
  }, [savedConditions]);

  useEffect(() => {
    setSelectedAssetId("");
    setAssetSearch("");
    setSelectedOption("needs_maintenance");
    setCondition("needs_maintenance");
    setIsCustomMode(false);
    setCustomConditionText("");
    setSaveConditionToQuickList(true);
    setNotes("");
    setScheduledDate("");
    setError("");
    setIsSubmitting(false);
    setSavedConditions(getSavedCustomConditions());
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

  const handleSelectChange = (val: string) => {
    if (val === "__add_new_custom__") {
      setIsCustomMode(true);
      setCustomConditionText("");
      setError("");
      return;
    }

    if (val.startsWith("saved:")) {
      const condName = val.slice("saved:".length);
      setSelectedOption(val);
      setIsCustomMode(true);
      setCustomConditionText(condName);
      setError("");
      return;
    }

    setSelectedOption(val);
    setCondition(val as ConditionState);
    setIsCustomMode(false);
    setCustomConditionText("");
    setError("");
  };

  const handleApplyChipCondition = (condName: string) => {
    setIsCustomMode(true);
    setCustomConditionText(condName);
    setError("");
  };

  const handleRemoveSavedCondition = (e: React.MouseEvent, condName: string) => {
    e.stopPropagation();
    const updated = removeCustomCondition(condName);
    setSavedConditions(updated);
    if (customConditionText === condName) {
      setSelectedOption("needs_maintenance");
      setIsCustomMode(false);
      setCustomConditionText("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
                if (!targetAsset) {
      setError("Search and select an asset from the registry.");
      return;
    }
    if (!notes.trim()) {
      setError("Please describe the fault or maintenance issue (required).");
      return;
    }

    setIsSubmitting(true);
    setError("");

    let finalCustomCondition: string | undefined = undefined;
    let finalCondition: ConditionState = condition;

    if (isCustomMode) {
      const trimmedCustom = customConditionText.trim();
      if (!trimmedCustom) {
        setError("Please enter a custom condition name (or switch back to standard options).");
        setIsSubmitting(false);
        customInputRef.current?.focus();
        return;
      }
      finalCustomCondition = trimmedCustom;
      if (saveConditionToQuickList) {
        const updated = saveCustomCondition(trimmedCustom);
        setSavedConditions(updated);
      }
    } else if (selectedOption.startsWith("saved:")) {
      finalCustomCondition = selectedOption.slice("saved:".length);
      finalCondition = "needs_maintenance";
    } else {
      finalCondition = (selectedOption as ConditionState) || "needs_maintenance";
    }

    const fullNotes = formatConditionNotes(notes.trim(), finalCustomCondition);

    try {
      await onConfirmFlag({
        assetId: targetAsset.id,
        assetCode: targetAsset.assetCode,
        assetName: targetAsset.name,
        category: targetAsset.category,
        condition: finalCondition,
        notes: fullNotes,
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
                No flaggable assets in the registry. Retired, missing, and
                out-of-service units are excluded.
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
                        {targetAsset.currentHolder
                          ? ` · Assigned to ${targetAsset.currentHolder}`
                          : ""}
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
                          <p className="text-[11px] font-mono text-text-secondary truncate">
                            {a.assetCode}
                            {a.location ? ` · ${a.location}` : ""}
                            {a.currentHolder
                              ? ` · Assigned to ${a.currentHolder}`
                              : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor={isCustomMode ? "custom-condition-input" : "flag-condition-select"}
                className="block text-xs font-semibold text-text"
              >
                Flagged Condition Status <span className="text-accent">*</span>
              </label>

              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setCustomConditionText("");
                    setError("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add custom condition
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setSelectedOption("needs_maintenance");
                    setCondition("needs_maintenance");
                    setError("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Back to standard conditions
                </button>
              )}
            </div>

            {!isCustomMode ? (
              <SearchableSelect
                id="flag-condition-select"
                value={selectedOption}
                onValueChange={handleSelectChange}
                options={conditionOptions}
                disabled={isSubmitting}
                placeholder="Type to find or add a condition…"
                aria-required="true"
              />
            ) : (
              <div className="p-3.5 rounded-xl border border-accent/35 bg-accent/5 space-y-3 animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-accent" />
                      Custom Condition Name
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">
                      {customConditionText.length}/100
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-secondary">
                      <Tag className="h-3.5 w-3.5" />
                    </span>
                    <input
                      ref={customInputRef}
                      id="custom-condition-input"
                      type="text"
                      value={customConditionText}
                      onChange={(e) => {
                        setCustomConditionText(e.target.value.slice(0, 100));
                        if (error) setError("");
                      }}
                      placeholder="e.g. Calibration Required, Overheating, Screen Flicker…"
                      disabled={isSubmitting}
                      className="w-full h-9 pl-8 pr-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent font-medium shadow-2xs"
                    />
                  </div>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Baseline Asset Severity Status"
                  className="space-y-1.5 pt-1"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Baseline Severity Status
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={condition === "needs_maintenance"}
                      onClick={() => setCondition("needs_maintenance")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all text-xs",
                        condition === "needs_maintenance"
                          ? "border-status-repair-bg bg-status-repair-bg/15 text-text font-bold shadow-2xs"
                          : "border-border bg-bg text-text-secondary hover:border-border/80"
                      )}
                    >
                      <Wrench className="h-3.5 w-3.5 text-status-repair-text shrink-0" />
                      <div>
                        <p className="leading-tight">Needs Repair</p>
                        <p className="text-[10px] text-text-secondary font-normal">
                          Operational defect
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={condition === "damaged"}
                      onClick={() => setCondition("damaged")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all text-xs",
                        condition === "damaged"
                          ? "border-status-outofservice-bg bg-status-outofservice-bg/15 text-text font-bold shadow-2xs"
                          : "border-border bg-bg text-text-secondary hover:border-border/80"
                      )}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-status-outofservice-text shrink-0" />
                      <div>
                        <p className="leading-tight">Damaged</p>
                        <p className="text-[10px] text-text-secondary font-normal">
                          Critical fault
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveConditionToQuickList}
                    onChange={(e) => setSaveConditionToQuickList(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5"
                  />
                  <span className="text-[11px] font-medium text-text-secondary">
                    Save condition to quick options for future assets
                  </span>
                </label>
              </div>
            )}

            <div className="pt-1 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Quick Suggestions &amp; Saved
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {savedConditions.map((cond) => {
                  const isSelected = isCustomMode && customConditionText.toLowerCase() === cond.toLowerCase();
                  return (
                    <div
                      key={cond}
                      className={cn(
                        "group inline-flex items-center rounded-full text-[11px] font-semibold border transition-colors shadow-2xs overflow-hidden",
                        isSelected
                          ? "bg-accent text-white border-accent"
                          : "bg-bg border-border text-text hover:border-accent/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyChipCondition(cond)}
                        className="inline-flex items-center gap-1 py-0.5 pl-2 pr-1 cursor-pointer focus:outline-none"
                      >
                        <Tag className="h-2.5 w-2.5 text-accent group-hover:text-current" />
                        <span>{cond}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove saved condition ${cond}`}
                        onClick={(e) => handleRemoveSavedCondition(e, cond)}
                        className="py-0.5 pr-1.5 pl-0.5 hover:bg-black/15 dark:hover:bg-white/15 text-text-secondary group-hover:text-current cursor-pointer focus:outline-none"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}

                {DEFAULT_SUGGESTED_CONDITIONS.map((cond) => {
                  const isSelected = isCustomMode && customConditionText.toLowerCase() === cond.toLowerCase();
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => handleApplyChipCondition(cond)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors shadow-2xs",
                        isSelected
                          ? "bg-accent text-white border-accent"
                          : "bg-bg-subtle border-border/80 text-text-secondary hover:text-text hover:border-border"
                      )}
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>{cond}</span>
                    </button>
                  );
                })}
              </div>
            </div>
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
                to <strong>needs repair</strong> until the log is resolved
                {targetAsset.currentHolder
                  ? `. Custody stays with ${targetAsset.currentHolder} and is recorded on the log.`
                  : "."}
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
