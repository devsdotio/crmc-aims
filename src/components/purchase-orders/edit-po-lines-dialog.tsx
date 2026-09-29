"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Edit3,
  GripVertical,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhp } from "@/components/projects/format-money";
import { useToast } from "@/components/providers/toast-context";
import {
  useDeletePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
} from "@/features/purchase-lots/client";
import {
  stampPoPurpose,
  stripPoPurposePrefix,
} from "@/lib/po-purpose";
import { groupByPurpose } from "@/lib/request-purpose";
import type { PurchaseLot } from "@/types/purchase-lots";

type EditStep = "items" | "purposes";

interface LineDraft {
  itemName: string;
  quantity: string;
  unitCost: string;
}

type PurposeGroup = {
  id: string;
  purpose: string;
  lineIds: string[];
};

const STEPS: Array<{
  id: EditStep;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "items",
    label: "Line Items",
    description: "Name, qty & costs",
    icon: Boxes,
  },
  {
    id: "purposes",
    label: "Purpose Assignment",
    description: "Group lines & purposes",
    icon: Layers,
  },
];

function newPurposeGroup(purpose = "", lineIds: string[] = []): PurposeGroup {
  return { id: crypto.randomUUID(), purpose, lineIds };
}

interface EditPoLinesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lot: PurchaseLot;
  lines: PurchaseLot[];
  purposePrefix: string;
  /** Called after the last remaining line is deleted (closes the sheet). */
  onLastLineDeleted?: () => void;
  onDeleteLine?: (lot: PurchaseLot) => void;
  /** Open directly on purposes step when launched from purpose Edit. */
  initialStep?: EditStep;
}

