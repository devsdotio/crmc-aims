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
import { SearchableSelect } from "@/components/ui/searchable-select";

export type SaveConsumablePayload = Partial<ConsumableItem> & {
  unitCost?: string | number;
  supplierId?: string | null;
};

export interface AddEditConsumableDialogProps {
  isOpen: boolean;
  initialItem?: ConsumableItem | null;
  defaultClassification?: ConsumableClassification;
  onClose: () => void;
  onSave: (itemData: SaveConsumablePayload) => void | Promise<void>;
}

interface AddEditConsumableDialogFormProps {
  initialItem?: ConsumableItem | null;
  defaultClassification?: ConsumableClassification;
  onClose: () => void;
  onSave: (itemData: SaveConsumablePayload) => void | Promise<void>;
}

type ErrorField =
  | "name"
  | "category"
  | "minThreshold"
  | "supplier"
  | "unitCost";

function matchSupplierId(
  suppliers: { id: string; name: string }[],
  preferredName?: string | null
): string {
  if (!preferredName?.trim()) return "";
  const name = preferredName.trim().toLowerCase();
  return suppliers.find((s) => s.name.toLowerCase() === name)?.id ?? "";
}

function describedBy(...ids: Array<string | false | undefined>) {
  const joined = ids.filter((id): id is string => Boolean(id)).join(" ");
  return joined || undefined;
}

