"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  Check,
  FilePlus2,
  HardHat,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useSuppliersQuery } from "@/features/suppliers/client";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useConsumablesQuery } from "@/features/consumables/client";
import { useAssetsQuery } from "@/features/assets/client";
import {
  useAddPurchaseOrderLinesMutation,
  type CreatePurchaseOrderItemPayload,
} from "@/features/purchase-lots/client";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";
import {
  filterMoneyInput,
  filterUnsignedIntInput,
  parseMoney,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { formatPhp } from "@/components/projects/format-money";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  CONSUMABLE_CLASSIFICATION_LABELS,
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  type ConsumableClassification,
} from "@/lib/consumable-classification";
import {
  buildPoPurposePrefix,
  poJustificationPurposes,
  stampPoPurpose,
  stripPoPurposePrefix,
} from "@/lib/po-purpose";
import type { PurchaseLot } from "@/types/purchase-lots";

type POType = "consumable" | "asset";

interface LineDraft {
  id: string;
  isNew: boolean;
  consumableId?: string;
  assetId?: string;
  name: string;
  category: string;
  classification: ConsumableClassification;
  unit: string;
  minThreshold: number;
  location: string;
  assignmentType: "borrowable" | "assignable";
  quantity: string;
  unitCost: string;
  suggestedDealer: string;
  supplierId?: string;
}

interface AddPoLinesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lot: PurchaseLot;
  existingLots: PurchaseLot[];
}

let addLineRowIdSeq = 0;

function createRowId(): string {
  addLineRowIdSeq += 1;
  return `add-row-${addLineRowIdSeq}`;
}

function emptyRow(
  poType: POType,
  classification: ConsumableClassification
): LineDraft {
  return {
    id: createRowId(),
    isNew: false,
    name: "",
    category: "",
    classification,
    unit: poType === "asset" ? "unit" : "pcs",
    minThreshold: 5,
    location:
      poType === "asset" ? "Property Custodian Depot" : "Main Property Storage",
    assignmentType: "borrowable",
    quantity: "1",
    unitCost: "",
    suggestedDealer: "",
  };
}

