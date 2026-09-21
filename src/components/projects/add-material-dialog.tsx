"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Boxes,
  Check,
  Hash,
  Info,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import { formatPhp } from "./format-money";
import { availableQty } from "@/components/consumables/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type MaterialFormInput = {
  consumableId: string;
  purchaseLotId: string;
  quantity: number;
  notes: string;
};

export function AddMaterialDialog({
  isOpen,
  items,
  loadingItems,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  items: ConsumableItem[];
  loadingItems?: boolean;
  onClose: () => void;
  onSubmit: (input: MaterialFormInput) => void | Promise<void>;
}) {
  const available = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.filter((i) => availableQty(i) > 0);
  }, [items]);

  const [search, setSearch] = useState("");
  const [consumableId, setConsumableId] = useState("");
  const [purchaseLotId, setPurchaseLotId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [available, search]);

  const consumableOptions = useMemo(
    () =>
      filteredItems.map((i) => ({
        value: i.id,
        label: `${i.name} (${i.itemCode}) — ${availableQty(i)} ${i.unit} available`,
        keywords: `${i.itemCode} ${i.name} ${i.category}`,
      })),
    [filteredItems]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (consumableId && !filteredItems.some((i) => i.id === consumableId)) {
      setConsumableId(filteredItems[0]?.id ?? "");
    }
  }, [filteredItems, consumableId, isOpen]);

  const selected = available.find((i) => i.id === consumableId) ?? null;

  const { data: lots = [], isLoading: lotsLoading } = usePurchaseLotsQuery({
    consumableId: selected?.id,
    itemType: "consumable",
    enabled: isOpen && Boolean(selected?.id),
  });

  const availableLots = useMemo(
    () => lots.filter((lot) => lot.quantityRemaining > 0),
    [lots]
  );

  const lotOptions = useMemo(
    () =>
      availableLots.map((lot) => ({
        value: lot.id,
        label: `${lot.lotCode} · ${lot.quantityRemaining} remaining (${formatPhp(Number(lot.unitCost))}/unit)`,
        keywords: lot.lotCode,
      })),
    [availableLots]
  );

  const selectedLot = availableLots.find((l) => l.id === purchaseLotId) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setConsumableId(available[0]?.id ?? "");
    setPurchaseLotId("");
    setQuantity(1);
    setNotes("");
    setError("");
    setIsSubmitting(false);
  }, [isOpen, available]);

  useEffect(() => {
    if (!isOpen || !consumableId) return;
    setPurchaseLotId("");
    setQuantity(1);
  }, [isOpen, consumableId]);

  useEffect(() => {
    if (!purchaseLotId && availableLots.length > 0) {
      setPurchaseLotId(availableLots[0].id);
    }
  }, [availableLots, purchaseLotId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  const maxQty = selectedLot
    ? selectedLot.quantityRemaining
    : selected
      ? availableQty(selected)
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Select an inventory item with available stock.");
      return;
    }
    if (!purchaseLotId || !selectedLot) {
      setError("Select a purchase lot to issue from.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }
    if (quantity > selectedLot.quantityRemaining) {
      setError(
        `Selected lot only has ${selectedLot.quantityRemaining} ${selected.unit} remaining.`
      );
      return;
    }
    const free = availableQty(selected);
    if (quantity > free) {
      setError(
        `Only ${free} ${selected.unit} available (${selected.reservedQty ?? 0} reserved for approved supply requests).`
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        consumableId: selected.id,
        purchaseLotId,
        quantity,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to charge materials."
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
        aria-labelledby="material-form-heading"
        className="relative w-full max-w-lg bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <h2 id="material-form-heading" className="text-sm font-bold text-text">
                Use Inventory Material
              </h2>
              <p className="text-[11px] text-text-secondary">
                Select consumable and purchase lot to charge to this project
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="mat-search" className={labelClass}>
              Search supplies
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
              <input
                id="mat-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, code, or category…"
                className={cn(fieldClass, "pl-8.5")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="mat-item" className={labelClass}>
              Consumable Material <span className="text-accent">*</span>
            </label>
            {loadingItems ? (
              <div className="h-9 rounded-lg bg-border animate-pulse" />
            ) : (
              <SearchableSelect
                id="mat-item"
                value={consumableId}
                onValueChange={setConsumableId}
                options={consumableOptions}
                disabled={filteredItems.length === 0}
                placeholder={
                  filteredItems.length === 0
                    ? "No stocked items match your search"
                    : "Type to find a material…"
                }
                emptyMessage="No stocked items match your search"
              />
            )}
          </div>

          {selected && (
            <div className="p-3 rounded-lg border border-border bg-bg-subtle/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-medium">Free stock</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-active-bg/15 text-status-active-text border border-status-active-bg/25">
                  {availableQty(selected)} {selected.unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="mat-lot" className={labelClass}>
              Issue from lot <span className="text-accent">*</span>
            </label>
            {lotsLoading ? (
              <p className="text-xs text-text-secondary animate-pulse">
                Loading purchase lots…
              </p>
            ) : !selected ? (
              <p className="text-xs text-text-secondary">Select a consumable first.</p>
            ) : availableLots.length === 0 ? (
              <p className="text-xs text-status-repair-text">
                No active lots with remaining stock. Restock this item first.
              </p>
            ) : (
              <SearchableSelect
                id="mat-lot"
                value={purchaseLotId}
                onValueChange={setPurchaseLotId}
                options={lotOptions}
                placeholder="Type to find a lot…"
                emptyMessage="No active lots with remaining stock"
              />
            )}
            {selectedLot && quantity > selectedLot.quantityRemaining && (
              <p className="mt-1.5 text-[11px] text-status-repair-text">
                Selected lot only has {selectedLot.quantityRemaining}{" "}
                {selected?.unit} remaining.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="mat-qty" className={labelClass}>
                Quantity to use <span className="text-accent">*</span>
              </label>
              {maxQty != null && selected && (
                <span className="text-[10px] text-text-secondary">
                  Max: {maxQty} {selected.unit}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <Hash className="h-3.5 w-3.5" />
              </span>
              <input
                id="mat-qty"
                type="number"
                min={1}
                max={maxQty}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={cn(fieldClass, "pl-8.5 font-mono tabular-nums")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="mat-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="mat-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="e.g. For wall repaint / electrical work in Room 204…"
            />
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-bg-subtle/40 text-[11px] text-text-secondary">
            <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>
              Stock is deducted from the selected lot immediately. Deleting the
              material line restores stock to that lot.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selected ||
                !purchaseLotId ||
                availableLots.length === 0
              }
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Charging…" : "Charge to Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
