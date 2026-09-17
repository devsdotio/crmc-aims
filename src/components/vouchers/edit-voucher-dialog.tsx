"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Edit3,
  Loader2,
  Save,
  ListOrdered,
  Plus,
  Trash2,
} from "lucide-react";
import type { Voucher } from "@/types/vouchers";
import { useUpdateVoucherMutation } from "@/features/vouchers/client";
import { useDepartmentsQuery } from "@/features/departments/client/use-departments";
import { useToast } from "@/components/providers/toast-context";
import { filterMoneyInput } from "@/lib/numeric-input";
import {
  parseParticulars,
  serializeParticulars,
  sumParticularAmounts,
  type ParticularLineItem,
} from "@/lib/voucher-particulars";
import { cn } from "@/lib/utils";

interface EditVoucherDialogProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditVoucherDialog({
  voucher,
  isOpen,
  onClose,
  onSuccess,
}: EditVoucherDialogProps) {
  const toast = useToast();
  const updateMutation = useUpdateVoucherMutation();
  const { data: departments = [] } = useDepartmentsQuery({ enabled: isOpen });

  const [form, setForm] = useState({
    voucherCode: "",
    payeeName: "",
    amount: "",
    voucherDate: "",
    checkNumber: "",
    supplierName: "",
    purchaseOrderNumber: "",
    assetCode: "",
    purpose: "",
    departmentId: "" as string,
  });
  const [listItems, setListItems] = useState<ParticularLineItem[]>([
    { description: "", amount: "" },
  ]);

  useEffect(() => {
    if (!isOpen || !voucher) return;
    setForm({
      voucherCode: voucher.voucherCode || "",
      payeeName: voucher.payeeName || "",
      amount: voucher.amount || "",
      voucherDate: voucher.voucherDate || "",
      checkNumber: voucher.checkNumber || "",
      supplierName: voucher.supplierName || "",
      purchaseOrderNumber: voucher.purchaseOrderNumber || "",
      assetCode: voucher.assetCode || "",
      purpose: voucher.purpose || "",
      departmentId: voucher.departmentId || "",
    });
    const parsed = parseParticulars(voucher.particulars);
    setListItems(
      parsed.length > 0 ? parsed : [{ description: "", amount: "" }]
    );
  }, [isOpen, voucher]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher) return null;

  const syncAmountFromLines = (items: ParticularLineItem[]) => {
    const total = sumParticularAmounts(items);
    if (total > 0) {
      setForm((f) => ({ ...f, amount: total.toFixed(2) }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ParticularLineItem,
    value: string
  ) => {
    setListItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (field === "amount") {
        row.amount = filterMoneyInput(value);
      } else {
        row.description = value;
      }
      next[index] = row;
      if (field === "amount") syncAmountFromLines(next);
      return next;
    });
  };

  const handleAddItem = () => {
    setListItems((prev) => [...prev, { description: "", amount: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setListItems((prev) => {
      const next = prev.length <= 1 ? [{ description: "", amount: "" }] : prev.filter((_, i) => i !== index);
      syncAmountFromLines(next);
      return next;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.payeeName.trim()) {
      toast.error("Payee name is required.");
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      const selectedDept = departments.find((d) => d.id === form.departmentId);
      await updateMutation.mutateAsync({
        id: voucher.id,
        payload: {
          voucherCode: form.voucherCode.trim() || undefined,
          payeeName: form.payeeName.trim(),
          amount: amountNum.toFixed(2),
          voucherDate: form.voucherDate || undefined,
          checkNumber: form.checkNumber.trim() || null,
          supplierName: form.supplierName.trim() || null,
          purchaseOrderNumber: form.purchaseOrderNumber.trim() || null,
          assetCode: form.assetCode.trim() || null,
          purpose: form.purpose.trim(),
          particulars: serializeParticulars(listItems),
          departmentId: form.departmentId || null,
          departmentName: selectedDept?.name ?? null,
        },
      });
      toast.success(`Voucher ${form.voucherCode || voucher.voucherCode} updated.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update voucher."
      );
    }
  };

  const saving = updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-voucher-heading"
        className={cn(
          "relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-subtle/50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="edit-voucher-heading"
                className="text-sm font-bold text-text truncate"
              >
                Edit Voucher
              </h2>
              <p className="text-[11px] text-text-secondary font-mono truncate">
                {voucher.voucherCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-subtle hover:text-text cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Voucher Code / Number
              </label>
              <input
                type="text"
                value={form.voucherCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, voucherCode: e.target.value }))
                }
                className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Voucher Date
              </label>
              <input
                type="date"
                value={form.voucherDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, voucherDate: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Payee / Disbursed To <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.payeeName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, payeeName: e.target.value }))
                }
                required
                placeholder="Individual or entity name"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Amount (₱) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
                className="w-full font-mono font-semibold rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Check / Reference Number
              </label>
              <input
                type="text"
                value={form.checkNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, checkNumber: e.target.value }))
                }
                placeholder="Check or deposit transaction ref"
                className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Supplier / Dealer Name
              </label>
              <input
                type="text"
                value={form.supplierName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, supplierName: e.target.value }))
                }
                placeholder="Associated supplier firm"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Purchase Order #{" "}
                <span className="normal-case font-normal text-text-secondary">
                  (manual OK)
                </span>
              </label>
              <input
                type="text"
                value={form.purchaseOrderNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    purchaseOrderNumber: e.target.value,
                  }))
                }
                placeholder="PO-YYYY-XXXX or external reference"
                className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Linked Asset Code
              </label>
              <input
                type="text"
                value={form.assetCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, assetCode: e.target.value }))
                }
                placeholder="AST-YYYY-XXXX"
                className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Requesting Department
            </label>
            <select
              value={form.departmentId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, departmentId: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="">None / General Custodian Fund</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Purpose
            </label>
            <textarea
              rows={3}
              value={form.purpose}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, purpose: e.target.value }))
              }
              placeholder="Brief purpose / justification for this disbursement..."
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5" />
              Particulars
            </label>
            <div className="rounded-lg border border-border bg-bg-subtle/30 p-2.5 space-y-2">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_6.5rem_auto] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                <span className="w-7 text-center">#</span>
                <span>Description</span>
                <span className="text-right pr-1">Cost</span>
                <span className="w-8" />
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {listItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[auto_minmax(0,1fr)_6.5rem_auto] gap-2 items-center"
                  >
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-bg border border-border text-xs font-mono font-semibold text-text-secondary shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(idx, "description", e.target.value)
                      }
                      placeholder={`Item #${idx + 1}...`}
                      className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(e) =>
                        handleItemChange(idx, "amount", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs font-mono text-right text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-bg transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text bg-bg hover:bg-bg-subtle border border-border rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg-subtle/40 px-5 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
