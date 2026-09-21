"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  PlusCircle,
  Check,
  CheckCircle2,
  Search,
  ArrowRight,
  ArrowLeft,
  Package,
  Layers,
  Building2,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import type { Supplier } from "@/types/suppliers";
import { formatPhp } from "@/components/projects/format-money";
import {
  filterMoneyInput,
  filterUnsignedIntInput,
  parseMoney,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type RestockConfirmInput = {
  itemId: string;
  qtyReceived: number;
  unitCost: number;
  supplierId?: string | null;
  notes?: string;
};

export interface RestockDialogProps {
  item: ConsumableItem | null;
  allItems: ConsumableItem[];
  suppliers: Supplier[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestock: (input: RestockConfirmInput) => void | Promise<void>;
}

interface RestockDialogFormProps {
  item: ConsumableItem | null;
  allItems: ConsumableItem[];
  suppliers: Supplier[];
  onClose: () => void;
  onConfirmRestock: RestockDialogProps["onConfirmRestock"];
}

function RestockDialogForm({
  item,
  allItems,
  suppliers,
  onClose,
  onConfirmRestock,
}: RestockDialogFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedItemId, setSelectedItemId] = useState<string>(() => item?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [qtyReceived, setQtyReceived] = useState("20");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.supplierCode})`,
        keywords: s.supplierCode,
      })),
    [suppliers]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const targetItem = allItems.find((i) => i.id === selectedItemId) || item;

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = allItems.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.itemCode.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.currentQty !== b.currentQty) return a.currentQty - b.currentQty;
      return a.name.localeCompare(b.name);
    });
  }, [allItems, searchQuery]);

  const total = (() => {
    const qty = parseUnsignedInt(qtyReceived, 0);
    const cost = parseMoney(unitCost);
    return qty > 0 && cost !== null && cost >= 0 ? qty * cost : 0;
  })();

  const handleNextStep = () => {
    if (!selectedItemId) {
      setError("Please select a consumable item to proceed.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!targetItem) {
      setError("Please select a consumable item to restock.");
      return;
    }
    const qty = parseUnsignedInt(qtyReceived, 0);
    if (qty <= 0) {
      setError("Quantity received must be greater than zero.");
      return;
    }
    const cost = parseMoney(unitCost);
    if (cost === null || cost < 0) {
      setError("Unit cost must be a non-negative amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmRestock({
        itemId: targetItem.id,
        qtyReceived: qty,
        unitCost: cost,
        supplierId: supplierId || null,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restock failed.");
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
        aria-labelledby="restock-dialog-title"
        className="relative w-full max-w-lg h-145 max-h-[90vh] rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="restock-dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                Log Incoming Restock
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {step === 1
                  ? "Step 1 of 2: Select the target consumable item"
                  : "Step 2 of 2: Enter restock quantity, cost & details"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close restock dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Wizard Indicator */}
        <nav aria-label="Restock Progress" className="w-full pt-3 pb-2 px-1 shrink-0">
          <ol className="flex items-center justify-between w-full">
            {[
              { stepNumber: 1, label: "Select Item" },
              { stepNumber: 2, label: "Restock Values" },
            ].map((s, idx) => {
              const isDone = s.stepNumber < step;
              const isActive = s.stepNumber === step;
              const isLast = idx === 1;

              return (
                <li
                  key={s.stepNumber}
                  className={cn("flex items-center", isLast ? "flex-none" : "flex-1")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (s.stepNumber === 1) setStep(1);
                      if (s.stepNumber === 2 && selectedItemId) setStep(2);
                    }}
                    disabled={s.stepNumber === 2 && !selectedItemId}
                    className={cn(
                      "flex items-center gap-2.5 text-left transition-opacity cursor-pointer group",
                      s.stepNumber === 2 && !selectedItemId && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Milestone Node */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                        isDone
                          ? "bg-accent text-accent-foreground shadow-xs"
                          : isActive
                          ? "bg-accent text-accent-foreground ring-4 ring-accent/20 shadow-xs"
                          : "bg-bg-subtle border border-border text-text-secondary font-medium"
                      )}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <span>{s.stepNumber}</span>
                      )}
                    </div>

                    {/* Milestone Label */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        Step {s.stepNumber}
                      </p>
                      <p
                        className={cn(
                          "text-xs leading-none transition-colors",
                          isActive
                            ? "font-bold text-text"
                            : isDone
                            ? "font-semibold text-text"
                            : "font-medium text-text-secondary"
                        )}
                      >
                        {s.label}
                      </p>
                    </div>
                  </button>

                  {/* Connecting Milestone Bar */}
                  {!isLast && (
                    <div
                      className={cn(
                        "mx-3 flex-1 h-0.5 transition-all duration-300 rounded-full",
                        step > 1 ? "bg-accent" : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Form Body */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col flex-1 min-h-0 pt-1 overflow-hidden"
        >
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-status-outofservice-bg/15 border border-status-outofservice-bg/40 text-xs font-bold text-status-outofservice-text shrink-0">
              {error}
            </div>
          )}

          {/* STEP 1: Select Target Consumable Item */}
          {step === 1 && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
              <div className="relative shrink-0 p-1">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by code, item name, or category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-1 pr-1.5">
                {filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-secondary rounded-xl border border-dashed border-border bg-bg-subtle/50">
                    No matching consumable items found.
                  </div>
                ) : (
                  filteredItems.map((i) => {
                    const isSelected = selectedItemId === i.id;
                    return (
                      <div
                        key={i.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedItemId(i.id);
                          setError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedItemId(i.id);
                            setError("");
                          }
                        }}
                        className={cn(
                          "relative flex items-center justify-between p-3 pl-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden",
                          isSelected
                            ? "border-primary/50 border-l-4 border-l-primary bg-primary/5 shadow-xs"
                            : "border-border bg-bg hover:bg-bg-subtle/70 hover:border-border"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio / Check indicator */}
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150",
                              isSelected
                                ? "bg-primary text-white shadow-2xs ring-2 ring-primary/20"
                                : "border-2 border-border bg-bg"
                            )}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : null}
                          </div>

                          {/* Item Icon */}
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold shrink-0 border transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary border-primary/25"
                                : "bg-bg-subtle text-text-secondary border-border"
                            )}
                          >
                            <Package className="h-4.5 w-4.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "font-bold text-xs truncate transition-colors",
                                  isSelected ? "text-primary" : "text-text"
                                )}
                              >
                                {i.name}
                              </span>
                              <span className="font-mono text-[10px] font-semibold bg-bg-subtle text-text-secondary px-1.5 py-0.5 rounded border border-border">
                                {i.itemCode}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">
                              Category: <span className="capitalize">{i.category.replace(/_/g, " ")}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs",
                              i.currentQty === 0
                                ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                                : i.currentQty <= i.minThreshold
                                ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                            )}
                          >
                            {i.currentQty} {i.unit} in stock
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedItemId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
                >
                  <span>Next: Restock Values</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Value Changes & Restock Details */}
          {step === 2 && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 p-0.5">
                {/* Selected Item Summary Card */}
              {targetItem && (
                <div className="p-3.5 rounded-xl border border-border bg-bg-subtle space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                        Target Consumable
                      </span>
                      <p className="font-bold text-xs text-text mt-0.5">
                        {targetItem.name}{" "}
                        <span className="font-mono text-text-secondary font-normal">
                          ({targetItem.itemCode})
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Change item
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-text-secondary block">Current Stock</span>
                      <span className="font-bold text-text font-mono">
                        {targetItem.currentQty} {targetItem.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">Adding</span>
                      <span className="font-bold text-status-active-text font-mono">
                        +{parseUnsignedInt(qtyReceived, 0)} {targetItem.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">New Total</span>
                      <span className="font-bold text-accent font-mono">
                        {targetItem.currentQty + parseUnsignedInt(qtyReceived, 0)} {targetItem.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity & Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="qty-received-input"
                    className="block text-xs font-semibold text-text"
                  >
                    Qty received <span className="text-accent">*</span>
                  </label>
                  <input
                    id="qty-received-input"
                    type="text"
                    inputMode="numeric"
                    value={qtyReceived}
                    onChange={(e) => {
                      const next = filterUnsignedIntInput(e.target.value);
                      if (next !== null) {
                        setQtyReceived(next);
                        if (error) setError("");
                      }
                    }}
                    placeholder="0"
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg font-bold font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="unit-cost-input"
                    className="block text-xs font-semibold text-text"
                  >
                    Unit cost (₱) <span className="text-accent">*</span>
                  </label>
                  <input
                    id="unit-cost-input"
                    type="text"
                    inputMode="decimal"
                    value={unitCost}
                    onChange={(e) => {
                      const next = filterMoneyInput(e.target.value);
                      if (next !== null) {
                        setUnitCost(next);
                        if (error) setError("");
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg font-bold font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Line Total Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-subtle/50 text-xs">
                <span className="text-text-secondary font-medium flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-text-secondary" />
                  Calculated Line Total:
                </span>
                <span className="font-mono font-bold text-sm text-text">
                  {formatPhp(total)}
                </span>
              </div>

              {/* Supplier Selection */}
              <div className="space-y-1">
                <label
                  htmlFor="restock-supplier"
                  className="block text-xs font-semibold text-text"
                >
                  Supplier
                </label>
                <SearchableSelect
                  id="restock-supplier"
                  value={supplierId}
                  onValueChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Type to find a supplier…"
                  clearLabel="No supplier / not listed"
                  emptyMessage="No active suppliers"
                />
                {suppliers.length === 0 && (
                  <p className="text-[10px] text-text-secondary">
                    No active suppliers — add one under Suppliers to track vendor pricing.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label
                  htmlFor="restock-notes-input"
                  className="block text-xs font-semibold text-text"
                >
                  PO # / Delivery notes
                </label>
                <textarea
                  id="restock-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. PO #8841 or batch receipt comments"
                  className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border shrink-0 mt-auto">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    )}
                    <span>
                      {isSubmitting ? "Recording restock…" : "Confirm restock"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function RestockDialog({
  item,
  allItems,
  suppliers,
  isOpen,
  onClose,
  onConfirmRestock,
}: RestockDialogProps) {
  if (!isOpen) return null;

  return (
    <RestockDialogForm
      key={item?.id ?? "restock-dialog"}
      item={item}
      allItems={allItems}
      suppliers={suppliers}
      onClose={onClose}
      onConfirmRestock={onConfirmRestock}
    />
  );
}
