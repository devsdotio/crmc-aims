import { useState, useEffect, useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  AlertTriangle,
  Check,
  Layers,
  Search,
  CheckCircle2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import type { StockAdjustPayload } from "@/features/consumables/client";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client";
import { formatPhp } from "@/components/projects/format-money";
import { filterMoneyInput } from "@/lib/numeric-input";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface AdjustStockDialogProps {
  item: ConsumableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAdjust: (itemId: string, payload: StockAdjustPayload) => void | Promise<void>;
}

const ADJUSTMENT_REASONS = [
  "Damaged / Expired Goods",
  "Lost / Missing Stock",
  "Physical Count Correction",
  "Department Direct Distribution",
  "Other Accountability Reason",
];

interface AdjustStockDialogFormProps {
  item: ConsumableItem;
  onClose: () => void;
  onConfirmAdjust: AdjustStockDialogProps["onConfirmAdjust"];
}

function AdjustStockDialogForm({
  item,
  onClose,
  onConfirmAdjust,
}: AdjustStockDialogFormProps) {
  const [deltaInput, setDeltaInput] = useState<string>(
    item.currentQty > 0 ? "-1" : "1"
  );
  const parsedDelta = Number(deltaInput);
  const adjustmentDelta =
    deltaInput.trim() === "" ||
    deltaInput.trim() === "-" ||
    deltaInput.trim() === "+" ||
    Number.isNaN(parsedDelta)
      ? 0
      : parsedDelta;
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0]);

  const reasonOptions = useMemo(
    () => ADJUSTMENT_REASONS.map((r) => ({ value: r, label: r })),
    []
  );
  const [notes, setNotes] = useState("");
  const [allocationMode, setAllocationMode] = useState<"specific" | "fifo">(
    "specific"
  );
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [increaseMode, setIncreaseMode] = useState<
    "new_batch" | "attach_existing"
  >("new_batch");
  const [attachLotId, setAttachLotId] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [lotSearchQuery, setLotSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: lots = [], isLoading: lotsLoading } = usePurchaseLotsQuery({
    consumableId: item.id,
    itemType: "consumable",
    enabled: true,
  });

  const availableLots = useMemo(
    () => lots.filter((l) => l.quantityRemaining > 0),
    [lots]
  );

  const filteredLots = useMemo(() => {
    if (!lotSearchQuery.trim()) return availableLots;
    const q = lotSearchQuery.toLowerCase().trim();
    return availableLots.filter(
      (l) =>
        l.lotCode.toLowerCase().includes(q) ||
        (l.supplierName && l.supplierName.toLowerCase().includes(q))
    );
  }, [availableLots, lotSearchQuery]);

  const fifoAllocationPreview = useMemo(() => {
    let remainingToDeduct = Math.abs(adjustmentDelta);
    const result: Array<(typeof availableLots)[number] & { deducted: number; balanceAfter: number }> = [];
    for (const lot of availableLots) {
      if (remainingToDeduct <= 0) {
        result.push({ ...lot, deducted: 0, balanceAfter: lot.quantityRemaining });
      } else {
        const deducted = Math.min(lot.quantityRemaining, remainingToDeduct);
        remainingToDeduct -= deducted;
        result.push({
          ...lot,
          deducted,
          balanceAfter: lot.quantityRemaining - deducted,
        });
      }
    }
    return result;
  }, [availableLots, adjustmentDelta]);

  useEffect(() => {
    if (availableLots.length > 0) {
      setSelectedLotId(availableLots[0].id);
      setAttachLotId(availableLots[0].id);
      setAllocationMode("specific");
    } else {
      setAllocationMode("fifo");
    }
  }, [availableLots]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const newExpectedQty = item.currentQty + adjustmentDelta;
  const isReducing = adjustmentDelta < 0;
  const isIncreasing = adjustmentDelta > 0;
  const selectedLot = availableLots.find((l) => l.id === selectedLotId) ?? null;
  const selectedAttachLot =
    availableLots.find((l) => l.id === attachLotId) ?? null;

  const isExceedingTotalStock = isReducing && Math.abs(adjustmentDelta) > item.currentQty;
  const isExceedingSelectedLot =
    isReducing &&
    allocationMode === "specific" &&
    Boolean(selectedLot && selectedLot.quantityRemaining < Math.abs(adjustmentDelta));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deltaInput.trim() || deltaInput === "-" || deltaInput === "+" || adjustmentDelta === 0) {
      setError("Please enter a non-zero adjustment change (e.g. -5 or +10).");
      return;
    }
    if (newExpectedQty < 0) {
      setError(
        `Cannot deduct ${Math.abs(adjustmentDelta)} ${item.unit}. Only ${item.currentQty} ${item.unit} available in stock.`
      );
      return;
    }
    const reservedQty = item.reservedQty ?? 0;
    if (isReducing && newExpectedQty < reservedQty) {
      setError(
        `Cannot reduce stock below ${reservedQty} ${item.unit} reserved for approved supply requests.`
      );
      return;
    }
    if (!reason.trim()) {
      setError("A reason is mandatory for auditing stock adjustments.");
      return;
    }

    const payload: StockAdjustPayload = {
      quantityChange: adjustmentDelta,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    };

    if (isReducing) {
      const need = Math.abs(adjustmentDelta);
      if (allocationMode === "specific" && selectedLotId) {
        const targetLot = availableLots.find((l) => l.id === selectedLotId);
        if (!targetLot) {
          setError("Please select an active lot to deduct from.");
          return;
        }
        if (targetLot.quantityRemaining < need) {
          setError(
            `Cannot deduct ${need} ${item.unit} from lot ${targetLot.lotCode}. Only ${targetLot.quantityRemaining} ${item.unit} remaining on this lot. Choose FIFO or select a larger lot.`
          );
          return;
        }
        payload.allocations = [
          {
            lotId: targetLot.id,
            lotCode: targetLot.lotCode,
            quantity: need,
          },
        ];
      } else {
        payload.useFifo = true;
      }
    } else if (isIncreasing) {
      if (increaseMode === "attach_existing" && attachLotId) {
        payload.attachLotId = attachLotId;
      } else {
        payload.createCorrectionLot = true;
        if (Number(unitCost) > 0) {
          payload.unitCost = Number(unitCost);
        }
      }
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onConfirmAdjust(item.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-dialog-title"
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Dialog Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-repair-bg/20 text-status-repair-text shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 id="adjust-dialog-title" className="text-base font-bold text-text leading-tight">
                Manual Stock Correction
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {item.itemCode} · {item.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close adjust dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2-Column Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-3 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 min-h-0 overflow-y-auto pr-1 p-0.5">
            {/* COLUMN 1: Stock Change & Reasons */}
            <div className="space-y-3.5 flex flex-col">
              {/* Summary Card */}
              <div className="p-3.5 rounded-xl border border-border bg-bg-subtle text-xs space-y-1.5 shrink-0">
                <div className="flex justify-between text-text-secondary">
                  <span>Current Recorded Stock:</span>
                  <span className="font-bold text-text">{item.currentQty} {item.unit}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Adjustment Change:</span>
                  <span className={cn("font-bold", adjustmentDelta < 0 ? "text-status-outofservice-text" : "text-status-active-text")}>
                    {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border font-bold text-text">
                  <span>New Calculated Total:</span>
                  <span className={cn(newExpectedQty < 0 ? "text-destructive" : "text-accent font-mono text-sm")}>
                    {newExpectedQty} {item.unit}
                  </span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <label htmlFor="adjustment-delta-input" className="block text-xs font-semibold text-text">
                    Stock Quantity Change (+ or -) <span className="text-accent">*</span>
                  </label>
                  {/* Quick Sign Toggles */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Math.abs(Number(deltaInput) || 1);
                        setDeltaInput(String(-current));
                        if (error) setError("");
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer",
                        adjustmentDelta < 0
                          ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/40 font-black"
                          : "bg-bg-subtle text-text-secondary border-border hover:text-text"
                      )}
                    >
                      - Deduct
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Math.abs(Number(deltaInput) || 1);
                        setDeltaInput(String(current));
                        if (error) setError("");
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer",
                        adjustmentDelta > 0
                          ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/40 font-black"
                          : "bg-bg-subtle text-text-secondary border-border hover:text-text"
                      )}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    id="adjustment-delta-input"
                    type="text"
                    inputMode="numeric"
                    value={deltaInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[+-]?\d*$/.test(val)) {
                        setDeltaInput(val);
                        if (error) setError("");
                      }
                    }}
                    placeholder="e.g. -5 or +10"
                    className={cn(
                      "w-full h-9 px-3 text-xs bg-bg border rounded-lg font-bold font-mono text-text focus:outline-none focus:ring-2",
                      isExceedingTotalStock
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-accent"
                    )}
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-text-secondary">Presets:</span>
                  {[-10, -5, -1, 1, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDeltaInput(String(preset));
                        if (error) setError("");
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer",
                        preset < 0
                          ? "bg-status-outofservice-bg/10 hover:bg-status-outofservice-bg/25 text-status-outofservice-text border-status-outofservice-bg/30"
                          : "bg-status-active-bg/10 hover:bg-status-active-bg/25 text-status-active-text border-status-active-bg/30"
                      )}
                    >
                      {preset > 0 ? `+${preset}` : preset}
                    </button>
                  ))}
                </div>

                {isExceedingTotalStock && (
                  <p className="text-[11px] text-destructive font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Exceeds stock: cannot deduct {Math.abs(adjustmentDelta)} {item.unit} (only {item.currentQty} {item.unit} available).
                  </p>
                )}
              </div>

              {/* Reason Selection */}
              <div className="space-y-1">
                <label htmlFor="adjustment-reason-select" className="block text-xs font-bold text-text">
                  Accountability Reason <span className="text-accent">*</span>
                </label>
                <SearchableSelect
                  id="adjustment-reason-select"
                  value={reason}
                  onValueChange={(next) => {
                    setReason(next);
                    if (error) setError("");
                  }}
                  options={reasonOptions}
                  placeholder="Type to find a reason…"
                  aria-required="true"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1 flex-1">
                <label htmlFor="adjust-notes-input" className="block text-xs font-semibold text-text">
                  Explanation & Incident Details
                </label>
                <textarea
                  id="adjust-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Provide context for audit records…"
                  className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* COLUMN 2: Batch & Lot Allocation */}
            <div className="flex flex-col space-y-3.5">
              <div className="flex-1 p-3.5 rounded-xl border border-border bg-card space-y-3 flex flex-col min-h-0 overflow-hidden">
                {/* Header with lot count badge */}
                <div className="flex items-center justify-between border-b border-border/70 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold text-text">
                      {isReducing ? "Source Batch / Purchase Lot" : "Batch & Lot Destination"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-subtle text-text-secondary border border-border">
                    {availableLots.length} Active Lots
                  </span>
                </div>

                {/* Reducing / Deduction Mode */}
                {isReducing && (
                  <div className="space-y-3 text-xs flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Mode Toggle Switcher at the very top */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-subtle border border-border shrink-0">
                      <button
                        type="button"
                        onClick={() => setAllocationMode("specific")}
                        className={cn(
                          "py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer text-center",
                          allocationMode === "specific"
                            ? "bg-bg text-text shadow-2xs font-bold border border-border"
                            : "text-text-secondary hover:text-text"
                        )}
                      >
                        Specific Lot
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationMode("fifo")}
                        className={cn(
                          "py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer text-center",
                          allocationMode === "fifo"
                            ? "bg-bg text-text shadow-2xs font-bold border border-border"
                            : "text-text-secondary hover:text-text"
                        )}
                      >
                        Auto FIFO
                      </button>
                    </div>

                    {availableLots.length > 0 ? (
                      <>
                        {allocationMode === "specific" && (
                          <div className="flex flex-col flex-1 min-h-0 space-y-2 overflow-hidden">
                            {/* Search input moved up right at the top */}
                            <div className="relative shrink-0 p-0.5">
                              <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Search by lot code or supplier…"
                                value={lotSearchQuery}
                                onChange={(e) => setLotSearchQuery(e.target.value)}
                                className="w-full h-8.5 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>

                            {/* Scrollable Lot Cards accommodating any number of lots */}
                            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-1 pr-1.5 max-h-52">
                              {filteredLots.length === 0 ? (
                                <div className="p-4 text-center text-xs text-text-secondary rounded-lg border border-dashed border-border bg-bg-subtle/50">
                                  No purchase lots matching &quot;{lotSearchQuery}&quot;
                                </div>
                              ) : (
                                filteredLots.map((lot) => {
                                  const isSelected = selectedLotId === lot.id;
                                  const need = Math.abs(adjustmentDelta);
                                  const balanceAfter = lot.quantityRemaining - need;
                                  const isExceeded = balanceAfter < 0;

                                  return (
                                    <div
                                      key={lot.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        setSelectedLotId(lot.id);
                                        if (error) setError("");
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          setSelectedLotId(lot.id);
                                          if (error) setError("");
                                        }
                                      }}
                                      className={cn(
                                        "relative flex flex-col p-2.5 rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden space-y-1.5",
                                        isSelected
                                          ? "border-primary/50 border-l-4 border-l-primary bg-primary/5 shadow-2xs"
                                          : "border-border bg-bg hover:bg-bg-subtle/70"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-xs text-text">
                                            {lot.lotCode}
                                          </span>
                                          {lot.supplierName && (
                                            <span className="text-[10px] bg-bg-subtle text-text-secondary px-1.5 py-0.5 rounded border border-border truncate max-w-[130px]">
                                              {lot.supplierName}
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-mono text-[10px] text-text-secondary">
                                          {formatPhp(Number(lot.unitCost))} / unit
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                                        <span className="text-[11px] text-text-secondary">
                                          Balance: <b className="text-text font-mono">{lot.quantityRemaining} {item.unit}</b>
                                        </span>
                                        {isSelected && need > 0 && (
                                          <span
                                            className={cn(
                                              "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                                              isExceeded
                                                ? "bg-status-outofservice-bg/20 text-status-outofservice-text"
                                                : "bg-status-active-bg/20 text-status-active-text"
                                            )}
                                          >
                                            {balanceAfter} {item.unit} after -{need}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {allocationMode === "fifo" && (
                          <div className="flex flex-col flex-1 min-h-0 space-y-2 overflow-hidden">
                            <div className="p-2.5 rounded-lg border border-border bg-bg-subtle text-xs text-text-secondary leading-relaxed shrink-0">
                              <p className="font-bold text-text mb-0.5 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                                FIFO Sequence Breakdown
                              </p>
                              <p className="text-[11px]">
                                Deducting {Math.abs(adjustmentDelta)} {item.unit} sequentially across oldest batches:
                              </p>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-1 pr-1.5 max-h-52">
                              {fifoAllocationPreview.map((lot, idx) => (
                                <div
                                  key={lot.id}
                                  className={cn(
                                    "p-2 rounded-lg border text-xs space-y-1",
                                    lot.deducted > 0
                                      ? "border-accent/40 bg-accent/5"
                                      : "border-border bg-bg opacity-60"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-xs text-text">
                                      #{idx + 1} {lot.lotCode}
                                    </span>
                                    {lot.deducted > 0 ? (
                                      <span className="font-mono font-bold text-status-outofservice-text bg-status-outofservice-bg/15 px-1.5 py-0.5 rounded text-[10px]">
                                        -{lot.deducted} {item.unit}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-text-secondary">Untouched</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                                    <span>Remaining: {lot.balanceAfter} {item.unit}</span>
                                    <span>{lot.supplierName || "Direct Batch"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-text-secondary leading-relaxed bg-bg-subtle p-3 rounded-lg border border-border">
                        No active supplier lots with remaining balance found. System will adjust overall stock directly.
                      </p>
                    )}
                  </div>
                )}

                {/* Increasing / Addition Mode */}
                {isIncreasing && (
                  <div className="space-y-3 text-xs flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-subtle border border-border shrink-0">
                      <button
                        type="button"
                        onClick={() => setIncreaseMode("new_batch")}
                        className={cn(
                          "py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer text-center",
                          increaseMode === "new_batch"
                            ? "bg-bg text-text shadow-2xs font-bold border border-border"
                            : "text-text-secondary hover:text-text"
                        )}
                      >
                        New Batch Lot
                      </button>
                      {availableLots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIncreaseMode("attach_existing")}
                          className={cn(
                            "py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer text-center",
                            increaseMode === "attach_existing"
                              ? "bg-bg text-text shadow-2xs font-bold border border-border"
                              : "text-text-secondary hover:text-text"
                          )}
                        >
                          Add to Existing
                        </button>
                      )}
                    </div>

                    {increaseMode === "attach_existing" && availableLots.length > 0 ? (
                      <div className="flex flex-col flex-1 min-h-0 space-y-2 overflow-hidden">
                        <div className="relative shrink-0 p-0.5">
                          <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search lot to add stock into…"
                            value={lotSearchQuery}
                            onChange={(e) => setLotSearchQuery(e.target.value)}
                            className="w-full h-8.5 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-1 pr-1.5 max-h-52">
                          {filteredLots.map((lot) => {
                            const isSelected = attachLotId === lot.id;
                            const added = Math.abs(adjustmentDelta);
                            return (
                              <div
                                key={lot.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setAttachLotId(lot.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setAttachLotId(lot.id);
                                  }
                                }}
                                className={cn(
                                  "flex flex-col p-2.5 rounded-xl border transition-all cursor-pointer space-y-1 select-none",
                                  isSelected
                                    ? "border-primary/50 border-l-4 border-l-primary bg-primary/5 shadow-2xs"
                                    : "border-border bg-bg hover:bg-bg-subtle/70"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-xs text-text">{lot.lotCode}</span>
                                  <span className="text-[10px] text-text-secondary">{lot.supplierName || "No supplier"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                                  <span className="text-text-secondary">Current: {lot.quantityRemaining} {item.unit}</span>
                                  {isSelected && (
                                    <span className="font-mono font-bold text-status-active-text text-[11px]">
                                      +{added} → {lot.quantityRemaining + added} {item.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs text-text font-semibold block">
                            Estimated Unit Valuation (₱)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={unitCost}
                            onChange={(e) => {
                              const next = filterMoneyInput(e.target.value);
                              if (next !== null) setUnitCost(next);
                            }}
                            placeholder="0.00"
                            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg font-mono font-bold text-text focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <p className="text-[11px] text-text-secondary leading-relaxed">
                            Assigns an acquisition cost to the new correction batch lot to maintain FIFO accounting accuracy.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2.5 rounded bg-status-outofservice-bg/10 border border-status-outofservice-bg/20 text-status-outofservice-text font-bold text-xs flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0 mt-3">
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
              disabled={
                isSubmitting ||
                adjustmentDelta === 0 ||
                isExceedingTotalStock ||
                isExceedingSelectedLot
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {isSubmitting ? "Submitting…" : "Confirm Stock Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdjustStockDialog({
  item,
  isOpen,
  onClose,
  onConfirmAdjust,
}: AdjustStockDialogProps) {
  if (!isOpen || !item) return null;

  return (
    <AdjustStockDialogForm
      key={item.id}
      item={item}
      onClose={onClose}
      onConfirmAdjust={onConfirmAdjust}
    />
  );
}