export function EditPoLinesDialog({
  isOpen,
  onClose,
  lot,
  lines,
  purposePrefix,
  onLastLineDeleted,
  onDeleteLine,
  initialStep = "items",
}: EditPoLinesDialogProps) {
  const toast = useToast();
  const updateMutation = useUpdatePurchaseOrderMutation();
  const deleteMutation = useDeletePurchaseOrderMutation();

  const [step, setStep] = useState<EditStep>("items");
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [purposeGroups, setPurposeGroups] = useState<PurposeGroup[]>([]);
  const [dragLineId, setDragLineId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleLineIds, setVisibleLineIds] = useState<string[]>([]);

  const visibleLines = useMemo(
    () => lines.filter((li) => visibleLineIds.includes(li.id)),
    [lines, visibleLineIds]
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep(initialStep);
    setVisibleLineIds(lines.map((li) => li.id));

    const nextDrafts: Record<string, LineDraft> = {};
    for (const li of lines) {
      nextDrafts[li.id] = {
        itemName: li.itemName,
        quantity: String(li.quantity),
        unitCost: String(li.unitCost),
      };
    }
    setDrafts(nextDrafts);

    const sections = groupByPurpose(
      lines.map((li) => ({
        ...li,
        purpose: stripPoPurposePrefix(li.purpose) || "General",
      })),
      stripPoPurposePrefix(lot.purpose) || "General"
    );
    setPurposeGroups(
      sections.map((s) =>
        newPurposeGroup(
          s.purpose === "General" ? "" : s.purpose,
          s.lines.map((l) => l.id)
        )
      )
    );
    setDragLineId(null);
    setDropTargetId(null);
  }, [isOpen, lines, lot.purpose, initialStep]);

  if (!isOpen) return null;

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const updateDraft = (id: string, patch: Partial<LineDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const displayName = (id: string) =>
    drafts[id]?.itemName?.trim() ||
    visibleLines.find((l) => l.id === id)?.itemName ||
    "Untitled";

  const displayQty = (id: string) =>
    drafts[id]?.quantity ||
    String(visibleLines.find((l) => l.id === id)?.quantity ?? 1);

  const validateItems = (): boolean => {
    for (const li of visibleLines) {
      const draft = drafts[li.id];
      if (!draft) continue;
      const qty = Number.parseInt(draft.quantity, 10);
      const cost = Number.parseFloat(draft.unitCost);
      if (!draft.itemName.trim()) {
        toast.error(`Name is required for “${li.itemName}”.`);
        return false;
      }
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error(`Quantity must be at least 1 for “${li.itemName}”.`);
        return false;
      }
      if (!Number.isFinite(cost) || cost < 0) {
        toast.error(`Enter a valid unit cost for “${li.itemName}”.`);
        return false;
      }
    }
    if (visibleLines.length < 1) {
      toast.error("At least one line item is required.");
      return false;
    }
    return true;
  };

  const seedPurposeLines = (groups: PurposeGroup[]): PurposeGroup[] => {
    const ids = visibleLines.map((li) => li.id);
    if (groups.length === 1) {
      return [{ ...groups[0], lineIds: ids }];
    }
    const idSet = new Set(ids);
    const pruned = groups.map((g) => ({
      ...g,
      lineIds: g.lineIds.filter((id) => idSet.has(id)),
    }));
    const assigned = new Set(pruned.flatMap((g) => g.lineIds));
    const orphans = ids.filter((id) => !assigned.has(id));
    if (orphans.length > 0 && pruned.length > 0) {
      return pruned.map((g, idx) =>
        idx === 0 ? { ...g, lineIds: [...g.lineIds, ...orphans] } : g
      );
    }
    const anyAssigned = pruned.some((g) => g.lineIds.length > 0);
    if (!anyAssigned && pruned.length > 0) {
      return pruned.map((g, idx) =>
        idx === 0 ? { ...g, lineIds: ids } : g
      );
    }
    return pruned;
  };

  const validatePurposes = (): boolean => {
    const groups = seedPurposeLines(purposeGroups);
    if (groups.length < 1) {
      toast.error("Add at least one purpose group.");
      return false;
    }
    for (let i = 0; i < groups.length; i++) {
      if (!groups[i].purpose.trim()) {
        toast.error(
          groups.length === 1
            ? "Procurement purpose is required."
            : `Purpose ${i + 1} text is required.`
        );
        return false;
      }
      if (groups[i].lineIds.length === 0) {
        toast.error(`Purpose ${i + 1} needs at least one line item.`);
        return false;
      }
    }
    const assigned = new Set(groups.flatMap((g) => g.lineIds));
    if (visibleLines.some((li) => !assigned.has(li.id))) {
      toast.error("Assign every line item to a purpose.");
      return false;
    }
    return true;
  };

  const goToPurposes = () => {
    if (!validateItems()) return;
    setPurposeGroups((prev) => seedPurposeLines(prev));
    setStep("purposes");
  };

  const assignLineToPurpose = (groupId: string, lineId: string) => {
    setPurposeGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          if (g.lineIds.includes(lineId)) return g;
          return { ...g, lineIds: [...g.lineIds, lineId] };
        }
        return { ...g, lineIds: g.lineIds.filter((id) => id !== lineId) };
      })
    );
  };

  const removePurposeGroup = (groupId: string) => {
    setPurposeGroups((prev) => {
      if (prev.length <= 1) return prev;
      const removing = prev.find((g) => g.id === groupId);
      const kept = prev.filter((g) => g.id !== groupId);
      if (!removing || kept.length === 0) return prev;
      const orphanIds = removing.lineIds;
      if (orphanIds.length === 0) return kept;
      return kept.map((g, idx) =>
        idx === 0
          ? {
              ...g,
              lineIds: [
                ...g.lineIds,
                ...orphanIds.filter((id) => !g.lineIds.includes(id)),
              ],
            }
          : g
      );
    });
  };

  const clearKanbanDrag = () => {
    setDragLineId(null);
    setDropTargetId(null);
  };

  const handleDelete = async (li: PurchaseLot) => {
    if (onDeleteLine) {
      onDeleteLine(li);
      setVisibleLineIds((prev) => prev.filter((id) => id !== li.id));
      setPurposeGroups((prev) =>
        prev.map((g) => ({
          ...g,
          lineIds: g.lineIds.filter((id) => id !== li.id),
        }))
      );
      return;
    }
    try {
      await deleteMutation.mutateAsync(li.id);
      toast.success("Line item removed.");
      const remaining = visibleLineIds.filter((id) => id !== li.id);
      setVisibleLineIds(remaining);
      setPurposeGroups((prev) =>
        prev.map((g) => ({
          ...g,
          lineIds: g.lineIds.filter((id) => id !== li.id),
        }))
      );
      if (remaining.length < 1) {
        onClose();
        onLastLineDeleted?.();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete line item."
      );
    }
  };

  const handleSave = async () => {
    if (!validateItems() || !validatePurposes()) return;

    const groups = seedPurposeLines(purposeGroups);
    setIsSaving(true);
    try {
      for (const li of visibleLines) {
        const draft = drafts[li.id];
        if (!draft) continue;
        const qty = Number.parseInt(draft.quantity, 10);
        const cost = Number.parseFloat(draft.unitCost);
        const nameChanged = draft.itemName.trim() !== li.itemName;
        const qtyChanged = qty !== li.quantity;
        const costChanged = cost !== (parseFloat(li.unitCost) || 0);
        if (nameChanged || qtyChanged || costChanged) {
          await updateMutation.mutateAsync({
            id: li.id,
            payload: {
              itemName: draft.itemName.trim(),
              quantity: qty,
              unitCost: cost,
            },
          });
        }
      }

      const linePurposes = groups.flatMap((g) =>
        g.lineIds.map((lotId) => ({
          lotId,
          purpose: stampPoPurpose(purposePrefix, g.purpose.trim()),
        }))
      );
      if (linePurposes.some((e) => !e.purpose.trim())) {
        toast.error("Procurement purpose is required.");
        return;
      }
      const headerPurpose = stampPoPurpose(
        purposePrefix,
        groups.map((g) => g.purpose.trim()).join("; ")
      );
      if (!headerPurpose) {
        toast.error("Procurement purpose is required.");
        return;
      }
      await updateMutation.mutateAsync({
        id: lot.id,
        payload: {
          linePurposes,
          purpose: headerPurpose,
        },
      });

      toast.success("Line items and purposes updated.");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-bg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-text text-sm flex items-center gap-1.5">
              <Edit3 className="h-4 w-4 text-accent" />
              Edit Line Items & Purposes
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-text-secondary hover:text-text cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper */}
          <div
            className="flex items-center gap-1"
            role="navigation"
            aria-label="Edit steps"
          >
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done = idx < stepIdx;
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id === "items") setStep("items");
                      else if (validateItems()) {
                        setPurposeGroups((prev) => seedPurposeLines(prev));
                        setStep("purposes");
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                      active
                        ? "bg-accent text-accent-foreground"
                        : done
                          ? "bg-accent/10 text-accent hover:bg-accent/15"
                          : "text-text-secondary hover:bg-bg-subtle"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{idx + 1}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1 max-w-8",
                        done || active ? "bg-accent/40" : "bg-border"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
            <span className="ml-auto text-[10px] text-text-secondary font-medium">
              {STEPS[stepIdx]?.description}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {step === "items" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <p className="text-xs text-text-secondary">
                Update name, quantity, and unit cost for each line, then continue
                to purpose assignment.
              </p>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {visibleLines.map((li, idx) => {
                  const draft = drafts[li.id] ?? {
                    itemName: li.itemName,
                    quantity: String(li.quantity),
                    unitCost: String(li.unitCost),
                  };
                  const qty = Number.parseInt(draft.quantity, 10) || 0;
                  const cost = Number.parseFloat(draft.unitCost) || 0;

                  return (
                    <div
                      key={li.id}
                      className="px-3 py-3 bg-bg flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-text-secondary shrink-0">
                            #{idx + 1}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0",
                              li.itemType === "asset"
                                ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25"
                                : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25"
                            )}
                          >
                            {li.itemType}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={draft.itemName}
                          onChange={(e) =>
                            updateDraft(li.id, { itemName: e.target.value })
                          }
                          className="w-full h-8 px-2 rounded-md border border-border bg-bg text-xs font-semibold text-text focus:ring-1 focus:ring-accent focus:outline-hidden"
                        />
                        <span className="font-mono text-[10px] text-text-secondary block">
                          {li.itemCode}
                          {li.lotCode ? ` · ${li.lotCode}` : ""}
                        </span>
                      </div>

                      <div className="flex items-end gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        <label className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                            Qty
                          </span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={draft.quantity}
                            onChange={(e) =>
                              updateDraft(li.id, { quantity: e.target.value })
                            }
                            className="w-20 h-8 px-2 rounded-md border border-border bg-bg text-xs font-mono text-center focus:ring-1 focus:ring-accent focus:outline-hidden"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                            Unit Cost
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={draft.unitCost}
                            onChange={(e) =>
                              updateDraft(li.id, { unitCost: e.target.value })
                            }
                            className="w-28 h-8 px-2 rounded-md border border-border bg-bg text-xs font-mono text-right focus:ring-1 focus:ring-accent focus:outline-hidden"
                          />
                        </label>
                        <div className="space-y-1 min-w-24">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                            Total
                          </span>
                          <p className="h-8 flex items-center justify-end font-mono text-xs font-bold text-status-active-text tabular-nums">
                            {formatPhp(qty * cost)}
                          </p>
                        </div>
                        {visibleLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(li)}
                            disabled={deleteMutation.isPending || isSaving}
                            className="p-1.5 rounded-md border border-border text-rose-600 hover:bg-rose-500/10 cursor-pointer disabled:opacity-50 mb-0.5"
                            title="Delete line item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "purposes" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-text">
                      Purpose Assignment
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      Drag line items between purpose columns. Every line stays
                      under a purpose.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPurposeGroups((prev) => [...prev, newPurposeGroup()])
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add purpose
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 min-h-56">
                {purposeGroups.map((group, groupIdx) => {
                  const assignedItems = visibleLines.filter((li) =>
                    group.lineIds.includes(li.id)
                  );
                  const isOver = dropTargetId === group.id;

                  return (
                    <div
                      key={group.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dropTargetId !== group.id) {
                          setDropTargetId(group.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (
                          e.currentTarget.contains(e.relatedTarget as Node)
                        ) {
                          return;
                        }
                        if (dropTargetId === group.id) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const lineId =
                          e.dataTransfer.getData("text/plain") || dragLineId;
                        if (lineId) assignLineToPurpose(group.id, lineId);
                        clearKanbanDrag();
                      }}
                      className={cn(
                        "w-52 sm:w-56 shrink-0 rounded-xl border bg-bg flex flex-col overflow-hidden transition-colors",
                        isOver
                          ? "border-indigo-500/50 ring-2 ring-indigo-500/20 bg-indigo-500/5"
                          : "border-border"
                      )}
                    >
                      <div className="px-2.5 py-2 border-b border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                            Purpose {groupIdx + 1} ({assignedItems.length})
                            <span className="text-rose-600 normal-case tracking-normal"> *</span>
                          </p>
                          {purposeGroups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePurposeGroup(group.id)}
                              className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <textarea
                          value={group.purpose}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPurposeGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, purpose: value }
                                  : g
                              )
                            );
                          }}
                          onDragOver={(e) => e.stopPropagation()}
                          placeholder={
                            groupIdx === 0
                              ? "Purpose — e.g. office replenishment…"
                              : "Purpose text…"
                          }
                          rows={2}
                          required
                          aria-required="true"
                          className="w-full p-1.5 rounded-md border border-border bg-bg text-[11px] focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed"
                        />
                      </div>
                      <div className="p-2 space-y-1.5 flex-1 min-h-36 max-h-64 overflow-y-auto">
                        {assignedItems.length > 0 ? (
                          assignedItems.map((li) => {
                            const isDragging = dragLineId === li.id;
                            return (
                              <div
                                key={li.id}
                                draggable
                                onDragStart={(e) => {
                                  setDragLineId(li.id);
                                  e.dataTransfer.setData("text/plain", li.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={clearKanbanDrag}
                                className={cn(
                                  "flex items-start gap-1.5 px-2 py-1.5 rounded-md border bg-card text-xs cursor-grab active:cursor-grabbing select-none shadow-2xs transition-opacity",
                                  isDragging
                                    ? "opacity-40 border-accent"
                                    : "border-border hover:border-accent/40"
                                )}
                              >
                                <GripVertical className="h-3.5 w-3.5 text-text-secondary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-text truncate leading-snug">
                                    {displayName(li.id)}
                                  </p>
                                  <p className="text-[10px] text-text-secondary truncate">
                                    Qty {displayQty(li.id)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-text-secondary px-1 py-6 text-center border border-dashed border-border/80 rounded-md">
                            {isOver ? "Drop here" : "Drag items here"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (step === "purposes") setStep("items");
              else onClose();
            }}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-bg-subtle text-text cursor-pointer disabled:opacity-50"
          >
            {step === "purposes" ? "Back" : "Cancel"}
          </button>
          <div className="flex items-center gap-2">
            {step === "items" ? (
              <button
                type="button"
                onClick={goToPurposes}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              >
                Next: Purposes
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || updateMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
