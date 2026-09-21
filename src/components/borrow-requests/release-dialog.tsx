"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CalendarClock,
  Building2,
  FileText,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAssetCodeDisplay, formatItemDescription } from "@/lib/sanitize-display";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import { assetsApi } from "@/features/assets/client/assets-api";
import type { BorrowRequest } from "@/types/borrow-requests";
import type { ReleaseBorrowRequestPayload } from "@/features/borrow-requests/client/borrow-requests-api";
import type { Asset } from "@/types/assets";

export interface ReleaseDialogProps {
  request: BorrowRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    request: BorrowRequest,
    payload: ReleaseBorrowRequestPayload
  ) => Promise<void>;
}

function normalizeSearchToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    // Code match without dashes/spaces (e.g. "ast001" → "AST-001")
    return compactQ.length > 0 && normalizeSearchToken(field).includes(compactQ);
  });
}

function ReleaseLineAssetPicker({
  lineIndex,
  item,
  requestType,
  selectedAssetIds,
  disabledAssetIds,
  onToggle,
  onAutoSelect,
  onClearLine,
}: {
  lineIndex: number;
  item: BorrowRequest["items"][number];
  requestType: "borrowable" | "assignable";
  selectedAssetIds: string[];
  disabledAssetIds: Set<string>;
  onToggle: (lineIndex: number, assetId: string) => void;
  onAutoSelect: (lineIndex: number, availableAssetIds: string[], targetQty: number) => void;
  onClearLine: (lineIndex: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const resolveCategoryStyle = useCategoryStyleResolver();
  const assignmentType = requestType === "assignable" ? "assignable" : "borrowable";
  const catStyle = resolveCategoryStyle(item.category);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", "release-picker", item.category, assignmentType],
    queryFn: () =>
      assetsApi.listAssets(undefined, {
        category: item.category,
        availableOnly: true,
        assignmentType,
      }),
    enabled: Boolean(item.category),
  });

  const displayName = formatItemDescription(
    item.itemDescription,
    catStyle.label,
    item.itemType ?? "asset"
  );

  const remaining = item.quantity - selectedAssetIds.length;
  const isComplete = remaining === 0;

  // Full eligible set for auto-select / allocation — never narrowed by search.
  const eligibleAssets = useMemo(() => {
    return assets.filter(
      (asset: Asset) =>
        selectedAssetIds.includes(asset.id) || !disabledAssetIds.has(asset.id)
    );
  }, [assets, selectedAssetIds, disabledAssetIds]);

  // Display-only filter. Selected units stay visible so search cannot hide allocations.
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    return assets.filter(
      (asset: Asset) =>
        selectedAssetIds.includes(asset.id) ||
        assetMatchesSearch(asset, searchQuery)
    );
  }, [assets, searchQuery, selectedAssetIds]);

  const handleAutoSelect = () => {
    const availableIds = eligibleAssets.map((a: Asset) => a.id);
    onAutoSelect(lineIndex, availableIds, item.quantity);
  };

  const handleClearLine = () => {
    setSearchQuery("");
    onClearLine(lineIndex);
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 p-4 space-y-3",
        isComplete
          ? "border-emerald-500/30 bg-emerald-500/5 shadow-2xs"
          : "border-border bg-card shadow-xs"
      )}
    >
      {/* Line Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
              catStyle.bg,
              catStyle.text
            )}
          >
            {catStyle.label}
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-text truncate">{displayName}</h4>
            <p className="text-[11px] text-text-secondary">
              Requires {item.quantity} {item.quantity === 1 ? "unit" : "units"} to issue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedAssetIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearLine}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-bg-subtle"
              title="Clear selection for this item"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          {!isComplete && eligibleAssets.length > 0 && (
            <button
              type="button"
              onClick={handleAutoSelect}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 border border-accent/25 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              title="Auto-select first available units"
            >
              <Sparkles className="h-3 w-3" />
              Auto-Select
            </button>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              isComplete
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            )}
          >
            {isComplete ? (
              <>
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Fulfilled ({selectedAssetIds.length}/{item.quantity})
              </>
            ) : (
              `Needs ${remaining} more (${selectedAssetIds.length}/${item.quantity})`
            )}
          </span>
        </div>
      </div>

      {/* Search & Unit Picker Grid */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        {isLoading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-text-secondary animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading available units from inventory…
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">No available units in inventory</p>
              <p className="text-[11px] mt-0.5 text-text-secondary">
                There are currently 0 available {catStyle.label.toLowerCase()} units. Return borrowed items or add new stock before releasing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/60 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by asset code, name, serial, or location…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                aria-label={`Search available ${catStyle.label} units`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-secondary hover:text-text rounded cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <p className="text-[11px] text-text-secondary px-0.5">
                Showing {filteredAssets.length} of {assets.length} available unit
                {assets.length === 1 ? "" : "s"}
                {selectedAssetIds.length > 0
                  ? " · selected units stay visible"
                  : ""}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredAssets.length === 0 ? (
                <div className="col-span-full rounded-lg border border-border bg-bg-subtle p-3 text-xs text-text-secondary">
                  No units match &quot;{searchQuery.trim()}&quot;. Try the full asset
                  code or clear the search.
                </div>
              ) : (
                filteredAssets.map((asset: Asset) => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  const isUsedInOtherLine =
                    !isSelected && disabledAssetIds.has(asset.id);
                  const isLineFull =
                    !isSelected && selectedAssetIds.length >= item.quantity;
                  const isDisabled = isUsedInOtherLine || isLineFull;
                  const code = formatAssetCodeDisplay(asset.assetCode);

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onToggle(lineIndex, asset.id)}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-accent bg-accent/10 text-text ring-1 ring-accent/30 shadow-2xs font-medium"
                          : "border-border bg-bg hover:bg-bg-subtle hover:border-border/80 text-text",
                        isDisabled &&
                          "opacity-45 cursor-not-allowed bg-bg-subtle/50 hover:bg-bg-subtle/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border mt-0.5 transition-colors",
                          isSelected
                            ? "border-accent bg-accent text-accent-foreground shadow-2xs"
                            : "border-border bg-card"
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-mono font-bold text-[11px] text-text shrink-0">
                            {code}
                          </span>
                          {asset.location && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-text-secondary truncate shrink-0 max-w-28">
                              <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70" />
                              {asset.location}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text truncate mt-0.5">
                          {asset.name}
                        </p>
                        {isUsedInOtherLine && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                            Allocated to another item
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReleaseDialog({
  request,
  isOpen,
  onClose,
  onConfirm,
}: ReleaseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [selections, setSelections] = useState<Record<number, string[]>>({});

  const assetLines = useMemo(
    () =>
      (request?.items ?? []).filter(
        (item) => item.itemType !== "consumable" && !item.consumableId
      ),
    [request?.items]
  );

  const requestType = request?.requestType === "assignable" ? "assignable" : "borrowable";
  const isAssignable = requestType === "assignable";

  const totalRequiredUnits = useMemo(
    () => assetLines.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [assetLines]
  );

  const totalSelectedUnits = useMemo(
    () => Object.values(selections).reduce((sum, ids) => sum + ids.length, 0),
    [selections]
  );

  useEffect(() => {
    if (isOpen && request) {
      setPickedUpBy(request.requesterName || "");
      setNote("");
      setError("");
      setSelections({});
    }
  }, [isOpen, request]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  const disabledAssetIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(selections).forEach((lineIds) => {
      lineIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [selections]);

  const allLinesComplete = assetLines.every((item, idx) => {
    const selected = selections[idx] ?? [];
    return selected.length === item.quantity;
  });

  const toggleAsset = (lineIndex: number, assetId: string) => {
    setSelections((prev) => {
      const current = prev[lineIndex] ?? [];
      const lineQty = assetLines[lineIndex]?.quantity ?? 0;

      if (current.includes(assetId)) {
        return { ...prev, [lineIndex]: current.filter((id) => id !== assetId) };
      }
      if (current.length >= lineQty) return prev;
      return { ...prev, [lineIndex]: [...current, assetId] };
    });
    if (error) setError("");
  };

  const handleAutoSelectLine = (
    lineIndex: number,
    availableAssetIds: string[],
    targetQty: number
  ) => {
    const currentLineSelections = selections[lineIndex] ?? [];
    const alreadySelectedSet = new Set(currentLineSelections);
    const needed = targetQty - currentLineSelections.length;

    if (needed <= 0) return;

    const newlySelected: string[] = [];
    for (const id of availableAssetIds) {
      if (!alreadySelectedSet.has(id) && !disabledAssetIds.has(id)) {
        newlySelected.push(id);
        if (newlySelected.length === needed) break;
      }
    }

    setSelections((prev) => ({
      ...prev,
      [lineIndex]: [...(prev[lineIndex] ?? []), ...newlySelected],
    }));
    if (error) setError("");
  };

  const handleClearLine = (lineIndex: number) => {
    setSelections((prev) => ({
      ...prev,
      [lineIndex]: [],
    }));
    if (error) setError("");
  };

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedUpBy.trim()) {
      setError("Please specify the recipient who is physically receiving the equipment.");
      return;
    }
    if (!allLinesComplete) {
      setError("Please select physical units for all requested line items before releasing.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const lineAllocations = assetLines.map((_, lineIndex) => ({
        lineIndex,
        assetIds: selections[lineIndex] ?? [],
      }));

      await onConfirm(request, {
        pickedUpBy: pickedUpBy.trim(),
        note: note.trim() || undefined,
        lineAllocations,
      });

      setPickedUpBy("");
      setNote("");
      setSelections({});
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to release equipment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 transition-opacity">
      <div
        className="absolute inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-dialog-title"
        className="relative w-full max-w-2xl max-h-[90vh] bg-bg rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-border"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 id="release-dialog-title" className="text-base font-bold text-text leading-tight">
                {isAssignable ? "Release Permanent Assignment" : "Release Equipment & Handover"}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {request.requestCode} · Select physical units from registry
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Requester Context Strip */}
            <div className="rounded-lg border border-border bg-bg-subtle/50 overflow-hidden text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                  <span className="text-[10px] font-semibold uppercase text-text-secondary">
                    Requester:
                  </span>
                  <span className="font-bold text-text truncate">
                    {request.requesterName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase">Dept:</span>
                  <span className="font-medium text-text">{request.department}</span>
                </div>
                {request.expectedReturnDate && (
                  <div className="flex items-center gap-1.5 text-text-secondary shrink-0 ml-auto">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold uppercase">Due:</span>
                    <span className="font-bold text-primary">{request.expectedReturnDate}</span>
                  </div>
                )}
              </div>

              {/* Progress Summary */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-bg-subtle/30 text-xs">
                <span className="font-medium text-text-secondary">
                  Unit Allocation Progress:
                </span>
                <span
                  className={cn(
                    "font-bold text-[11px]",
                    allLinesComplete ? "text-emerald-600 dark:text-emerald-400" : "text-text"
                  )}
                >
                  {totalSelectedUnits} of {totalRequiredUnits} units allocated
                </span>
              </div>
            </div>

            {/* Line-by-Line Unit Allocation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Line Items to Fulfill ({assetLines.length})
                </span>
                <span className="text-[11px] text-text-secondary">
                  Click units below to select or unselect
                </span>
              </div>

              {assetLines.map((item, idx) => (
                <ReleaseLineAssetPicker
                  key={idx}
                  lineIndex={idx}
                  item={item}
                  requestType={requestType}
                  selectedAssetIds={selections[idx] ?? []}
                  disabledAssetIds={disabledAssetIds}
                  onToggle={toggleAsset}
                  onAutoSelect={handleAutoSelectLine}
                  onClearLine={handleClearLine}
                />
              ))}
            </div>

            {/* Recipient Details & Notes */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="pickedUpBy"
                    className="text-xs font-semibold text-text"
                  >
                    Physically Received / Picked Up By <span className="text-accent">*</span>
                  </label>
                  {pickedUpBy !== request.requesterName && (
                    <button
                      type="button"
                      onClick={() => setPickedUpBy(request.requesterName)}
                      className="text-[11px] text-accent hover:underline cursor-pointer"
                    >
                      Use Requester ({request.requesterName})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/60 pointer-events-none" />
                  <input
                    id="pickedUpBy"
                    type="text"
                    placeholder="Enter full name of recipient"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full pl-9 pr-3.5 py-2 bg-bg border rounded-lg text-xs text-text placeholder:text-text-secondary/50",
                      "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow",
                      error && !pickedUpBy.trim() ? "border-status-outofservice-bg" : "border-border"
                    )}
                    value={pickedUpBy}
                    onChange={(e) => setPickedUpBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="release-note"
                  className="text-xs font-semibold text-text"
                >
                  Release / Handover Notes (Optional)
                </label>
                <textarea
                  id="release-note"
                  placeholder="Included accessories (chargers, mouse, bag), condition notes, or handover observations…"
                  disabled={isSubmitting}
                  rows={2}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-text-secondary/50 resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 text-xs text-status-outofservice-text flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-bg-subtle/50 border-t border-border flex items-center justify-between gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
              {allLinesComplete ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready to release
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {totalRequiredUnits - totalSelectedUnits} units left to select
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !allLinesComplete}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all shadow-xs cursor-pointer",
                  "bg-accent text-accent-foreground",
                  isSubmitting || !allLinesComplete
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:opacity-90 active:scale-98"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Issuing Equipment…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Confirm Release & Handover
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
