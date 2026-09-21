"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRequestModalDismiss } from "@/hooks/use-request-modal-dismiss";
import type { PortalBorrowRequest } from "./types";
import type { BorrowRequest } from "@/types/borrow-requests";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface EditRequestDialogProps {
  request: PortalBorrowRequest | BorrowRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type EditStep = "items" | "audit";

const STEPS: { key: EditStep; label: string; stepNumber: number }[] = [
  { key: "items", label: "Details & Items", stepNumber: 1 },
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
  const [requestedByName, setRequestedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assetItems, setAssetItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supplyLines, setSupplyLines] = useState<any[]>([]);

  const { data: consumableData } = useConsumablesQuery({ limit: 100 });

  const { getCategoryStyle } = useCategoryStyleMap();
  const { data: dbCategories = [] } = useCategoriesQuery();
  const assetCategories = useMemo(
    () => dbCategories.filter((c) => c.type === "asset" || !c.type),
    [dbCategories]
  );

  const updateBorrowMutation = useUpdateBorrowRequestMutation();
  const updateSupplyMutation = useUpdateConsumableRequestMutation();
  const toast = useToast();
  const baselineRef = useRef<string>("");

  const consumablesCatalog = useMemo(() => consumableData?.data ?? [], [consumableData]);

  const supplyOptions = useMemo(
    () =>
      consumablesCatalog.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.itemCode}) — Available: ${c.availableQty ?? c.currentQty ?? 0} ${c.unit}`,
        keywords: `${c.itemCode} ${c.name}`,
      })),
    [consumablesCatalog]
  );

  const assetCategoryOptions = useMemo(
    () => assetCategories.map((c) => ({ value: c.name, label: c.name })),
    [assetCategories]
  );

  const isSupply = useMemo(() => {
    if (!request) return false;
    return request.items?.every((i) => i.itemType === "consumable");
  }, [request]);

  const isSubmitting =
    updateBorrowMutation.isPending || updateSupplyMutation.isPending;

  // Sync state on open
  useEffect(() => {
    if (!open || !request) return;

    setCurrentStep("items");
    setErrorMsg(null);
    setEditReason("");
    const initialRequestedBy =
      ("requestedByName" in request && request.requestedByName?.trim()) ||
      request.requesterName ||
      "";
    const initialNotes = request.notes?.trim() || "";
    const initialPurpose = request.purpose?.trim() || "";
    const initialReturn =
      ("expectedReturnDate" in request && request.expectedReturnDate
        ? String(request.expectedReturnDate).slice(0, 10)
        : "") ||
      ("requestedDateTo" in request && request.requestedDateTo
        ? String(request.requestedDateTo).slice(0, 10)
        : "");
    setRequestedByName(initialRequestedBy);
    setNotes(initialNotes);
    setPurpose(initialPurpose);
    setExpectedReturnDate(initialReturn);

    if (request.items?.every((i) => i.itemType === "consumable")) {
      const lines = request.items.map((it, idx) => ({
        id: `line-${idx}`,
        consumableId: it.consumableId || "",
        itemName: it.itemDescription,
        category: it.category || "office",
        quantity: it.quantity || 1,
        purpose: it.purpose || request.purpose || "General",
        notes: "",
      }));
      setSupplyLines(lines);
      setAssetItems([]);
      baselineRef.current = JSON.stringify({
        kind: "supply",
        lines,
        reason: "",
        requestedByName: initialRequestedBy,
        notes: initialNotes,
        purpose: initialPurpose,
        expectedReturnDate: "",
      });
    } else {
      const items = (request.items || []).map((it, idx) => ({
        id: `item-${idx}`,
        itemDescription: it.itemDescription,
        assetId: it.assetId,
        assetCode: it.assetCode,
        category: it.category || "computing",
        quantity: it.quantity || 1,
        itemType: "asset",
        purpose: it.purpose || request.purpose || "General",
      }));
      setAssetItems(items);
      setSupplyLines([]);
      baselineRef.current = JSON.stringify({
        kind: "asset",
        items,
        reason: "",
        requestedByName: initialRequestedBy,
        notes: initialNotes,
        purpose: initialPurpose,
        expectedReturnDate: initialReturn,
      });
    }
  }, [open, request]);

  const isDirty = useMemo(() => {
    if (!open || !request) return false;
    const current = isSupply
      ? JSON.stringify({
          kind: "supply",
          lines: supplyLines,
          reason: editReason,
          requestedByName,
          notes,
          purpose,
          expectedReturnDate: "",
        })
      : JSON.stringify({
          kind: "asset",
          items: assetItems,
          reason: editReason,
          requestedByName,
          notes,
          purpose,
          expectedReturnDate,
        });
    return current !== baselineRef.current;
  }, [
    open,
    request,
    isSupply,
    supplyLines,
    assetItems,
    editReason,
    requestedByName,
    notes,
    purpose,
    expectedReturnDate,
  ]);

  const handleRequestClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const {
    requestClose,
    onBackdropClick,
    discardConfirmOpen,
    confirmDiscard,
    keepEditing,
  } = useRequestModalDismiss({
    open,
    isPending: isSubmitting,
    isDirty,
    onRequestClose: handleRequestClose,
  });

  if (!open || !request) return null;

  const requestType =
    !isSupply && "requestType" in request ? request.requestType : undefined;
  const isBorrowable = !isSupply && requestType !== "assignable";

  const validateStep = (step: EditStep): boolean => {
    setErrorMsg(null);

    if (step === "items") {
      if (!requestedByName.trim()) {
        setErrorMsg("Requested by is required.");
        return false;
      }
      if (!purpose.trim()) {
        setErrorMsg("Purpose is required.");
        return false;
      }
      if (isBorrowable && !expectedReturnDate) {
        setErrorMsg("Expected return date is required for borrow requests.");
        return false;
      }
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
          if (!(line.purpose || "").trim()) {
            setErrorMsg("Each supply line needs a purpose.");
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
          if (!(it.purpose || "").trim()) {
            setErrorMsg("Each asset line needs a purpose.");
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
            purpose: purpose.trim(),
            notes: notes.trim() || null,
            requestedByName: requestedByName.trim(),
            lines: supplyLines.map((l) => ({
              consumableId: l.consumableId,
              quantity: Number(l.quantity),
              purpose: (l.purpose || purpose || "General").trim(),
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
            requestType: requestType ?? undefined,
            purpose: purpose.trim(),
            expectedReturnDate: isBorrowable
              ? expectedReturnDate || null
              : null,
            notes: notes.trim() || null,
            requestedByName: requestedByName.trim(),
            items: assetItems.map((it) => ({
              itemDescription: it.itemDescription.trim(),
              assetId: it.assetId || undefined,
              assetCode: it.assetCode || undefined,
              category: it.category,
              quantity: Number(it.quantity || 1),
              itemType: "asset" as const,
              purpose: (it.purpose || purpose || "General").trim(),
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
        purpose: purpose.trim() || "General",
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
        purpose: purpose.trim() || "General",
      },
    ]);
  };

  const handleRemoveAssetItem = (index: number) => {
    setAssetItems((prev) => prev.filter((_, i) => i !== index));
  };

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
      aria-describedby="edit-dialog-desc"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onBackdropClick}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border bg-bg-subtle/50 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
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
              <p id="edit-dialog-desc" className="text-[11px] text-text-secondary mt-0.5">
                Update request details, who it is for, items, and quantities.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer shrink-0 disabled:opacity-50"
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
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
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
                <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Request details
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        Requested by <span className="text-destructive">*</span>
                      </span>
                      <input
                        id="edit-requested-by"
                        type="text"
                        value={requestedByName}
                        onChange={(e) => setRequestedByName(e.target.value)}
                        placeholder="Name of the person this request is for…"
                        disabled={isSubmitting}
                        className="w-full h-8 px-2.5 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        Purpose <span className="text-destructive">*</span>
                      </span>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Reason, project, or clinical task…"
                        disabled={isSubmitting}
                        className="w-full h-8 px-2.5 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                      />
                    </label>
                    {isBorrowable && (
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                          Expected return <span className="text-destructive">*</span>
                        </span>
                        <input
                          type="date"
                          value={expectedReturnDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setExpectedReturnDate(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full h-8 px-2 text-xs bg-bg border border-border rounded-md text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                        />
                      </label>
                    )}
                    <label className={cn("space-y-1", isBorrowable ? "" : "sm:col-span-2")}>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        Notes <span className="font-normal normal-case">(optional)</span>
                      </span>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Delivery or condition notes…"
                        disabled={isSubmitting}
                        className="w-full h-8 px-2.5 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                      />
                    </label>
                  </div>
                </div>

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
                          className="rounded-lg border border-border bg-bg p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                              Line {idx + 1}
                            </span>
                            {supplyLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSupplyLine(idx)}
                                aria-label={`Remove line ${idx + 1}`}
                                className="p-1 rounded-md text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <label className="block space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                              Item
                            </span>
                            <SearchableSelect
                              value={line.consumableId}
                              onValueChange={(newId) => {
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
                              options={supplyOptions}
                              placeholder="Select supply…"
                              clearLabel="Select supply…"
                              emptyMessage="No supplies available"
                              inputClassName="h-8 text-xs bg-bg"
                            />
                          </label>

                          <div className="flex items-end gap-2">
                            <label className="w-20 shrink-0 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                Qty
                              </span>
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
                                className="w-full h-8 px-2 text-xs font-mono tabular-nums bg-bg border border-border rounded-md text-text text-center focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                              />
                            </label>
                            {selected && (
                              <span
                                className={cn(
                                  "mb-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                  (selected.availableQty ?? selected.currentQty ?? 0) >= line.quantity
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-destructive/10 text-destructive border-destructive/25"
                                )}
                              >
                                {(selected.availableQty ?? selected.currentQty ?? 0) >= line.quantity
                                  ? "In stock"
                                  : "Low stock"}
                              </span>
                            )}
                          </div>

                          <label className="block space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                              Line purpose <span className="text-destructive">*</span>
                            </span>
                            <input
                              type="text"
                              value={line.purpose || ""}
                              onChange={(e) => {
                                const next = e.target.value;
                                setSupplyLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, purpose: next } : l))
                                );
                              }}
                              placeholder="What this line is for…"
                              disabled={isSubmitting}
                              className="w-full h-8 px-2.5 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                            />
                          </label>
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
                          className="rounded-lg border border-border bg-bg p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                              <span className={cn("w-1.5 h-1.5 rounded-full", catMeta.bg)} />
                              Line {idx + 1}
                            </span>
                            {assetItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAssetItem(idx)}
                                aria-label={`Remove line ${idx + 1}`}
                                className="p-1 rounded-md text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-2">
                            <label className="space-y-1 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                Category
                              </span>
                              <SearchableSelect
                                value={item.category}
                                onValueChange={(cat) => {
                                  setAssetItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, category: cat } : it))
                                  );
                                }}
                                options={assetCategoryOptions}
                                placeholder="Category"
                                emptyMessage="No categories available"
                                inputClassName="h-8 text-xs bg-bg capitalize"
                              />
                            </label>
                            <label className="space-y-1 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                Description
                              </span>
                              <input
                                type="text"
                                value={item.itemDescription}
                                onChange={(e) => {
                                  const desc = e.target.value;
                                  setAssetItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, itemDescription: desc } : it))
                                  );
                                }}
                                placeholder="e.g. Dell Latitude 5420"
                                className="w-full h-8 px-2 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-[5rem_1fr] gap-2">
                            <label className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                Qty
                              </span>
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
                                className="w-full h-8 px-2 text-xs font-mono tabular-nums bg-bg border border-border rounded-md text-text text-center focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                              />
                            </label>
                            <label className="space-y-1 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                Line purpose <span className="text-destructive">*</span>
                              </span>
                              <input
                                type="text"
                                value={item.purpose || ""}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setAssetItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, purpose: next } : it))
                                  );
                                }}
                                placeholder="What this line is for…"
                                disabled={isSubmitting}
                                className="w-full h-8 px-2.5 text-xs bg-bg border border-border rounded-md text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                              />
                            </label>
                          </div>
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
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Requested by</span>
                    <span className="text-xs font-semibold text-text truncate">{requestedByName.trim() || "—"}</span>
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

                <div className="rounded-xl border border-border bg-bg-subtle/40 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Details to submit
                  </p>
                  <p className="text-xs text-text">
                    <span className="text-text-secondary">Purpose:</span>{" "}
                    <span className="font-semibold">{purpose.trim() || "—"}</span>
                  </p>
                  {isBorrowable && (
                    <p className="text-xs text-text">
                      <span className="text-text-secondary">Expected return:</span>{" "}
                      <span className="font-semibold tabular-nums">{expectedReturnDate || "—"}</span>
                    </p>
                  )}
                  {notes.trim() && (
                    <p className="text-xs text-text">
                      <span className="text-text-secondary">Notes:</span>{" "}
                      <span className="font-semibold">{notes.trim()}</span>
                    </p>
                  )}
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
                      ? supplyLines.map((line: { consumableId: string; quantity: number; itemName?: string; purpose?: string }, idx: number) => {
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
                                <p className="text-[10px] text-text-secondary truncate">
                                  {found ? `${found.itemCode} · ${found.unit}` : ""}
                                  {found && (line.purpose || purpose) ? " · " : ""}
                                  {(line.purpose || purpose || "").trim() || ""}
                                </p>
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
                      : assetItems.map((item: { itemDescription: string; category: string; quantity: number; purpose?: string }, idx: number) => {
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
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text truncate">
                                  {item.itemDescription || <span className="text-text-secondary italic">No description</span>}
                                </p>
                                {(item.purpose || purpose)?.trim() && (
                                  <p className="text-[10px] text-text-secondary truncate">
                                    {(item.purpose || purpose).trim()}
                                  </p>
                                )}
                              </div>
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
                      <label
                        htmlFor="edit-modification-reason"
                        className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
                      >
                        Modification Reason
                      </label>
                      <span className="text-destructive text-xs font-bold" aria-hidden="true">*</span>
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
                  <div className="p-2.5 bg-bg">
                    <textarea
                      id="edit-modification-reason"
                      rows={3}
                      value={editReason}
                      onChange={(e) => {
                        setEditReason(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      aria-required="true"
                      aria-invalid={
                        currentStep === "audit" && editReason.trim().length > 0 && editReason.trim().length < 5
                      }
                      placeholder="Why this request is changing… (required)"
                      className="w-full rounded-md border border-border bg-bg-subtle px-2.5 py-2 text-xs text-text placeholder:text-text-secondary/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 leading-relaxed resize-none"
                    />
                    <p className="text-[10px] text-text-secondary mt-1.5">
                      Required for the audit trail — logged with your name and timestamp.
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
              onClick={requestClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-border text-text-secondary hover:text-text hover:bg-bg transition-colors cursor-pointer disabled:opacity-50"
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
                disabled={isSubmitting || editReason.trim().length < 5}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
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

    <ConfirmDialog
      isOpen={discardConfirmOpen}
      title="Discard changes?"
      description="You have unsaved edits to this request. Closing will discard them."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      variant="warning"
      onConfirm={confirmDiscard}
      onClose={keepEditing}
    />
    </>
  );
}
