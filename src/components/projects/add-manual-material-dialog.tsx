"use client";

import { useEffect, useState } from "react";
import {
  X,
  PackagePlus,
  Check,
  Hash,
  Info,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ManualMaterialFormInput = {
  materialName: string;
  description: string;
  quantity: string;
  amount: string;
  incurredOn: string;
  notes: string;
};

export function AddManualMaterialDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ManualMaterialFormInput) => void | Promise<void>;
}) {
  const [form, setForm] = useState<ManualMaterialFormInput>({
    materialName: "",
    description: "",
    quantity: "1",
    amount: "",
    incurredOn: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      materialName: "",
      description: "",
      quantity: "1",
      amount: "",
      incurredOn: new Date().toISOString().slice(0, 10),
      notes: "",
    });
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

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialName.trim()) {
      setError("Material name is required.");
      return;
    }
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Overall cost must be a positive amount.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        materialName: form.materialName.trim(),
        description: form.description.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add manual material."
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
        aria-labelledby="manual-material-heading"
        className="relative w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="manual-material-heading"
                className="text-sm font-bold text-text"
              >
                Manual Material
              </h2>
              <p className="text-[11px] text-text-secondary">
                Charge a material not tracked in inventory (no stock deduction)
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
            <label htmlFor="mm-name" className={labelClass}>
              Material name <span className="text-accent">*</span>
            </label>
            <input
              id="mm-name"
              value={form.materialName}
              onChange={(e) =>
                setForm((f) => ({ ...f, materialName: e.target.value }))
              }
              className={fieldClass}
              placeholder="e.g. Exterior paint, extension cord, plywood"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="mm-desc" className={labelClass}>
              Description
            </label>
            <div className="relative">
              <span className="absolute top-2.5 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <FileText className="h-4 w-4" />
              </span>
              <textarea
                id="mm-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className={cn(fieldClass, "h-auto py-2 pl-9 resize-y min-h-14")}
                placeholder="Brand, size, vendor, or what it was used for…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mm-qty" className={labelClass}>
                Quantity <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                  <Hash className="h-3.5 w-3.5" />
                </span>
                <input
                  id="mm-qty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  className={cn(fieldClass, "pl-9 font-mono tabular-nums")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="mm-amount" className={labelClass}>
                Overall cost (₱) <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-xs font-bold text-text-secondary">
                  ₱
                </span>
                <input
                  id="mm-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className={cn(fieldClass, "pl-7 font-mono tabular-nums")}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="mm-date" className={labelClass}>
              Date incurred
            </label>
            <input
              id="mm-date"
              type="date"
              value={form.incurredOn}
              onChange={(e) =>
                setForm((f) => ({ ...f, incurredOn: e.target.value }))
              }
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="mm-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="mm-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="Receipt reference or additional notes…"
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-text-secondary bg-bg-subtle border border-border rounded-lg p-2.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <span>
              This does not touch inventory stock. Use{" "}
              <strong className="text-text">Materials</strong> when issuing from
              on-hand supplies.
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Saving…" : "Charge to Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
