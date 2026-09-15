"use client";

import { useEffect, useState } from "react";
import {
  X,
  Receipt,
  Pencil,
  Plus,
  FileText,
  Calendar,
  AlertCircle,
  Loader2,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProjectExpenseCategory,
  ProjectExpenseLine,
} from "@/types/projects";
import { PROJECT_EXPENSE_CATEGORY_LABELS } from "@/types/projects";

export type ExpenseFormInput = {
  lineType: "miscellaneous" | "adjustment";
  category: ProjectExpenseCategory;
  categoryLabel: string;
  description: string;
  amount: string;
  incurredOn: string;
  notes: string;
};

export function AddEditExpenseDialog({
  isOpen,
  expense,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  expense: ProjectExpenseLine | null;
  onClose: () => void;
  onSubmit: (input: ExpenseFormInput) => void | Promise<void>;
}) {
  const isEdit = Boolean(expense);
  const [form, setForm] = useState<ExpenseFormInput>({
    lineType: "miscellaneous",
    category: "miscellaneous",
    categoryLabel: "",
    description: "",
    amount: "",
    incurredOn: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      lineType:
        expense?.lineType === "adjustment" ? "adjustment" : "miscellaneous",
      category: expense?.category ?? "miscellaneous",
      categoryLabel: expense?.categoryLabel ?? "",
      description: expense?.description ?? "",
      amount: expense?.amount ?? "",
      incurredOn: expense?.incurredOn ?? new Date().toISOString().slice(0, 10),
      notes: expense?.notes ?? "",
    });
    setError("");
    setIsSubmitting(false);
  }, [isOpen, expense]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("Amount must be a non-zero number.");
      return;
    }
    if (form.lineType === "miscellaneous" && amount < 0) {
      setError("Expenses must be positive. Use Adjustment / credit for refunds.");
      return;
    }
    if (
      form.lineType === "miscellaneous" &&
      form.category === "other" &&
      !form.categoryLabel.trim()
    ) {
      setError("Enter a custom category for Other.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        description: form.description.trim(),
        notes: form.notes.trim(),
        categoryLabel: form.categoryLabel.trim(),
        category:
          form.lineType === "adjustment" ? "adjustment" : form.category,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense.");
      setIsSubmitting(false);
    }
  };

  const categoryOptions = (
    Object.keys(PROJECT_EXPENSE_CATEGORY_LABELS) as ProjectExpenseCategory[]
  ).filter((c) => c !== "adjustment");

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
        aria-labelledby="expense-form-heading"
        className="relative w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              {isEdit ? <Pencil className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
            </div>
            <div>
              <h2 id="expense-form-heading" className="text-sm font-bold text-text">
                {isEdit ? "Edit Expense" : "Add Expense"}
              </h2>
              <p className="text-[11px] text-text-secondary">
                Unexpected costs, travel, snacks, or budget adjustments
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
          {/* Line Type Pill Toggle */}
          <div>
            <label className={labelClass}>Expense Type</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-subtle border border-border">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    lineType: "miscellaneous",
                    category:
                      f.category === "adjustment"
                        ? "miscellaneous"
                        : f.category,
                  }))
                }
                className={cn(
                  "inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer",
                  form.lineType === "miscellaneous"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                Expense / Misc
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    lineType: "adjustment",
                    category: "adjustment",
                  }))
                }
                className={cn(
                  "inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer",
                  form.lineType === "adjustment"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                Adjustment / Credit
              </button>
            </div>
          </div>

          {/* Category Dropdown (if miscellaneous) */}
          {form.lineType === "miscellaneous" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="exp-cat" className={labelClass}>
                    Category
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10">
                    <Tag className="h-2.5 w-2.5" />
                    {form.category === "other" && form.categoryLabel.trim()
                      ? form.categoryLabel.trim()
                      : PROJECT_EXPENSE_CATEGORY_LABELS[form.category]}
                  </span>
                </div>
                <select
                  id="exp-cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as ProjectExpenseCategory,
                    }))
                  }
                  className={cn(fieldClass, "cursor-pointer")}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {PROJECT_EXPENSE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {form.category === "other" && (
                <div>
                  <label htmlFor="exp-cat-label" className={labelClass}>
                    Custom category <span className="text-accent">*</span>
                  </label>
                  <input
                    id="exp-cat-label"
                    value={form.categoryLabel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoryLabel: e.target.value }))
                    }
                    className={fieldClass}
                    placeholder="e.g. Permits, utilities, catering"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="exp-desc" className={labelClass}>
              Description <span className="text-accent">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <FileText className="h-4 w-4" />
              </span>
              <input
                id="exp-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={cn(fieldClass, "pl-9")}
                placeholder="e.g. Site visit fuel, crew meals, permits"
                autoFocus
              />
            </div>
          </div>

          {/* Amount and Date Incurred */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className={labelClass}>
                Amount (₱) <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-xs font-bold text-text-secondary">
                  ₱
                </span>
                <input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className={cn(fieldClass, "pl-7 font-mono tabular-nums")}
                  placeholder={form.lineType === "adjustment" ? "±0.00" : "0.00"}
                />
              </div>
              {form.lineType === "adjustment" && (
                <p className="text-[10px] text-text-secondary mt-1">
                  Use negative values for refunds / credits.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="exp-date" className={labelClass}>
                Date incurred
              </label>
              <div className="relative">
                <input
                  id="exp-date"
                  type="date"
                  value={form.incurredOn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, incurredOn: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="exp-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="exp-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="Receipt reference, vendor name, or additional notes…"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
