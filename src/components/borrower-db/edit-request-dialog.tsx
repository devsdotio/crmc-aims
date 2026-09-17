"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoriesQuery, useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import { useUpdateBorrowRequestMutation } from "@/features/borrow-requests/client/use-borrow-requests";
import { useUpdateConsumableRequestMutation } from "@/features/consumable-requests/client";
import { useToast } from "@/components/providers/toast-context";
import type { PortalBorrowRequest } from "./types";
import type { BorrowRequest } from "@/types/borrow-requests";

interface EditRequestDialogProps {
  request: PortalBorrowRequest | BorrowRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type EditStep = "items" | "audit";

const STEPS: { key: EditStep; label: string; stepNumber: number }[] = [
  { key: "items", label: "Items & Quantities", stepNumber: 1 },
  { key: "audit", label: "Audit Reason", stepNumber: 2 },
];

export function EditRequestDialog({
  request,
  open,
  onOpenChange,
  onSuccess,
}: EditRequestDialogProps) {
  const [currentStep, setCurrentStep] = useState<EditStep>("items");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editReason, setEditReason] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assetItems, setAssetItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supplyLines, setSupplyLines] = useState<any[]>([]);

  const { data: consumableData } = useConsumablesQuery({ limit: 100 });
  const [isSaving, setIsSaving] = useState(false);

  const { getCategoryStyle } = useCategoryStyleMap();
  const { data: dbCategories = [] } = useCategoriesQuery();
  const assetCategories = useMemo(
    () => dbCategories.filter((c) => c.type === "asset" || !c.type),
    [dbCategories]
  );

  const updateBorrowMutation = useUpdateBorrowRequestMutation();
  const updateSupplyMutation = useUpdateConsumableRequestMutation();
  const toast = useToast();

  const consumablesCatalog = useMemo(() => consumableData?.data ?? [], [consumableData]);

  const isSupply = useMemo(() => {
    if (!request) return false;
    return request.items?.every((i) => i.itemType === "consumable");
  }, [request]);

  // Sync state on open
  useEffect(() => {
    if (!open || !request) return;

    setCurrentStep("items");
    setErrorMsg(null);
    setEditReason("");

    if (request.items?.every((i) => i.itemType === "consumable")) {
      setSupplyLines(
        request.items.map((it, idx) => ({
          id: `line-${idx}`,
          consumableId: it.consumableId || "",
          itemName: it.itemDescription,
          category: it.category || "office",
          quantity: it.quantity || 1,
          purpose: it.purpose || request.purpose || "General",
          notes: "",
        }))
      );
    } else {
      setAssetItems(
        (request.items || []).map((it, idx) => ({
          id: `item-${idx}`,
          itemDescription: it.itemDescription,
          assetId: it.assetId,
          assetCode: it.assetCode,
          category: it.category || "computing",
          quantity: it.quantity || 1,
          itemType: "asset",
          purpose: it.purpose || request.purpose || "General",
        }))
      );
    }
  }, [open, request]);

  if (!open || !request) return null;

  const isSubmitting = updateBorrowMutation.isPending || updateSupplyMutation.isPending;

  const validateStep = (step: EditStep): boolean => {
    setErrorMsg(null);

    if (step === "items") {
      if (isSupply) {
        if (supplyLines.length === 0) {
          setErrorMsg("At least one supply product line is required.");
          return false;
        }
        for (const line of supplyLines) {
          if (!line.consumableId) {
            setErrorMsg("Please select a valid product for each line.");
            return false;
          }
          if (line.quantity < 1) {
            setErrorMsg("Quantity must be at least 1 for each line.");
            return false;
          }
        }
      } else {
        if (assetItems.length === 0) {
          setErrorMsg("At least one asset item is required.");
          return false;
        }
        for (const it of assetItems) {
          if (!it.itemDescription.trim()) {
            setErrorMsg("Item description cannot be empty.");
            return false;
          }
        }
      }
    }

    if (step === "audit") {
      if (!editReason.trim() || editReason.trim().length < 5) {
        setErrorMsg("Please provide a meaningful reason for editing (min 5 characters) for the audit trail.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === "items") setCurrentStep("audit");
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep === "audit") setCurrentStep("items");
  };

  const handleSubmit = async () => {
    if (!validateStep("audit")) return;

    try {
      if (isSupply) {
        await updateSupplyMutation.mutateAsync({
          id: request.id,
          payload: {
            requesterName: request.requesterName,
            requesterEmail: request.requesterEmail,
            requesterPhone: request.requesterPhone,
            departmentId: ("departmentId" in request ? request.departmentId : null) ?? null,
            purpose: request.purpose,
            notes: request.notes?.trim() || null,
            lines: supplyLines.map((l) => ({
              consumableId: l.consumableId,
              quantity: Number(l.quantity),
              purpose: (l.purpose || request.purpose || "General").trim(),
              notes: l.notes?.trim() || undefined,
            })),
            editReason: editReason.trim(),
          },
        });
        toast.success(`Consumable requisition ${request.requestCode} updated successfully.`);
      } else {
        await updateBorrowMutation.mutateAsync({
          id: request.id,
          payload: {
            requesterName: request.requesterName,
            requesterEmail: request.requesterEmail,
            requesterPhone: request.requesterPhone,
            departmentId: ("departmentId" in request ? request.departmentId : undefined) ?? undefined,
            requestType: ("requestType" in request ? request.requestType : undefined) ?? undefined,
            purpose: request.purpose,
            expectedReturnDate: request.expectedReturnDate ?? null,
            notes: request.notes?.trim() || null,
            items: assetItems.map((it) => ({
              itemDescription: it.itemDescription.trim(),
              assetId: it.assetId || undefined,
              assetCode: it.assetCode || undefined,
              category: it.category,
              quantity: Number(it.quantity || 1),
              itemType: "asset" as const,
              purpose: (it.purpose || request.purpose || "General").trim(),
            })),
            editReason: editReason.trim(),
          },
        });
        toast.success(`Borrow request ${request.requestCode} updated successfully.`);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update request.");
    }
  };

  const handleAddSupplyLine = () => {
    const firstConsumable = consumablesCatalog[0];
    setSupplyLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        consumableId: firstConsumable?.id || "",
        itemName: firstConsumable?.name || "Select item",
        category: firstConsumable?.category || "office",
        quantity: 1,
        notes: "",
        purpose: request.purpose || "General",
      },
    ]);
  };

  const handleRemoveSupplyLine = (index: number) => {
    setSupplyLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAssetItem = () => {
    setAssetItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        itemDescription: "",
        category: "computing",
        quantity: 1,
        itemType: "asset",
        purpose: request.purpose || "General",
      },
    ]);
  };

  const handleRemoveAssetItem = (index: number) => {
    setAssetItems((prev) => prev.filter((_, i) => i !== index));
  };

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
    >
      {/* Fixed-size container — 680px wide × 600px tall */}
      <div className="relative w-170 h-150 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border bg-bg-subtle/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="edit-dialog-title" className="text-sm font-bold text-text">
                  Edit Request
                </h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                  {request.requestCode}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-text-secondary">
                  {isSupply ? "Supplies Requisition" : "Asset Borrow"}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Modify requested items and quantities. Requester and schedule details are preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step Progress Bar ──────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-border bg-bg shrink-0">
          <nav aria-label="Edit Progress">
            <ol className="flex items-center w-full">
              {STEPS.map((step, idx) => {
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isLast = idx === STEPS.length - 1;

                return (
                  <li key={step.key} className={cn("flex items-center", isLast ? "flex-none" : "flex-1")}>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                          isDone
                            ? "bg-accent text-accent-foreground"
                            : isActive
                            ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                            : "bg-bg-subtle border border-border text-text-secondary"
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.stepNumber}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isActive ? "text-text" : "text-text-secondary"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-3 rounded transition-colors duration-300",
                          isDone ? "bg-accent" : "bg-border"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* ── Error Alert ────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center gap-2.5 text-xs text-destructive shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* ── Scrollable Body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Items & Quantities ──────────────────────────── */}
            {currentStep === "items" && (
              <motion.div
                key="step-items"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-3 h-full"
              >
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      {isSupply ? "Consumable Supply Lines" : "Requested Asset Items"}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary bg-bg-subtle border border-border rounded-full px-2 py-0.5">
                      {isSupply ? supplyLines.length : assetItems.length} line{(isSupply ? supplyLines.length : assetItems.length) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={isSupply ? handleAddSupplyLine : handleAddAssetItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line
                  </button>
                </div>

                {/* ── Supply Lines ── */}
                {isSupply ? (
                  <div className="space-y-2">
                    {supplyLines.map((line, idx) => {
                      const selected = consumablesCatalog.find((c) => c.id === line.consumableId);
                      return (
                        <div
                          key={line.id || idx}
                          className="flex items-center gap-2 p-3 rounded-xl border border-border bg-bg shadow-xs"
                        >
                          {/* Index chip */}
                          <div className="w-6 h-6 shrink-0 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
                            {idx + 1}
                          </div>

                          {/* Product selector */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={line.consumableId}
                              onChange={(e) => {
                                const newId = e.target.value;
                                const item = consumablesCatalog.find((c) => c.id === newId);
                                setSupplyLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx
                                      ? {
                                          ...l,
                                          consumableId: newId,
                                          itemName: item?.name || "",
                                          category: item?.category || "office",
                                        }
                                      : l
                                  )
                                );
                              }}
                              className="w-full h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                            >
                              <option value="">Select supply item...</option>
                              {consumablesCatalog.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.itemCode}) — Available: {c.availableQty ?? c.currentQty ?? 0} {c.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={9999}
                              value={line.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setSupplyLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, quantity: Math.max(1, val) } : l))
                                );
                              }}
                              className="w-full h-8 px-2 text-xs font-mono font-bold bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent text-center"
                            />
                          </div>

                          {/* Stock badge */}
                          {selected && (
                            <div
                              className={cn(
                                "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                (selected.availableQty ?? selected.currentQty ?? 0) >= line.quantity
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                  : "bg-destructive/10 text-destructive border-destructive/25"
                              )}
                            >
                              {(selected.availableQty ?? selected.currentQty ?? 0) >= line.quantity
                                ? "✓ In stock"
                                : "⚠ Low"}
                            </div>
                          )}

                          {/* Remove */}
                          {supplyLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSupplyLine(idx)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {supplyLines.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-border text-xs text-text-secondary gap-1.5">
                        <Package className="h-5 w-5 text-text-secondary/50" />
                        No supply lines. Click &ldquo;Add Line&rdquo; to begin.
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Asset Items ── */
                  <div className="space-y-2">
                    {assetItems.map((item, idx) => {
                      const catMeta = getCategoryStyle(item.category);
                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center gap-2 p-3 rounded-xl border border-border bg-bg shadow-xs"
                        >
                          {/* Index chip */}
                          <div className="w-6 h-6 shrink-0 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
                            {idx + 1}
                          </div>

                          {/* Category */}
                          <div className="w-36 shrink-0">
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const cat = e.target.value;
                                setAssetItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, category: cat } : it))
                                );
                              }}
                              className="w-full h-8 px-2 text-xs bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent capitalize cursor-pointer"
                            >
                              {assetCategories.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Category color dot */}
                          <div
                            className={cn("w-2 h-2 rounded-full shrink-0", catMeta.bg)}
                          />

                          {/* Description */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.itemDescription}
                              onChange={(e) => {
                                const desc = e.target.value;
                                setAssetItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, itemDescription: desc } : it))
                                );
                              }}
                              placeholder="e.g. Dell Latitude 5420 Laptop"
                              className="w-full h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>

                          {/* Qty */}
                          <div className="w-16 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setAssetItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, val) } : it))
                                );
                              }}
                              className="w-full h-8 px-2 text-xs font-mono font-bold bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent text-center"
                            />
                          </div>

                          {/* Remove */}
                          {assetItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAssetItem(idx)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {assetItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-border text-xs text-text-secondary gap-1.5">
                        <Package className="h-5 w-5 text-text-secondary/50" />
                        No asset items. Click &ldquo;Add Line&rdquo; to begin.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Audit Accountability ──────────────────────── */}
            {currentStep === "audit" && (
              <motion.div
                key="step-audit"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* ── Meta stat chips ─────────────────────────────── */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Requester chip */}
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl border border-border bg-bg-subtle">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Requester</span>
                    <span className="text-xs font-semibold text-text truncate">{request.requesterName}</span>
                    <span className="text-[10px] text-text-secondary truncate">{request.department || "—"}</span>
                  </div>

                  {/* Type chip */}
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl border border-border bg-bg-subtle">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Type</span>
                    <span className="text-xs font-semibold text-text capitalize">
                      {isSupply ? "Supplies" : ("requestType" in request ? request.requestType : null) ?? "Borrow"}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {isSupply ? "Consumable Requisition" : "Asset Request"}
                    </span>
                  </div>

                  {/* Total units chip — highlighted amber */}
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/8">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Modified Items</span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                      {isSupply ? supplyLines.length : assetItems.length}
                      <span className="text-xs font-semibold ml-1">
                        line{(isSupply ? supplyLines.length : assetItems.length) !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 tabular-nums">
                      {isSupply
                        ? `${supplyLines.reduce((acc: number, l: { quantity: number }) => acc + (l.quantity || 0), 0)} total units`
                        : `${assetItems.reduce((acc: number, it: { quantity: number }) => acc + (it.quantity || 0), 0)} total units`}
                    </span>
                  </div>
                </div>

                {/* ── Line items diff table ────────────────────────── */}
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Table header */}
                  <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      {isSupply ? "Supply Lines to Submit" : "Asset Lines to Submit"}
                    </span>
                    <div className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {isSupply ? supplyLines.length : assetItems.length} line{(isSupply ? supplyLines.length : assetItems.length) !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border">
                    {isSupply
                      ? supplyLines.map((line: { consumableId: string; quantity: number; itemName?: string }, idx: number) => {
                          const found = consumablesCatalog.find((c) => c.id === line.consumableId);
                          const inStock = (found?.availableQty ?? found?.currentQty ?? 0) >= line.quantity;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 px-3 py-2.5 bg-bg hover:bg-bg-subtle/60 transition-colors"
                            >
                              <span className="w-5 h-5 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text truncate">
                                  {found?.name ?? line.itemName ?? "—"}
                                </p>
                                {found && (
                                  <p className="text-[10px] text-text-secondary">{found.itemCode} · {found.unit}</p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="text-sm font-bold text-text tabular-nums">{line.quantity}</span>
                                <span className="text-[10px] text-text-secondary ml-1">{found?.unit ?? "pcs"}</span>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  inStock
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                )}
                              >
                                {inStock ? "✓ OK" : "⚠ Low"}
                              </span>
                            </div>
                          );
                        })
                      : assetItems.map((item: { itemDescription: string; category: string; quantity: number }, idx: number) => {
                          const catMeta = getCategoryStyle(item.category);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 px-3 py-2.5 bg-bg hover:bg-bg-subtle/60 transition-colors"
                            >
                              <span className="w-5 h-5 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                {idx + 1}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                  catMeta.bg,
                                  catMeta.text
                                )}
                              >
                                {item.category}
                              </span>
                              <p className="flex-1 text-xs font-semibold text-text truncate">
                                {item.itemDescription || <span className="text-text-secondary italic">No description</span>}
                              </p>
                              <div className="shrink-0 text-right">
                                <span className="text-sm font-bold text-text tabular-nums">{item.quantity}</span>
                                <span className="text-[10px] text-text-secondary ml-1">unit{item.quantity !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </div>

                {/* ── Audit reason field ───────────────────────────── */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Modification Reason
                      </span>
                      <span className="text-destructive text-xs font-bold">*</span>
                    </div>
                    {/* Live char counter */}
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors",
                      editReason.trim().length >= 5
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                        : "bg-bg border-border text-text-secondary"
                    )}>
                      {editReason.trim().length >= 5 && <CheckCircle2 className="h-3 w-3" />}
                      <span>{editReason.trim().length} chars{editReason.trim().length < 5 ? ` · ${5 - editReason.trim().length} more` : " · Ready"}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-bg">
                    <textarea
                      rows={4}
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="e.g. Adjusted item quantity per verbal custodian agreement with department head on 08/22/2026. Confirmed by Property Custodian."
                      className="w-full text-xs bg-transparent text-text placeholder:text-text-secondary/50 focus:outline-none leading-relaxed resize-none"
                    />
                    <p className="text-[10px] text-text-secondary mt-1 pt-1 border-t border-border/50">
                      Logged permanently in the accountability timeline with your staff name and timestamp.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer Navigation ──────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-t border-border bg-bg-subtle shrink-0 flex items-center justify-between">
          <div>
            {currentStep !== "items" && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border text-text hover:bg-bg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-border text-text-secondary hover:text-text hover:bg-bg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {currentStep !== "audit" ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