export function AddPoLinesDialog({
  isOpen,
  onClose,
  lot,
  existingLots,
}: AddPoLinesDialogProps) {
  const toast = useToast();
  const addLinesMutation = useAddPurchaseOrderLinesMutation();
  const { data: suppliers = [] } = useSuppliersQuery({
    activeOnly: true,
    enabled: isOpen,
  });
  const { data: allCategories = [] } = useCategoriesQuery({ enabled: isOpen });
  const { data: consumablePage } = useConsumablesQuery({ limit: 100 });
  const consumables = useMemo(
    () => consumablePage?.data ?? [],
    [consumablePage?.data]
  );
  const { data: assetsList = [] } = useAssetsQuery();

  const poType: POType = existingLots.every((li) => li.itemType === "asset")
    ? "asset"
    : "consumable";
  const isProjectPo = Boolean(lot.projectId);
  const classification: ConsumableClassification = isProjectPo
    ? "material"
    : DEFAULT_CONSUMABLE_CLASSIFICATION;

  const [items, setItems] = useState<LineDraft[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** Selected justification (stripped); `__new__` = custom field. */
  const [purposeChoice, setPurposeChoice] = useState<string>("");
  const [newPurposeText, setNewPurposeText] = useState("");

  const existingJustifications = useMemo(() => {
    const raw = poJustificationPurposes(existingLots.map((l) => l.purpose));
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const j of raw) {
      const key = j.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(j);
    }
    return unique;
  }, [existingLots]);

  const purposePrefix = useMemo(() => {
    const deptLabel =
      (lot.departments && lot.departments.length > 0
        ? lot.departments.map((d) => d.name).join(", ")
        : lot.departmentName) || "";
    const built = buildPoPurposePrefix({
      departmentLabel: deptLabel,
      projectLabel: lot.projectId ? lot.projectName : null,
    });
    if (built) return built;
    // Fallback: strip justification from an existing stamped purpose
    const sample = existingLots.find((l) => l.purpose)?.purpose || lot.purpose || "";
    const just = stripPoPurposePrefix(sample);
    if (just && sample.includes(just)) {
      return sample.slice(0, sample.lastIndexOf(just)).trim();
    }
    return "";
  }, [lot, existingLots]);

  useEffect(() => {
    if (!isOpen) return;
    setItems([emptyRow(poType, classification)]);
    setCatalogSearch("");
    setErrorMessage(null);
    const first =
      existingJustifications[0] || stripPoPurposePrefix(lot.purpose) || "";
    setPurposeChoice(first || "__new__");
    setNewPurposeText("");
    // Reset on open only — avoid depending on justification array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gate
  }, [isOpen, poType, classification, lot.purpose]);

  const consumableCategories = useMemo(
    () => allCategories.filter((c) => c.type === "consumable"),
    [allCategories]
  );
  const assetCategories = useMemo(
    () => allCategories.filter((c) => c.type === "asset"),
    [allCategories]
  );
  const defaultConsumableCategory =
    consumableCategories[0]?.name ?? "General Supply";
  const defaultAssetCategory = assetCategories[0]?.name ?? "Equipment";

  const itemCategoryOptions = useMemo(
    () =>
      (poType === "asset" ? assetCategories : consumableCategories).map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [poType, assetCategories, consumableCategories]
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.supplierCode})`,
        keywords: s.supplierCode,
      })),
    [suppliers]
  );

  const existingCatalogIds = useMemo(() => {
    const ids = new Set<string>();
    for (const li of existingLots) {
      if (li.consumableId) ids.add(li.consumableId);
      if (li.assetId) ids.add(li.assetId);
    }
    return ids;
  }, [existingLots]);

  const filteredConsumables = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return consumables.filter((c) => {
      if (isProjectPo) {
        const itemClass =
          (c.classification as ConsumableClassification | undefined) ??
          DEFAULT_CONSUMABLE_CLASSIFICATION;
        if (itemClass !== "material") return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.itemCode.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [consumables, catalogSearch, isProjectPo]);

  const filteredAssets = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return assetsList.filter((a) => {
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [assetsList, catalogSearch]);

  const runningTotal = items.reduce((sum, item) => {
    const qty = parseUnsignedInt(item.quantity, 0);
    const cost = parseMoney(item.unitCost) ?? 0;
    return sum + qty * cost;
  }, 0);

  const updateItem = (id: string, patch: Partial<LineDraft>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addCustomRow = () => {
    const row = emptyRow(poType, classification);
    row.isNew = true;
    row.category =
      poType === "asset" ? defaultAssetCategory : defaultConsumableCategory;
    setItems((prev) => [...prev, row]);
  };

  const addCatalogConsumable = (c: (typeof consumables)[number]) => {
    const alreadyDrafted = items.some((it) => it.consumableId === c.id);
    if (alreadyDrafted) {
      setItems((prev) => prev.filter((it) => it.consumableId !== c.id));
      return;
    }
    const matchedSup = suppliers.find(
      (s) =>
        s.name.toLowerCase() === (c.supplier || "").toLowerCase() ||
        s.id === c.supplier
    );
    const row: LineDraft = {
      ...emptyRow(poType, classification),
      isNew: false,
      consumableId: c.id,
      name: c.name,
      category: c.category,
      classification:
        (c.classification as ConsumableClassification | undefined) ??
        classification,
      unit: c.unit || "pcs",
      minThreshold: c.minThreshold || 5,
      location: c.location || "Main Property Storage",
      suggestedDealer: c.supplier || matchedSup?.name || "",
      supplierId: matchedSup?.id,
    };
    setItems((prev) => {
      const blank =
        prev.length === 1 &&
        !prev[0].name.trim() &&
        !prev[0].consumableId &&
        !prev[0].assetId;
      return blank ? [row] : [...prev, row];
    });
  };

  const addCatalogAsset = (a: (typeof assetsList)[number]) => {
    const alreadyDrafted = items.some((it) => it.assetId === a.id);
    if (alreadyDrafted) {
      setItems((prev) => prev.filter((it) => it.assetId !== a.id));
      return;
    }
    const row: LineDraft = {
      ...emptyRow(poType, classification),
      isNew: false,
      assetId: a.id,
      name: a.name,
      category: a.category,
      unit: "unit",
      location: a.location || "Property Custodian Depot",
      assignmentType: a.assignmentType || "borrowable",
    };
    setItems((prev) => {
      const blank =
        prev.length === 1 &&
        !prev[0].name.trim() &&
        !prev[0].consumableId &&
        !prev[0].assetId;
      return blank ? [row] : [...prev, row];
    });
  };

  const validate = (): boolean => {
    const filled = items.filter(
      (it) => it.name.trim() || it.consumableId || it.assetId
    );
    if (filled.length === 0) {
      setErrorMessage("Add at least one catalog or custom line item.");
      return false;
    }
    for (const [index, item] of filled.entries()) {
      if (!item.name.trim()) {
        setErrorMessage(`Item #${index + 1}: name is required.`);
        return false;
      }
      if (parseUnsignedInt(item.quantity, 0) < 1) {
        setErrorMessage(`Item #${index + 1}: quantity must be at least 1.`);
        return false;
      }
      const cost = parseMoney(item.unitCost);
      if (cost === null || cost < 0) {
        setErrorMessage(`Item #${index + 1}: enter a valid unit cost.`);
        return false;
      }
    }
    const justification =
      purposeChoice === "__new__"
        ? newPurposeText.trim()
        : purposeChoice.trim();
    if (!justification) {
      setErrorMessage("Select or enter a purpose for the new line items.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const filled = items.filter(
      (it) => it.name.trim() || it.consumableId || it.assetId
    );
    const justification =
      purposeChoice === "__new__"
        ? newPurposeText.trim()
        : purposeChoice.trim();
    const stampedPurpose = stampPoPurpose(purposePrefix, justification);

    if (!stampedPurpose) {
      setErrorMessage("Select or enter a purpose for the new line items.");
      return;
    }

    const payloadItems: CreatePurchaseOrderItemPayload[] = filled.map((item) => ({
      itemType: poType,
      consumableId: !item.isNew && poType === "consumable" ? item.consumableId : undefined,
      assetId: !item.isNew && poType === "asset" ? item.assetId : undefined,
      isNewItem: item.isNew,
      name: item.name.trim(),
      category:
        item.category.trim() ||
        (poType === "asset" ? defaultAssetCategory : defaultConsumableCategory),
      classification: poType === "consumable" ? item.classification : undefined,
      unit: item.unit,
      minThreshold: item.minThreshold,
      location: item.location,
      assignmentType: item.assignmentType,
      quantity: parseUnsignedInt(item.quantity, 1),
      unitCost: parseMoney(item.unitCost) ?? 0,
      suggestedDealer: item.suggestedDealer || undefined,
      supplierId: item.supplierId || undefined,
      projectId: lot.projectId || undefined,
      projectName: lot.projectName || undefined,
      purpose: stampedPurpose,
    }));

    try {
      await addLinesMutation.mutateAsync({
        id: lot.id,
        payload: { items: payloadItems },
      });
      toast.success(
        `Added ${payloadItems.length} item${payloadItems.length === 1 ? "" : "s"} to PO ${lot.poNumber || lot.lotCode}.`
      );
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add items to this purchase order.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-po-lines-title"
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="add-po-lines-title" className="text-base font-bold text-text">
                Add items to {lot.poNumber || lot.lotCode}
              </h2>
              <p className="text-[11px] text-text-secondary">
                Only pending purchase orders can be edited. Existing lines stay as they are.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isProjectPo && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-xs">
              <HardHat className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                This is a project PO. New lines must be consumable materials and will credit{" "}
                <strong>{lot.projectName || "the project"}</strong> on delivery.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <label className="text-xs font-semibold text-text block">
              Purpose for new lines
              <span className="text-rose-600"> *</span>
            </label>
            <SearchableSelect
              value={purposeChoice}
              onValueChange={setPurposeChoice}
              options={[
                ...existingJustifications.map((j) => ({
                  value: j,
                  label: j,
                })),
                { value: "__new__", label: "New purpose…" },
              ]}
              placeholder="Select purpose (required)"
              emptyMessage="No purposes yet"
              inputClassName="h-9 px-2.5 text-xs"
            />
            {purposeChoice === "__new__" && (
              <textarea
                value={newPurposeText}
                onChange={(e) => setNewPurposeText(e.target.value)}
                placeholder="Enter the new procurement purpose…"
                rows={2}
                required
                aria-required="true"
                className="w-full p-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none"
              />
            )}
            {existingJustifications.length > 1 && (
              <p className="text-[10px] text-text-secondary">
                This PO already has {existingJustifications.length} purposes —
                pick one or add a new purpose for these lines.
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Already on this PO ({existingLots.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingLots.map((li) => (
                <span
                  key={li.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-subtle border border-border text-[11px] font-medium text-text"
                >
                  {li.itemName}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={
                  poType === "asset"
                    ? "Search assets by name or code…"
                    : "Search consumables by name or SKU…"
                }
                className="w-full h-9 pl-8.5 pr-8 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden"
              />
            </div>

            <div className="rounded-xl bg-bg-subtle/40 border border-border/60 p-1">
              {poType === "consumable" ? (
                filteredConsumables.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1">
                    {filteredConsumables.slice(0, 10).map((c) => {
                      const selected = items.some((it) => it.consumableId === c.id);
                      const alreadyOnPo = existingCatalogIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => addCatalogConsumable(c)}
                          className={cn(
                            "p-2 rounded-lg border text-left cursor-pointer min-h-16 space-y-1",
                            selected
                              ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30"
                              : "border-border bg-bg hover:border-accent/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[8px] text-text-secondary truncate">
                              {c.itemCode}
                            </span>
                            {selected ? (
                              <Check className="h-3 w-3 text-accent shrink-0" />
                            ) : alreadyOnPo ? (
                              <span className="text-[8px] font-bold text-text-secondary">On PO</span>
                            ) : (
                              <Plus className="h-3 w-3 text-accent shrink-0" />
                            )}
                          </div>
                          <span className="font-bold text-[11px] text-text line-clamp-1">
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-text-secondary">
                    No matching catalog items.
                  </p>
                )
              ) : filteredAssets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1">
                  {filteredAssets.slice(0, 10).map((a) => {
                    const selected = items.some((it) => it.assetId === a.id);
                    const alreadyOnPo = existingCatalogIds.has(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => addCatalogAsset(a)}
                        className={cn(
                          "p-2 rounded-lg border text-left cursor-pointer min-h-16 space-y-1",
                          selected
                            ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30"
                            : "border-border bg-bg hover:border-accent/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[8px] text-text-secondary truncate">
                            {a.assetCode}
                          </span>
                          {selected ? (
                            <Check className="h-3 w-3 text-accent shrink-0" />
                          ) : alreadyOnPo ? (
                            <span className="text-[8px] font-bold text-text-secondary">On PO</span>
                          ) : (
                            <Plus className="h-3 w-3 text-accent shrink-0" />
                          )}
                        </div>
                        <span className="font-bold text-[11px] text-text line-clamp-1">
                          {a.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-text-secondary">
                  No matching catalog items.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addCustomRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                + Custom / New Item
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-accent" />
                New line items ({items.filter((i) => i.name || i.consumableId || i.assetId).length})
              </span>
              <span className="font-mono text-xs font-bold text-status-active-text">
                {formatPhp(runningTotal)}
              </span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-border bg-card space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="h-5 w-5 rounded-full bg-accent/15 text-accent font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.length > 1
                          ? prev.filter((it) => it.id !== item.id)
                          : [emptyRow(poType, classification)]
                      )
                    }
                    className="p-1 rounded-md text-text-secondary hover:text-rose-600 cursor-pointer"
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text">Item name</label>
                    {item.isNew ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder={
                          poType === "asset"
                            ? "e.g. Epson projector"
                            : "e.g. A4 bond paper"
                        }
                        className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium"
                      />
                    ) : (
                      <div className="w-full h-8.5 px-3 rounded-lg border border-border bg-bg flex items-center text-xs font-bold text-text truncate">
                        {item.name || "Select from catalog above"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-text-secondary" />
                      Supplier
                    </label>
                    <SearchableSelect
                      value={item.supplierId || item.suggestedDealer || ""}
                      onValueChange={(val) => {
                        const matched = suppliers.find(
                          (s) => s.id === val || s.name === val
                        );
                        updateItem(item.id, {
                          supplierId: matched?.id || "",
                          suggestedDealer: matched?.name || val,
                        });
                      }}
                      options={supplierOptions}
                      clearLabel="-- Direct / Default Supplier --"
                      placeholder="-- Direct / Default Supplier --"
                      emptyMessage="No suppliers available"
                      inputClassName="h-8.5 px-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text">Quantity</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = filterUnsignedIntInput(e.target.value);
                        if (next !== null) updateItem(item.id, { quantity: next });
                      }}
                      className="w-full h-8.5 px-2 text-center font-mono font-bold rounded-lg border border-border bg-bg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text">Unit cost (₱)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.unitCost}
                      onChange={(e) => {
                        const next = filterMoneyInput(e.target.value);
                        if (next !== null) updateItem(item.id, { unitCost: next });
                      }}
                      className="w-full h-8.5 px-2 text-right font-mono font-bold rounded-lg border border-border bg-bg text-xs"
                    />
                  </div>
                  {item.isNew && (
                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-semibold text-text">Category</label>
                      <SearchableSelect
                        value={item.category}
                        onValueChange={(val) => updateItem(item.id, { category: val })}
                        options={itemCategoryOptions}
                        placeholder="Select category…"
                        emptyMessage="No categories available"
                        inputClassName="h-8.5 px-2"
                      />
                    </div>
                  )}
                  {poType === "consumable" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text">Class</label>
                      <div className="h-8.5 px-2 rounded-lg border border-border bg-bg-subtle/60 text-xs font-semibold flex items-center">
                        {CONSUMABLE_CLASSIFICATION_LABELS[item.classification]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-bg-subtle/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-bg text-text cursor-pointer"
          >
            Keep PO unchanged
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={addLinesMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            {addLinesMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add items to PO
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
