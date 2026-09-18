"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { useConfirm } from "@/components/providers/confirm-context";
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

type FormState = {
  voucherCode: string;
  payeeName: string;
  amount: string;
  voucherDate: string;
  checkNumber: string;
  supplierName: string;
  purchaseOrderNumber: string;
  assetCode: string;
  purpose: string;
  departmentId: string;
};

function emptyParticulars(): ParticularLineItem[] {
  return [{ description: "", amount: "" }];
}

function particularsEqual(
  a: ParticularLineItem[],
  b: ParticularLineItem[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (row, i) =>
      row.description === b[i].description && row.amount === b[i].amount
  );
}

export function EditVoucherDialog({
  voucher,
  isOpen,
  onClose,
  onSuccess,
}: EditVoucherDialogProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const updateMutation = useUpdateVoucherMutation();
  const { data: departments = [] } = useDepartmentsQuery({ enabled: isOpen });

  const [form, setForm] = useState<FormState>({
    voucherCode: "",
    payeeName: "",
    amount: "",
    voucherDate: "",
    checkNumber: "",
    supplierName: "",
    purchaseOrderNumber: "",
    assetCode: "",
    purpose: "",
    departmentId: "",
  });
  const [listItems, setListItems] = useState<ParticularLineItem[]>(
    emptyParticulars()
  );
  const [baseline, setBaseline] = useState<{
    form: FormState;
    listItems: ParticularLineItem[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !voucher) return;
    const nextForm: FormState = {
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
    };
    const parsed = parseParticulars(voucher.particulars);
    const nextItems =
      parsed.length > 0 ? parsed : emptyParticulars();
    setForm(nextForm);
    setListItems(nextItems);
    setBaseline({ form: nextForm, listItems: nextItems });
  }, [isOpen, voucher]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    const formChanged = (Object.keys(form) as Array<keyof FormState>).some(
      (key) => form[key] !== baseline.form[key]
    );
    return formChanged || !particularsEqual(listItems, baseline.listItems);
  }, [baseline, form, listItems]);

  const saving = updateMutation.isPending;

  const requestClose = async () => {
    if (saving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    const confirmed = await confirm({
      title: "Discard changes?",
      description:
        "You have unsaved edits on this voucher. Closing will discard them.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      variant: "destructive",
    });
    if (confirmed) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        void requestClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close handler reads latest dirty/pending state
  }, [isOpen, saving, isDirty]);

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
        row.amount = filterMoneyInput(value) ?? row.amount;
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
      const next =
        prev.length <= 1
          ? emptyParticulars()
          : prev.filter((_, i) => i !== index);
      syncAmountFromLines(next);
      return next;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.payeeName.trim()) {
      toast.error("Payee is required.");
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
      toast.success(
        `Voucher ${form.voucherCode || voucher.voucherCode} updated.`
      );
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update voucher."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="absolute inset-0"
        onClick={() => void requestClose()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-voucher-heading"
        aria-describedby="edit-voucher-subtitle"
        className={cn(
          "relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-subtle/50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="edit-voucher-heading"
                className="text-sm font-bold text-text truncate"
              >
                Edit voucher
              </h2>
              <p
                id="edit-voucher-subtitle"
                className="text-[11px] text-text-secondary truncate"
              >
                Update details for{" "}
                <span className="font-mono font-semibold text-text">
                  {voucher.voucherCode}
                </span>
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void requestClose()}
            disabled={saving}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-subtle hover:text-text cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-5 space-y-5"
        >
          <fieldset className="space-y-3 border-0 p-0 m-0">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-code"
                  className="block text-xs font-semibold text-text"
                >
                  Voucher number
                </label>
                <input
                  id="edit-voucher-code"
                  type="text"
                  value={form.voucherCode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      voucherCode: e.target.value,
                    }))
                  }
                  disabled={saving}
                  placeholder="e.g. DRR2026-000001"
                  className="w-full h-9 font-mono rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-date"
                  className="block text-xs font-semibold text-text"
                >
                  Voucher date
                </label>
                <input
                  id="edit-voucher-date"
                  type="date"
                  value={form.voucherDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      voucherDate: e.target.value,
                    }))
                  }
                  disabled={saving}
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-payee"
                  className="block text-xs font-semibold text-text"
                >
                  Payee / disbursed to <span className="text-accent">*</span>
                </label>
                <input
                  id="edit-voucher-payee"
                  type="text"
                  value={form.payeeName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, payeeName: e.target.value }))
                  }
                  required
                  aria-required="true"
                  aria-describedby="edit-payee-hint"
                  disabled={saving}
                  placeholder="e.g. Purchaser name or supplier"
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
                <p id="edit-payee-hint" className="text-[11px] text-text-secondary">
                  Person or entity who received the funds.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-amount"
                  className="block text-xs font-semibold text-text"
                >
                  Amount (₱) <span className="text-accent">*</span>
                </label>
                <input
                  id="edit-voucher-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  required
                  aria-required="true"
                  aria-describedby="edit-amount-hint"
                  disabled={saving}
                  placeholder="0.00"
                  className="w-full h-9 font-mono font-semibold rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
                <p id="edit-amount-hint" className="text-[11px] text-text-secondary">
                  Updates automatically when particular line costs change.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-0 p-0 m-0">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              References
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-check"
                  className="block text-xs font-semibold text-text"
                >
                  Check / reference no.
                </label>
                <input
                  id="edit-voucher-check"
                  type="text"
                  value={form.checkNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      checkNumber: e.target.value,
                    }))
                  }
                  disabled={saving}
                  placeholder="e.g. Check #, OR #, or Trans ID"
                  className="w-full h-9 font-mono rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-supplier"
                  className="block text-xs font-semibold text-text"
                >
                  Supplier / dealer
                </label>
                <input
                  id="edit-voucher-supplier"
                  type="text"
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                  disabled={saving}
                  placeholder="Associated supplier firm"
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-po"
                  className="block text-xs font-semibold text-text"
                >
                  Purchase order #
                </label>
                <input
                  id="edit-voucher-po"
                  type="text"
                  value={form.purchaseOrderNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      purchaseOrderNumber: e.target.value,
                    }))
                  }
                  disabled={saving}
                  aria-describedby="edit-po-hint"
                  placeholder="PO-YYYY-XXXX or external reference"
                  className="w-full h-9 font-mono rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
                <p id="edit-po-hint" className="text-[11px] text-text-secondary">
                  Optional. Manual references are allowed.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-voucher-asset"
                  className="block text-xs font-semibold text-text"
                >
                  Linked asset code
                </label>
                <input
                  id="edit-voucher-asset"
                  type="text"
                  value={form.assetCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assetCode: e.target.value }))
                  }
                  disabled={saving}
                  placeholder="AST-YYYY-XXXX"
                  className="w-full h-9 font-mono rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-voucher-department"
                className="block text-xs font-semibold text-text"
              >
                Requesting department
              </label>
              <select
                id="edit-voucher-department"
                value={form.departmentId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    departmentId: e.target.value,
                  }))
                }
                disabled={saving}
                aria-describedby="edit-department-hint"
                className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer disabled:opacity-70"
              >
                <option value="">None / General Custodian Fund</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <p id="edit-department-hint" className="text-[11px] text-text-secondary">
                Department or office this disbursement is charged to.
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-0 p-0 m-0">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1">
              Purpose & particulars
            </legend>

            <div className="space-y-1">
              <label
                htmlFor="edit-voucher-purpose"
                className="block text-xs font-semibold text-text"
              >
                Purpose
              </label>
              <textarea
                id="edit-voucher-purpose"
                rows={3}
                value={form.purpose}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, purpose: e.target.value }))
                }
                disabled={saving}
                placeholder="e.g. Office replenishment, PO settlement, emergency purchase"
                aria-describedby="edit-purpose-hint"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:opacity-70"
              />
              <p id="edit-purpose-hint" className="text-[11px] text-text-secondary">
                Optional justification for this disbursement.
              </p>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <ListOrdered className="h-3.5 w-3.5" />
                Particulars
              </label>
              <p className="text-[11px] text-text-secondary">
                Itemized costs. Line totals update the amount when filled.
              </p>
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
                        disabled={saving}
                        placeholder={`Item #${idx + 1} description`}
                        className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange(idx, "amount", e.target.value)
                        }
                        disabled={saving}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs font-mono text-right text-text focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={saving}
                        className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-bg transition-colors cursor-pointer disabled:opacity-50"
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
                    disabled={saving}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text bg-bg hover:bg-bg-subtle border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add item
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>

        <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg-subtle/40 px-5 py-3.5 shrink-0">
          <button
            type="button"
            onClick={() => void requestClose()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
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
            <span>Save changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
