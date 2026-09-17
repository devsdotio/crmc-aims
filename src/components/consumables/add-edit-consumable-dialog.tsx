"use client";

import { useState, useEffect, useMemo } from "react";
import { X, PackagePlus, Edit } from "lucide-react";
import type { ConsumableItem, ConsumableCategory } from "@/types/inventory";
import {
  CONSUMABLE_CLASSIFICATIONS,
  CONSUMABLE_CLASSIFICATION_LABELS,
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  type ConsumableClassification,
} from "@/lib/consumable-classification";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useSuppliersQuery } from "@/features/suppliers/client";
import Link from "next/link";
import {
  filterMoneyInput,
  filterUnsignedIntInput,
  parseMoney,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { formatPhp } from "@/components/projects/format-money";

export type SaveConsumablePayload = Partial<ConsumableItem> & {
  unitCost?: string | number;
  supplierId?: string | null;
};

export interface AddEditConsumableDialogProps {
  isOpen: boolean;
  initialItem?: ConsumableItem | null;
  onClose: () => void;
  onSave: (itemData: SaveConsumablePayload) => void | Promise<void>;
}

interface AddEditConsumableDialogFormProps {
  initialItem?: ConsumableItem | null;
  onClose: () => void;
  onSave: (itemData: SaveConsumablePayload) => void | Promise<void>;
}

function matchSupplierId(
  suppliers: { id: string; name: string }[],
  preferredName?: string | null
): string {
  if (!preferredName?.trim()) return "";
  const name = preferredName.trim().toLowerCase();
  return suppliers.find((s) => s.name.toLowerCase() === name)?.id ?? "";
}

function AddEditConsumableDialogForm({
  initialItem,
  onClose,
  onSave,
}: AddEditConsumableDialogFormProps) {
  const isEditing = Boolean(initialItem);
  const { data: allCategories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useSuppliersQuery({ activeOnly: true });

  const consumableCategories = useMemo(() => {
    const fromSettings = allCategories.filter((c) => c.type === "consumable");
    const current = initialItem?.category?.trim();
    if (
      current &&
      !fromSettings.some(
        (c) => c.name.toLowerCase() === current.toLowerCase()
      )
    ) {
      return [
        {
          id: `legacy-${current}`,
          name: current,
          type: "consumable" as const,
        },
        ...fromSettings,
      ];
    }
    return fromSettings;
  }, [allCategories, initialItem?.category]);

  const [name, setName] = useState(() => initialItem?.name ?? "");
  const [category, setCategory] = useState(
    () => initialItem?.category ?? ""
  );
  const [classification, setClassification] = useState<ConsumableClassification>(
    () => initialItem?.classification ?? DEFAULT_CONSUMABLE_CLASSIFICATION
  );
  const [unit, setUnit] = useState(() => initialItem?.unit ?? "reams");
  const [currentQty, setCurrentQty] = useState(() =>
    initialItem ? String(initialItem.currentQty) : "0"
  );
  const [minThreshold, setMinThreshold] = useState(() =>
    String(initialItem?.minThreshold ?? 15)
  );
  const [unitCost, setUnitCost] = useState("");
  const [location, setLocation] = useState(
    () => initialItem?.location ?? "Supply Storage Bay A1"
  );
  /** Prefer registry id; free-text legacy names resolve on supplier list load. */
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState(() => initialItem?.notes ?? "");
  const [isSandbox, setIsSandbox] = useState(() => initialItem?.isSandbox ?? false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qtyValue = parseUnsignedInt(currentQty, 0);
  const needsOpeningLot = !isEditing && qtyValue > 0;
  const costValue = parseMoney(unitCost);
  const openingTotal =
    needsOpeningLot && costValue !== null && costValue > 0
      ? qtyValue * costValue
      : 0;

  // Map legacy free-text preferred supplier → registry option when list loads.
  useEffect(() => {
    if (suppliers.length === 0) return;
    setSupplierId((prev) => {
      if (prev) return prev;
      return matchSupplierId(suppliers, initialItem?.supplier);
    });
  }, [suppliers, initialItem?.supplier]);

  useEffect(() => {
    if (isEditing || category || consumableCategories.length === 0) return;
    setCategory(consumableCategories[0].name);
  }, [consumableCategories, category, isEditing]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the consumable item name.");
      return;
    }
    if (!category) {
      setError(
        consumableCategories.length === 0
          ? "No consumable categories yet. Add them under Settings → Categories."
          : "Please select a category."
      );
      return;
    }

    const threshold = parseUnsignedInt(minThreshold, 0);
    if (threshold < 1) {
      setError("Minimum reorder threshold must be at least 1.");
      return;
    }

    const qty = parseUnsignedInt(currentQty, 0);
    if (!isEditing && qty > 0) {
      if (!supplierId) {
        setError("Select a supplier when adding initial stock.");
        return;
      }
      const cost = parseMoney(unitCost);
      if (cost === null || cost <= 0) {
        setError("Unit cost must be greater than zero when adding initial stock.");
        return;
      }
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    const supplierName = selectedSupplier?.name;

    try {
      setIsSubmitting(true);
      setError("");
      await onSave({
        id: initialItem ? initialItem.id : undefined,
        itemCode: initialItem
          ? initialItem.itemCode
          : `CON-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.trim(),
        category: category as ConsumableCategory,
        classification,
        unit: unit.trim() || "units",
        currentQty: qty,
        minThreshold: threshold,
        location: location.trim() || "Supply Storage Bay",
        supplier: supplierName ?? (isEditing ? null : undefined),
        supplierId: needsOpeningLot ? supplierId : supplierId || null,
        unitCost: needsOpeningLot ? unitCost : undefined,
        notes: notes.trim() || undefined,
        isSandbox,
        lastRestocked: new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save consumable."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 my-8"
      >
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              {isEditing ? (
                <Edit className="h-5 w-5" />
              ) : (
                <PackagePlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                {isEditing
                  ? "Edit Consumable Item"
                  : "Register New Consumable Item"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Choose Supplies or Materials, then a category from Settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs font-bold text-status-outofservice-text">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="consumable-name-input"
              className="block text-xs font-semibold text-text"
            >
              Item Name <span className="text-accent">*</span>
            </label>
            <input
              id="consumable-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. A4 Multipurpose Copy Paper 80gsm"
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="classification-select"
              className="block text-xs font-semibold text-text"
            >
              Classification <span className="text-accent">*</span>
            </label>
            <select
              id="classification-select"
              value={classification}
              onChange={(e) =>
                setClassification(e.target.value as ConsumableClassification)
              }
              disabled={isSubmitting}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {CONSUMABLE_CLASSIFICATIONS.map((id) => (
                <option key={id} value={id}>
                  {CONSUMABLE_CLASSIFICATION_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="category-select"
                className="block text-xs font-semibold text-text"
              >
                Category <span className="text-accent">*</span>
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting || categoriesLoading}
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-medium focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {categoriesLoading ? (
                  <option value="">Loading…</option>
                ) : consumableCategories.length === 0 ? (
                  <option value="">No categories — add in Settings</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Select a category…
                    </option>
                    {consumableCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="unit-input"
                className="block text-xs font-semibold text-text"
              >
                Unit of Measure <span className="text-accent">*</span>
              </label>
              <input
                id="unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. reams, bottles, cartridges"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="qty-input"
                className="block text-xs font-semibold text-text"
              >
                Current Qty
              </label>
              <input
                id="qty-input"
                type="text"
                inputMode="numeric"
                value={currentQty}
                onChange={(e) => {
                  const next = filterUnsignedIntInput(e.target.value);
                  if (next !== null) setCurrentQty(next);
                }}
                disabled={isSubmitting || isEditing}
                placeholder="0"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
              />
              {!isEditing && (
                <p className="text-[11px] text-text-secondary">
                  Leave 0 to register the SKU only. Any positive qty creates an
                  opening purchase lot.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="min-input"
                className="block text-xs font-semibold text-text"
              >
                Min Threshold
              </label>
              <input
                id="min-input"
                type="text"
                inputMode="numeric"
                value={minThreshold}
                onChange={(e) => {
                  const next = filterUnsignedIntInput(e.target.value);
                  if (next !== null) setMinThreshold(next);
                }}
                disabled={isSubmitting}
                placeholder="15"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {needsOpeningLot && (
            <div className="space-y-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
              <p className="text-[11px] font-semibold text-text">
                Opening stock details{" "}
                <span className="text-accent">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
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
                      if (next !== null) setUnitCost(next);
                    }}
                    disabled={isSubmitting}
                    placeholder="0.00"
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-text">
                    Line total
                  </span>
                  <div className="flex h-9 items-center px-3 rounded-lg border border-border bg-bg text-xs font-mono font-bold text-text">
                    {formatPhp(openingTotal)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary">
                Supplier is required below so the opening lot is cost-tracked
                like a normal restock.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="location-input"
              className="block text-xs font-semibold text-text"
            >
              Storage Location
            </label>
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="supplier-select"
              className="block text-xs font-semibold text-text"
            >
              {needsOpeningLot ? (
                <>
                  Supplier <span className="text-accent">*</span>
                </>
              ) : (
                "Preferred supplier"
              )}
            </label>
            <select
              id="supplier-select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={isSubmitting || suppliersLoading}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">
                {needsOpeningLot
                  ? "Select a supplier…"
                  : "None / unspecified"}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.supplierCode ? ` (${s.supplierCode})` : ""}
                </option>
              ))}
            </select>
            {initialItem?.supplier &&
              !matchSupplierId(suppliers, initialItem.supplier) &&
              !supplierId && (
                <p className="text-[11px] text-text-secondary">
                  Previous free-text value: “{initialItem.supplier}”. Pick a
                  registry supplier to replace it, or leave none.
                </p>
              )}
            {suppliers.length === 0 && !suppliersLoading && (
              <p className="text-[11px] text-text-secondary">
                No active suppliers.{" "}
                <Link
                  href="/suppliers"
                  className="text-accent font-semibold underline-offset-2 hover:underline"
                >
                  Add suppliers
                </Link>{" "}
                first
                {needsOpeningLot
                  ? " before registering opening stock."
                  : ". Multi-supplier cost tracking happens on Restock."}
              </p>
            )}
            {suppliers.length > 0 && !needsOpeningLot && (
              <p className="text-[11px] text-text-secondary">
                Preferred vendor for this item. Each restock can still use a
                different supplier with its own unit cost (purchase lot).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="notes-input"
              className="block text-xs font-semibold text-text"
            >
              Notes
            </label>
            <textarea
              id="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={isSubmitting}
              className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-bg-subtle/50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              <span className="block text-xs font-semibold text-text">
                Sandbox (testing only)
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5">
                Hidden from normal users unless a superadmin turns on sandbox visibility.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || consumableCategories.length === 0}
              className="h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Register item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddEditConsumableDialog({
  isOpen,
  initialItem,
  onClose,
  onSave,
}: AddEditConsumableDialogProps) {
  if (!isOpen) return null;
  return (
    <AddEditConsumableDialogForm
      key={initialItem?.id ?? "new"}
      initialItem={initialItem}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
