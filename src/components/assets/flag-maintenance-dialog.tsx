"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import { useFlagMaintenanceMutation } from "@/features/assets/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AssetDialogShell } from "./asset-dialog-shell";
import {
  DEFAULT_SUGGESTED_CONDITIONS,
  getSavedCustomConditions,
  saveCustomCondition,
  removeCustomCondition,
} from "@/lib/custom-condition";

export interface FlagMaintenanceDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

type FlagCondition = "needs_maintenance" | "damaged";

const STANDARD_OPTIONS: Array<{
  value: FlagCondition;
  label: string;
  keywords: string;
}> = [
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

export function FlagMaintenanceDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: FlagMaintenanceDialogProps) {
  const [notes, setNotes] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("needs_maintenance");
  const [baselineCondition, setBaselineCondition] =
    useState<FlagCondition>("needs_maintenance");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customConditionText, setCustomConditionText] = useState("");
  const [saveConditionToQuickList, setSaveConditionToQuickList] = useState(true);
  const [savedConditions, setSavedConditions] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [error, setError] = useState("");

  const customInputRef = useRef<HTMLInputElement>(null);
  const mutation = useFlagMaintenanceMutation();

  // Load saved conditions from localStorage whenever dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setNotes("");
    setSelectedOption("needs_maintenance");
    setBaselineCondition("needs_maintenance");
    setIsCustomMode(false);
    setCustomConditionText("");
    setSaveConditionToQuickList(true);
    setScheduledDate("");
    setError("");
    setSavedConditions(getSavedCustomConditions());
  }, [isOpen, asset?.id]);

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomMode]);

  // Merge standard options + user saved custom conditions
  const dropdownOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; keywords?: string }> = [
      ...STANDARD_OPTIONS,
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

  if (!isOpen || !asset) return null;

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
    setBaselineCondition(val as FlagCondition);
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

  const submit = async () => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setError("Please describe the fault or maintenance issue.");
      return;
    }

    let finalCustomCondition: string | undefined = undefined;
    let finalCondition: FlagCondition = baselineCondition;

    if (isCustomMode) {
      const trimmedCustom = customConditionText.trim();
      if (!trimmedCustom) {
        setError("Please enter a custom condition name (or switch back to standard options).");
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
      finalCondition = (selectedOption as FlagCondition) || "needs_maintenance";
    }

    try {
      await mutation.mutateAsync({
        id: asset.id,
        payload: {
          notes: trimmedNotes,
          condition: finalCondition,
          customCondition: finalCustomCondition,
          scheduledDate: scheduledDate || undefined,
        },
      });

      const conditionLabel = finalCustomCondition
        ? finalCustomCondition
        : finalCondition === "damaged"
          ? "Damaged / Out of Service"
          : "Needs Maintenance";

      onSuccess?.(
        `${asset.assetCode} flagged for maintenance (${conditionLabel}). Document parts and costs on the asset, then mark serviceable when repaired.`
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
      icon={<Wrench className="h-5 w-5 text-status-repair-text" />}
      onClose={onClose}
      busy={pending}
      initialFocusSelector={isCustomMode ? "#custom-condition-input" : "#flag-condition-select"}
      alert={
        error ? (
          <div
            role="alert"
            className="flex items-start gap-2 p-2.5 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/25 text-status-outofservice-text text-xs font-semibold"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        ) : null
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 cursor-pointer rounded-lg border border-border bg-bg px-4 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-status-repair-bg px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-xs transition-opacity"
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
      <div className="space-y-4">
        <p className="text-xs text-text-secondary leading-relaxed bg-bg-subtle/60 p-3 rounded-lg border border-border/60">
          Marks this asset as needs repair and opens a Maintenance Logs entry.
          You can document parts, costs, and work notes on the asset while the
          flag is open.
          {asset.currentHolder ? (
            <>
              {" "}
              Currently assigned to{" "}
              <strong className="text-text font-bold">{asset.currentHolder}</strong> —
              custody stays; the assignee is recorded on the maintenance log.
            </>
          ) : null}
        </p>

        {/* Condition Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={isCustomMode ? "custom-condition-input" : "flag-condition-select"}
              className="block text-xs font-semibold text-text"
            >
              Condition <span className="text-accent">*</span>
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
                  setBaselineCondition("needs_maintenance");
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
            <div>
              <SearchableSelect
                id="flag-condition-select"
                value={selectedOption}
                onValueChange={handleSelectChange}
                options={dropdownOptions}
                disabled={mutation.isPending}
                placeholder="Type to find or add a condition…"
              />
            </div>
          ) : (
            /* Custom Condition Creator Card */
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
                    disabled={mutation.isPending}
                    className="w-full h-9 pl-8 pr-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent font-medium shadow-2xs"
                  />
                </div>
              </div>

              {/* Baseline Severity / Status Selector */}
              <div
                role="radiogroup"
                aria-label="Baseline Asset Severity Status"
                className="space-y-1.5 pt-1"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Baseline Asset Severity Status
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={baselineCondition === "needs_maintenance"}
                    onClick={() => setBaselineCondition("needs_maintenance")}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all text-xs",
                      baselineCondition === "needs_maintenance"
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
                    aria-checked={baselineCondition === "damaged"}
                    onClick={() => setBaselineCondition("damaged")}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all text-xs",
                      baselineCondition === "damaged"
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

              {/* Save Condition Checkbox */}
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

          {/* Quick Condition Suggestion Chips */}
          <div className="pt-1 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Quick Suggestions &amp; Saved
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {/* User-saved conditions first */}
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

              {/* Default presets */}
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

        {/* Target Service Date */}
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

        {/* Issue Description */}
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
            placeholder="e.g. Fan noisy, screen flicker on wake, loose connectors…"
            disabled={pending}
            className={cn(
              "w-full p-2.5 text-xs bg-bg border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed",
              error ? "border-status-outofservice-bg" : "border-border"
            )}
          />
        </div>
      </div>
    </AssetDialogShell>
  );
}
