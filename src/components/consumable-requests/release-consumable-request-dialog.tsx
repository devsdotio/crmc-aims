"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  Package,
  User,
  X,
} from "lucide-react";

import { formatPhp } from "@/components/projects/format-money";
import { formatItemDescription, formatAssetCodeDisplay } from "@/lib/sanitize-display";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import { cn } from "@/lib/utils";
import type { ConsumableRequest } from "@/features/consumable-requests/client";
import type { ReleaseConsumableRequestPayload } from "@/features/consumable-requests/client/consumable-requests-api";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface ReleaseConsumableRequestDialogProps {
  request: ConsumableRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    request: ConsumableRequest,
    payload: ReleaseConsumableRequestPayload
  ) => Promise<void>;
}

function ReleaseLineLotRow({
  line,
  selectedLotId,
  onChange,
}: {
  line: ConsumableRequest["lines"][number];
  selectedLotId?: string;
  onChange: (lotId: string) => void;
}) {
  const { data: lots = [], isLoading } = usePurchaseLotsQuery({
    consumableId: line.consumableId,
    itemType: "consumable",
    enabled: Boolean(line.consumableId),
  });
  const resolveCategoryStyle = useCategoryStyleResolver();
  const catStyle = resolveCategoryStyle(line.category);

  const availableLots = useMemo(
    () => lots.filter((lot) => lot.quantityRemaining > 0),
    [lots]
  );

  const lotOptions = useMemo(
    () =>
      availableLots.map((lot) => {
        const isSuff = lot.quantityRemaining >= line.quantityRequested;
        return {
          value: lot.id,
          label: `${lot.lotCode || "Lot"} — ${lot.quantityRemaining} remaining (${formatPhp(Number(lot.unitCost))}/unit)${isSuff ? "" : " [INSUFFICIENT STOCK]"}`,
          keywords: lot.lotCode || "",
        };
      }),
    [availableLots, line.quantityRequested]
  );

  // Auto-select if only 1 lot is available with sufficient quantity
  useEffect(() => {
    if (!selectedLotId && availableLots.length === 1) {
      const singleLot = availableLots[0];
      if (singleLot && singleLot.quantityRemaining >= line.quantityRequested) {
        onChange(singleLot.id);
      }
    }
  }, [availableLots, selectedLotId, line.quantityRequested, onChange]);

  const selectedLot = availableLots.find((l) => l.id === selectedLotId);
  const isShortfall =
    selectedLot && selectedLot.quantityRemaining < line.quantityRequested;
  const isReady = Boolean(selectedLotId) && !isShortfall;

  const displayItemName = formatItemDescription(
    line.itemName,
    catStyle.label,
    "consumable"
  );
  const displayItemCode = formatAssetCodeDisplay(line.itemCode);

  const lineValuation = selectedLot
    ? Number(selectedLot.unitCost) * line.quantityRequested
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 p-4 space-y-3",
        isReady
          ? "border-emerald-500/30 bg-emerald-500/5 shadow-2xs"
          : "border-border bg-card shadow-xs"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
            <h4 className="text-xs font-bold text-text truncate">{displayItemName}</h4>
            <p className="text-[11px] text-text-secondary font-mono">
              {displayItemCode ? `${displayItemCode} · ` : ""}Quantity: {line.quantityRequested} {line.unit || "units"}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 self-start sm:self-center",
            isReady
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
          )}
        >
          {isReady ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.5} />
              Lot Allocated
            </>
          ) : (
            "Select Stock Lot"
          )}
        </span>
      </div>

      <div className="space-y-2 pt-2 border-t border-border/60">
        <label
          htmlFor={`lot-select-${line.id}`}
          className="block text-[11px] font-semibold text-text"
        >
          Source Purchase Lot <span className="text-accent">*</span>
        </label>

        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-text-secondary animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading active inventory lots…
          </div>
        ) : availableLots.length === 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              No active purchase lots with remaining stock found for this consumable. Please record a restock or lot intake first.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchableSelect
              id={`lot-select-${line.id}`}
              value={selectedLotId || ""}
              onValueChange={onChange}
              options={lotOptions}
              placeholder="Choose a purchase lot to deduct from…"
              clearLabel="Choose a purchase lot to deduct from…"
              emptyMessage="No active purchase lots"
              inputClassName={cn(
                "py-2",
                !selectedLotId ? "border-amber-500/40" : undefined
              )}
            />

            {/* Selected Lot Overview Card */}
            {selectedLot && !isShortfall && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg-subtle/70 border border-border/80 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="font-mono font-bold text-text truncate">
                    {selectedLot.lotCode || "Lot"}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    ({selectedLot.quantityRemaining} left after release: {selectedLot.quantityRemaining - line.quantityRequested})
                  </span>
                </div>
                {lineValuation !== null && (
                  <span className="font-semibold text-text shrink-0 text-[11px]">
                    Est. Cost: <span className="font-bold text-primary">{formatPhp(lineValuation)}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {isShortfall && selectedLot && (
          <div className="flex items-start gap-2 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 p-2.5 text-xs text-status-outofservice-text">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Selected lot {selectedLot.lotCode} only has {selectedLot.quantityRemaining} {line.unit || "units"} remaining, but this request requires {line.quantityRequested}. Please choose a different lot or restock.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReleaseConsumableRequestDialog({
  request,
  isOpen,
  onClose,
  onConfirm,
}: ReleaseConsumableRequestDialogProps) {
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lotByLine, setLotByLine] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !request) return;
    setReceivedBy(request.requesterName || request.department || "");
    setNote("");
    setError("");
    setLotByLine({});
  }, [isOpen, request]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen || !request) return null;

  const totalLines = request.lines.length;
  const allocatedLinesCount = request.lines.filter((l) => Boolean(lotByLine[l.id])).length;
  const isAllAllocated = totalLines > 0 && allocatedLinesCount === totalLines;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedBy.trim()) {
      setError("Please specify the recipient name who is receiving the supplies.");
      return;
    }
    const missing = request.lines.filter((line) => !lotByLine[line.id]);
    if (missing.length > 0) {
      setError("Please select an active purchase lot for every requested supply item.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(request, {
        receivedBy: receivedBy.trim(),
        note: note.trim() || undefined,
        lines: request.lines.map((line) => ({
          lineId: line.id,
          allocations: [
            {
              lotId: lotByLine[line.id],
              quantity: line.quantityRequested,
            },
          ],
        })),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue supplies. Please try again.");
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
        aria-labelledby="issue-supplies-dialog-title"
        className="relative w-full max-w-xl max-h-[90vh] bg-bg rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-border"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 id="issue-supplies-dialog-title" className="text-base font-bold text-text leading-tight">
                Issue & Disburse Supplies
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {request.requestCode} · Deduct inventory from lots
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

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Requester Context Ribbon */}
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
                <div className="flex items-center gap-1.5 text-text-secondary shrink-0 ml-auto">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase">Dept:</span>
                  <span className="font-medium text-text">{request.department}</span>
                </div>
              </div>

              {request.purpose && (
                <div className="px-3.5 py-2 bg-bg-subtle/30 flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-text font-medium leading-snug line-clamp-2">
                    {request.purpose}
                  </p>
                </div>
              )}
            </div>

            {/* Line items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Consumable Line Items ({totalLines})
                </span>
                <span className="text-[11px] text-text-secondary">
                  {allocatedLinesCount}/{totalLines} lots allocated
                </span>
              </div>

              <div className="space-y-3">
                {request.lines.map((line) => (
                  <ReleaseLineLotRow
                    key={line.id}
                    line={line}
                    selectedLotId={lotByLine[line.id]}
                    onChange={(lotId) =>
                      setLotByLine((prev) => ({ ...prev, [line.id]: lotId }))
                    }
                  />
                ))}
              </div>
            </div>

            {/* Recipient Details & Notes */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="receivedBy"
                    className="text-xs font-semibold text-text"
                  >
                    Physically Received By <span className="text-accent">*</span>
                  </label>
                  {receivedBy !== request.requesterName && (
                    <button
                      type="button"
                      onClick={() => setReceivedBy(request.requesterName)}
                      className="text-[11px] text-accent hover:underline cursor-pointer"
                    >
                      Use Requester ({request.requesterName})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/60 pointer-events-none" />
                  <input
                    id="receivedBy"
                    type="text"
                    placeholder="Enter name of person picking up the items"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full pl-9 pr-3.5 py-2 bg-bg border rounded-lg text-xs text-text placeholder:text-text-secondary/50",
                      "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow",
                      error && !receivedBy.trim() ? "border-status-outofservice-bg" : "border-border"
                    )}
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="releaseNote"
                  className="text-xs font-semibold text-text"
                >
                  Disbursement / Issue Notes (Optional)
                </label>
                <textarea
                  id="releaseNote"
                  rows={2}
                  placeholder="Any notes regarding packing, condition, or disbursement trail…"
                  disabled={isSubmitting}
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-bg-subtle/50 flex items-center justify-between gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
              {isAllAllocated ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All lots assigned
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {totalLines - allocatedLinesCount} item(s) need lot selection
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-bg text-text-secondary hover:text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isAllAllocated}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all shadow-xs cursor-pointer",
                  "bg-accent text-accent-foreground",
                  isSubmitting || !isAllAllocated
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:opacity-90 active:scale-98"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Disbursing…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Issue & Deduct Stock
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
