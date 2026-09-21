"use client";

import { useEffect, useState } from "react";
import {
  X,
  PackagePlus,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManualMaterialItemPayload } from "@/features/projects/client";
import { formatPhp } from "./format-money";

export interface ManualMaterialRow {
  id: string;
  materialName: string;
  description: string;
  quantity: string;
  unitCost: string;
  incurredOn: string;
  notes: string;
}

function createEmptyRow(): ManualMaterialRow {
  return {
    id: Math.random().toString(36).substring(2, 9),
    materialName: "",
    description: "",
    quantity: "1",
    unitCost: "",
    incurredOn: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

export function AddManualMaterialDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: ManualMaterialItemPayload[]) => void | Promise<void>;
}) {
  const [rows, setRows] = useState<ManualMaterialRow[]>([createEmptyRow()]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRows([createEmptyRow()]);
    setError("");
    setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (
    id: string,
    field: keyof ManualMaterialRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const grandTotal = rows.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const unit = Number(r.unitCost) || 0;
    return sum + qty * unit;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payloadItems: ManualMaterialItemPayload[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const itemNum = i + 1;
      if (!r.materialName.trim()) {
        setError(`Item #${itemNum}: Material name is required.`);
        return;
      }
      const qty = Number(r.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`Item #${itemNum}: Quantity must be greater than 0.`);
        return;
      }
      const unit = Number(r.unitCost);
      if (!Number.isFinite(unit) || unit < 0) {
        setError(`Item #${itemNum}: Unit cost must be 0 or higher.`);
        return;
      }

      payloadItems.push({
        materialName: r.materialName.trim(),
        description: r.description.trim() || undefined,
        quantity: qty,
        unitCost: unit,
        incurredOn: r.incurredOn || undefined,
        notes: r.notes.trim() || undefined,
      });
    }

    if (payloadItems.length === 0) {
      setError("Please add at least one material item.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payloadItems);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record manual materials."
      );
      setIsSubmitting(false);
    }
  };

  const fieldClass = cn(
    "w-full h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1";

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
        aria-labelledby="manual-material-heading"
        className="relative w-full max-w-4xl bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="manual-material-heading"
                className="text-sm font-bold text-text"
              >
                Add Manual Materials
              </h2>
              <p className="text-[11px] text-text-secondary">
                Charge materials not tracked in inventory (multi-row batch entry with unit cost)
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-start gap-2 text-[11px] text-text-secondary bg-bg-subtle border border-border rounded-lg p-2.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
              <span>
                Enter each material with its <strong>Quantity</strong> and <strong>Unit Cost (₱)</strong>. Total cost is computed automatically. Does not deduct from warehouse inventory.
              </span>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => {
                const itemQty = Number(row.quantity) || 0;
                const itemUnit = Number(row.unitCost) || 0;
                const rowTotal = itemQty * itemUnit;

                return (
                  <div
                    key={row.id}
                    className="p-3.5 rounded-xl border border-border bg-bg-subtle/30 hover:bg-bg-subtle/60 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <span className="text-[11px] font-bold text-text flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-[10px] font-extrabold">
                          {index + 1}
                        </span>
                        Material Line Item #{index + 1}
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive hover:text-destructive/80 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                      <div className="md:col-span-4">
                        <label className={labelClass}>
                          Material Name <span className="text-accent">*</span>
                        </label>
                        <input
                          value={row.materialName}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "materialName", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="e.g. Portland Cement, Plywood 1/2"
                          autoFocus={index === rows.length - 1}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className={labelClass}>Description / Brand</label>
                        <input
                          value={row.description}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "description", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="Brand, size, specs"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>
                          Quantity <span className="text-accent">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "quantity", e.target.value)
                          }
                          className={cn(fieldClass, "font-mono tabular-nums")}
                          placeholder="1"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className={labelClass}>
                          Unit Cost (₱) <span className="text-accent">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[11px] font-bold text-text-secondary">
                            ₱
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unitCost}
                            onChange={(e) =>
                              handleUpdateRow(row.id, "unitCost", e.target.value)
                            }
                            className={cn(fieldClass, "pl-6 font-mono tabular-nums")}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
                      <div className="md:col-span-3">
                        <label className={labelClass}>Date Incurred</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={row.incurredOn}
                            onChange={(e) =>
                              handleUpdateRow(row.id, "incurredOn", e.target.value)
                            }
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6">
                        <label className={labelClass}>Notes / Receipt Ref</label>
                        <input
                          value={row.notes}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "notes", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="Receipt # or supplier note…"
                        />
                      </div>

                      <div className="md:col-span-3 flex flex-col justify-end items-end pb-0.5">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                          Subtotal
                        </span>
                        <span className="text-xs font-bold font-mono tabular-nums text-accent">
                          {formatPhp(rowTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg border border-dashed border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Material Item
            </button>

            {error && (
              <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-border bg-bg-subtle/50 shrink-0 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">
                Total Items: <strong className="text-text font-mono">{rows.length}</strong>
              </span>
              <span className="text-xs text-text-secondary">
                Grand Total:{" "}
                <strong className="text-sm font-bold font-mono text-accent">
                  {formatPhp(grandTotal)}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
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
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {isSubmitting ? "Saving Items…" : `Charge ${rows.length} Material${rows.length === 1 ? "" : "s"} to Project`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