function AddEditConsumableDialogForm({
  initialItem,
  defaultClassification,
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

  const classificationOptions = useMemo(
    () =>
      CONSUMABLE_CLASSIFICATIONS.map((id) => ({
        value: id,
        label: CONSUMABLE_CLASSIFICATION_LABELS[id],
      })),
    []
  );

  const categoryOptions = useMemo(
    () => consumableCategories.map((c) => ({ value: c.name, label: c.name })),
    [consumableCategories]
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.supplierCode ? `${s.name} (${s.supplierCode})` : s.name,
        keywords: s.supplierCode ?? "",
      })),
    [suppliers]
  );

  const [name, setName] = useState(() => initialItem?.name ?? "");
  const [category, setCategory] = useState(
    () => initialItem?.category ?? ""
  );
  const [classification, setClassification] = useState<ConsumableClassification>(
    () => initialItem?.classification ?? defaultClassification ?? DEFAULT_CONSUMABLE_CLASSIFICATION
  );
  const [unit, setUnit] = useState(() => initialItem?.unit ?? "");
  const [currentQty, setCurrentQty] = useState(() =>
    initialItem ? String(initialItem.currentQty) : "0"
  );
  const [minThreshold, setMinThreshold] = useState(() =>
    String(initialItem?.minThreshold ?? 15)
  );
  const [unitCost, setUnitCost] = useState("");
  const [location, setLocation] = useState(() => initialItem?.location ?? "");
  /** Prefer registry id; free-text legacy names resolve on supplier list load. */
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState(() => initialItem?.notes ?? "");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<ErrorField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qtyValue = parseUnsignedInt(currentQty, 0);
  const needsOpeningLot = !isEditing && qtyValue > 0;
  const costValue = parseMoney(unitCost);
  const openingTotal =
    needsOpeningLot && costValue !== null && costValue > 0
      ? qtyValue * costValue
      : 0;

  const hasLegacySupplier =
    Boolean(initialItem?.supplier) &&
    !matchSupplierId(suppliers, initialItem?.supplier) &&
    !supplierId;

  const isTypeLocked = Boolean(defaultClassification) && !isEditing;
  const lockedClassificationLabel = defaultClassification
    ? CONSUMABLE_CLASSIFICATION_LABELS[defaultClassification]
    : null;

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

  const setFieldError = (field: ErrorField, message: string) => {
    setErrorField(field);
    setError(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError("name", "Please enter the consumable item name.");
      return;
    }
    if (!category) {
      setFieldError(
        "category",
        consumableCategories.length === 0
          ? "No consumable categories yet. Add them under Settings → Categories."
          : "Please select a category."
      );
      return;
    }

    const threshold = parseUnsignedInt(minThreshold, 0);
    if (threshold < 1) {
      setFieldError("minThreshold", "Minimum reorder threshold must be at least 1.");
      return;
    }

    const qty = parseUnsignedInt(currentQty, 0);
    if (!isEditing && qty > 0) {
      if (!supplierId) {
        setFieldError("supplier", "Select a supplier when adding initial stock.");
        return;
      }
      const cost = parseMoney(unitCost);
      if (cost === null || cost <= 0) {
        setFieldError(
          "unitCost",
          "Unit cost must be greater than zero when adding initial stock."
        );
        return;
      }
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    const supplierName = selectedSupplier?.name;

    try {
      setIsSubmitting(true);
      setError("");
      setErrorField(null);
      await onSave({
        id: initialItem ? initialItem.id : undefined,
        itemCode: initialItem?.itemCode,
        name: name.trim(),
        category: category as ConsumableCategory,
        classification: isTypeLocked
          ? (defaultClassification as ConsumableClassification)
          : classification,
        unit: unit.trim() || "units",
        currentQty: qty,
        minThreshold: threshold,
        location: location.trim() || "Supply Storage Bay",
        supplier: supplierName ?? (isEditing ? null : undefined),
        supplierId: needsOpeningLot ? supplierId : supplierId || null,
        unitCost: needsOpeningLot && costValue !== null ? costValue : undefined,
        notes: notes.trim() || undefined,
        lastRestocked: new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      setErrorField(null);
      setError(
        err instanceof Error ? err.message : "Failed to save consumable."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const editSubtitle = initialItem?.itemCode
    ? `Update details for ${initialItem.itemCode}. On-hand quantity changes through Restock or Adjust.`
    : "Update details for this item. On-hand quantity changes through Restock or Adjust.";

  const addSubtitle = isTypeLocked && lockedClassificationLabel
    ? `This item will be registered as ${lockedClassificationLabel}. Leave opening quantity at 0 to register the item without stock.`
    : "Add a Supplies or Materials SKU. Leave opening quantity at 0 to register the item without stock.";

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
        aria-describedby="dialog-subtitle"
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 my-8"
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
                {isTypeLocked ? (
                  <>
                    {isEditing ? "Edit Consumable" : "Register Consumable"}{" "}
                    <span className="text-accent">
                      {defaultClassification === "material"
                        ? "Materials"
                        : "Supplies"}
                    </span>
                  </>
                ) : isEditing ? (
                  "Edit consumable"
                ) : (
                  "Register consumable"
                )}
              </h3>
              <p id="dialog-subtitle" className="text-xs text-text-secondary mt-0.5">
                {isEditing
                  ? editSubtitle
                  : addSubtitle}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p
              id="form-error"
              role="alert"
              className="text-xs font-bold text-status-outofservice-text"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <fieldset className="space-y-3 border-0 p-0 m-0">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              Item details
            </legend>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="consumable-name-input"
                  className="block text-xs font-semibold text-text"
                >
                  Item name <span className="text-accent">*</span>
                </label>
                <input
                  id="consumable-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={errorField === "name"}
                  aria-describedby={describedBy(errorField === "name" && "form-error")}
                  placeholder="e.g. A4 Multipurpose Copy Paper 80gsm"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {isTypeLocked ? (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-text">
                    Type
                  </span>
                  <div
                    className="flex h-9 items-center px-3 rounded-lg border border-border bg-bg-subtle text-xs font-medium text-text"
                    aria-describedby="classification-hint"
                  >
                    {lockedClassificationLabel}
                  </div>
                  <p id="classification-hint" className="text-[11px] text-text-secondary">
                    {defaultClassification === "material"
                      ? "Set by this page. Use Supplies to register day-to-day office stock."
                      : "Set by this page. Use Materials to register a project consumable."}
                  </p>
                </div>
              ) : (
              <div className="space-y-1">
                <label
                  htmlFor="classification-input"
                  className="block text-xs font-semibold text-text"
                >
                  Type <span className="text-accent">*</span>
                </label>
                <SearchableSelect
                  id="classification-input"
                  value={classification}
                  onValueChange={(next) =>
                    setClassification(next as ConsumableClassification)
                  }
                  options={classificationOptions}
                  disabled={isSubmitting}
                  placeholder="Type to find a type…"
                  aria-required="true"
                  aria-describedby="classification-hint"
                />
                <p id="classification-hint" className="text-[11px] text-text-secondary">
                  Supplies = day-to-day office stock; Materials = project / construction-style consumables
                </p>
              </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="category-input"
                  className="block text-xs font-semibold text-text"
                >
                  Category <span className="text-accent">*</span>
                </label>
                <SearchableSelect
                  id="category-input"
                  value={category}
                  onValueChange={setCategory}
                  options={categoryOptions}
                  disabled={isSubmitting || categoriesLoading}
                  placeholder={
                    categoriesLoading
                      ? "Loading…"
                      : consumableCategories.length === 0
                        ? "No categories — add in Settings"
                        : "Type to find a category…"
                  }
                  emptyMessage="No categories — add in Settings"
                  aria-required="true"
                  aria-invalid={errorField === "category"}
                  aria-describedby={describedBy(
                    "category-hint",
                    errorField === "category" && "form-error"
                  )}
                />
                <p id="category-hint" className="text-[11px] text-text-secondary">
                  Managed under Settings → Categories
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="unit-input"
                  className="block text-xs font-semibold text-text"
                >
                  Unit <span className="text-accent">*</span>
                </label>
                <input
                  id="unit-input"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-describedby="unit-hint"
                  placeholder="e.g. reams, bottles, boxes"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p id="unit-hint" className="text-[11px] text-text-secondary">
                  How this item is counted on the shelf
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-0 p-0 m-0">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              Stock
            </legend>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="qty-input"
                  className="block text-xs font-semibold text-text"
                >
                  {isEditing ? "On-hand quantity" : "Opening quantity"}
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
                  aria-describedby="qty-hint"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
                />
                <p id="qty-hint" className="text-[11px] text-text-secondary">
                  {isEditing
                    ? "Read-only. Use Restock or Adjust stock to change quantity."
                    : "Leave 0 to register the SKU only. Any amount above 0 creates an opening purchase lot."}
                </p>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="min-input"
                  className="block text-xs font-semibold text-text"
                >
                  Reorder when below <span className="text-accent">*</span>
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
                  aria-required="true"
                  aria-invalid={errorField === "minThreshold"}
                  aria-describedby={describedBy(
                    "min-hint",
                    errorField === "minThreshold" && "form-error"
                  )}
                  placeholder="e.g. 15"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p id="min-hint" className="text-[11px] text-text-secondary">
                  Low-stock alert when quantity reaches this level
                </p>
              </div>
            </div>

            {needsOpeningLot && (
              <div className="space-y-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <p className="text-[11px] font-semibold text-text">
                  Opening stock details{" "}
                  <span className="text-accent">*</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="unit-cost-input"
                      className="block text-xs font-semibold text-text"
                    >
                      Cost per unit (₱) <span className="text-accent">*</span>
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
                      aria-required="true"
                      aria-invalid={errorField === "unitCost"}
                      aria-describedby={describedBy(
                        "unit-cost-hint",
                        errorField === "unitCost" && "form-error"
                      )}
                      placeholder="0.00"
                      className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p id="unit-cost-hint" className="text-[11px] text-text-secondary">
                      Required when opening quantity is above 0
                    </p>
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
          </fieldset>

          <fieldset className="space-y-3 border-0 p-0 m-0 sm:col-span-2">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              Storage & vendor
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="location-input"
                  className="block text-xs font-semibold text-text"
                >
                  Storage location
                </label>
                <input
                  id="location-input"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSubmitting}
                  aria-describedby="location-hint"
                  placeholder="e.g. Supply Room — Shelf A1"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p id="location-hint" className="text-[11px] text-text-secondary">
                  Where staff should look first
                </p>
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
                <SearchableSelect
                  id="supplier-select"
                  value={supplierId}
                  onValueChange={setSupplierId}
                  options={supplierOptions}
                  disabled={isSubmitting || suppliersLoading}
                  aria-required={needsOpeningLot || undefined}
                  aria-invalid={errorField === "supplier"}
                  aria-describedby={describedBy(
                    hasLegacySupplier && "supplier-legacy-hint",
                    suppliers.length === 0 && !suppliersLoading && "supplier-empty-hint",
                    suppliers.length > 0 && !needsOpeningLot && "supplier-hint",
                    errorField === "supplier" && "form-error"
                  )}
                  placeholder={
                    suppliersLoading
                      ? "Loading…"
                      : needsOpeningLot
                        ? "Select a supplier…"
                        : "Type to find a supplier…"
                  }
                  clearLabel={
                    needsOpeningLot
                      ? "Select a supplier…"
                      : "None / unspecified"
                  }
                  emptyMessage="No active suppliers"
                />
                {hasLegacySupplier && (
                  <p id="supplier-legacy-hint" className="text-[11px] text-text-secondary">
                    Previous free-text value: “{initialItem?.supplier}”. Pick a
                    registry supplier to replace it, or leave none.
                  </p>
                )}
                {suppliers.length === 0 && !suppliersLoading && (
                  <p id="supplier-empty-hint" className="text-[11px] text-text-secondary">
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
                  <p id="supplier-hint" className="text-[11px] text-text-secondary">
                    Preferred vendor for this item. Each restock can still use a
                    different supplier with its own unit cost (purchase lot).
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
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
                  placeholder="Optional notes for staff (brand, specs, handling)"
                  className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </fieldset>
          </div>

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
  defaultClassification,
  onClose,
  onSave,
}: AddEditConsumableDialogProps) {
  if (!isOpen) return null;
  return (
    <AddEditConsumableDialogForm
      key={initialItem?.id ?? `new-${defaultClassification ?? "default"}`}
      initialItem={initialItem}
      defaultClassification={defaultClassification}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
