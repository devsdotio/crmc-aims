"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wallet,
  Calendar,
  Building2,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Receipt,
  Tag,
  User,
  Check,
  AlertCircle,
  Loader2,
  Edit3,
  Save,
  RotateCcw,
  Boxes,
  ListOrdered,
  Plus,
  Trash2,
} from "lucide-react";
import type { PettyCashVoucher, PettyCashStatus } from "@/types/petty-cash";
import { PETTY_CASH_CATEGORIES } from "@/types/petty-cash";
import {
  usePettyCashQuery,
  useUpdatePettyCashMutation,
  useUpdatePettyCashStatusMutation,
  useDeletePettyCashMutation,
} from "@/features/petty-cash/client";
import { useDepartmentsQuery } from "@/features/departments/client/use-departments";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { useAuditLogsQuery } from "@/features/audit-logs/client";
import { formatPhp } from "@/components/projects/format-money";
import { useToast } from "@/components/providers/toast-context";
import { useConfirm } from "@/components/providers/confirm-context";
import { cn } from "@/lib/utils";
import { filterMoneyInput } from "@/lib/numeric-input";
import {
  parseParticulars,
  serializeParticulars,
  sumParticularAmounts,
  type ParticularLineItem,
} from "@/lib/voucher-particulars";

interface PettyCashDetailSheetProps {
  voucher: PettyCashVoucher | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "details" | "workflow";

function getStatusBadge(status: PettyCashStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Disbursed / Done",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
        icon: ShieldCheck,
      };
    case "pending_approval":
      return {
        label: "Pending Approval",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
        icon: Clock,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
        icon: Ban,
      };
    case "draft":
    default:
      return {
        label: "Draft",
        className: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20",
        icon: FileText,
      };
  }
}

export function PettyCashDetailSheet({
  voucher: initialVoucher,
  isOpen,
  onClose,
}: PettyCashDetailSheetProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>("details");

  // Fetch live voucher
  const { data: liveVoucher } = usePettyCashQuery(initialVoucher?.id ?? "");
  const voucher = liveVoucher ?? initialVoucher;

  const { data: departments = [] } = useDepartmentsQuery({
    enabled: Boolean(isOpen && voucher?.id),
  });

  // Fetch live audit logs for this petty cash record
  const { data: auditLogs = [] } = useAuditLogsQuery({
    entityId: voucher?.id,
    entityType: "petty_cash",
    enabled: Boolean(isOpen && voucher?.id),
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editPayee, setEditPayee] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("supplies");
  const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);
  const [editDepartmentIds, setEditDepartmentIds] = useState<string[]>([]);
  const [editReceiptNumber, setEditReceiptNumber] = useState("");
  const [editPurchaseOrderNumber, setEditPurchaseOrderNumber] = useState("");
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [editListItems, setEditListItems] = useState<ParticularLineItem[]>([
    { description: "", amount: "" },
  ]);

  const updateMutation = useUpdatePettyCashMutation();
  const statusMutation = useUpdatePettyCashStatusMutation();
  const deleteMutation = useDeletePettyCashMutation();

  // Reset or initialize edit states when voucher changes
  useEffect(() => {
    if (voucher) {
      setEditPayee(voucher.payeeName);
      setEditAmount(voucher.amount);
      setEditDate(voucher.voucherDate);
      setEditCategory(voucher.category || "supplies");
      setEditDepartmentId(voucher.departmentId);
      setEditDepartmentIds(
        voucher.departments && voucher.departments.length > 0
          ? voucher.departments.map((d) => d.id)
          : voucher.departmentId
            ? [voucher.departmentId]
            : []
      );
      setEditReceiptNumber(voucher.receiptNumber || "");
      setEditPurchaseOrderNumber(voucher.purchaseOrderNumber || "");
      setEditSupplierName(voucher.supplierName || "");
      setEditPurpose(voucher.purpose || "");
      const parsed = parseParticulars(voucher.particulars);
      setEditListItems(
        parsed.length > 0 ? parsed : [{ description: "", amount: "" }]
      );
      setIsEditing(false);
    }
  }, [voucher]);

  if (!voucher) return null;

  const statusConfig = getStatusBadge(voucher.status);
  const StatusIcon = statusConfig.icon;
  const particularItems = parseParticulars(voucher.particulars);

  const handleEditItemChange = (
    index: number,
    field: keyof ParticularLineItem,
    val: string
  ) => {
    setEditListItems((prev) => {
      const updated = [...prev];
      const nextVal =
        field === "amount" ? (filterMoneyInput(val) ?? prev[index].amount) : val;
      updated[index] = { ...updated[index], [field]: nextVal };
      if (field === "amount") {
        const total = sumParticularAmounts(updated);
        if (total > 0) setEditAmount(total.toFixed(2));
      }
      return updated;
    });
  };

  const handleAddEditItem = () => {
    setEditListItems((prev) => [...prev, { description: "", amount: "" }]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditListItems((prev) => {
      if (prev.length <= 1) return [{ description: "", amount: "" }];
      const next = prev.filter((_, i) => i !== index);
      const total = sumParticularAmounts(next);
      if (total > 0) setEditAmount(total.toFixed(2));
      return next;
    });
  };

  const handleSaveEdit = async () => {
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid disbursement amount.");
      return;
    }

    const selectedDepts = editDepartmentIds
      .map((id) => departments.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    const selectedDept = selectedDepts[0];

    try {
      await updateMutation.mutateAsync({
        id: voucher.id,
        payload: {
          payeeName: editPayee.trim(),
          amount: numAmount.toFixed(2),
          voucherDate: editDate,
          category: editCategory,
          departmentId: selectedDept?.id || editDepartmentId || null,
          departmentName:
            selectedDepts.map((d) => d.name).join(", ") ||
            (selectedDept ? selectedDept.name : null),
          departmentIds: selectedDepts.map((d) => d.id),
          receiptNumber: editReceiptNumber.trim() || null,
          purchaseOrderNumber: editPurchaseOrderNumber.trim() || null,
          supplierName: editSupplierName.trim() || null,
          purpose: editPurpose.trim(),
          particulars: serializeParticulars(editListItems),
        },
      });

      toast.success("Petty cash voucher updated successfully.");
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update voucher.";
      toast.error(msg);
    }
  };

  const handleStatusTransition = async (nextStatus: PettyCashStatus) => {
    try {
      await statusMutation.mutateAsync({
        id: voucher.id,
        payload: { status: nextStatus },
      });
      toast.success(`Voucher status updated to "${nextStatus.replace("_", " ")}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    const code = voucher.pcvNumber;
    const id = voucher.id;

    await confirm({
      title: "Delete this petty cash voucher?",
      description: (
        <>
          <strong className="font-mono">{code}</strong> will be permanently
          removed from petty cash records. This cannot be undone.
        </>
      ),
      confirmLabel: "Delete voucher",
      cancelLabel: "Keep voucher",
      variant: "destructive",
      action: async () => {
        onClose();
        try {
          await deleteMutation.mutateAsync(id);
          toast.success(`Voucher ${code} was removed.`);
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Failed to delete voucher.";
          toast.error(msg);
        }
      },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer / Sheet Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full max-w-2xl bg-bg h-full shadow-2xl border-l border-border flex flex-col z-10 overflow-hidden"
          >
            {/* Sheet Header */}
            <div className="px-6 py-4 border-b border-border bg-bg-subtle/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text font-mono">
                      {voucher.pcvNumber}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
                        statusConfig.className
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Petty Cash Micro-Disbursement Voucher
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {voucher.status !== "completed" && voucher.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-2xs",
                      isEditing
                        ? "bg-primary text-white border-primary"
                        : "bg-bg text-text-secondary hover:text-text border-border hover:bg-bg-subtle"
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? "Cancel Edit" : "Edit"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  title="Delete voucher"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-destructive text-white hover:bg-destructive/90 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-bg-subtle transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contextual Workflow Action Banner */}
            {voucher.status === "draft" && (
              <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Draft voucher ready for review.</span>
                </div>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusTransition("pending_approval")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              </div>
            )}

            {voucher.status === "pending_approval" && (
              <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <Clock className="w-4 h-4 shrink-0 text-blue-500" />
                  <span>Awaiting property custodian / admin approval.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => handleStatusTransition("cancelled")}
                    className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => handleStatusTransition("approved")}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            )}

            {voucher.status === "approved" && (
              <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Approved for cash disbursement.</span>
                </div>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusTransition("completed")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark as Disbursed
                </button>
              </div>
            )}

            {/* Key Metadata Strip (4 Chips) */}
            <div className="px-6 py-3 bg-bg-subtle/30 border-b border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0">
              {/* Requester */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                  Created By
                </span>
                <span className="font-semibold text-text truncate block mt-0.5" title={voucher.createdByName}>
                  {voucher.createdByName}
                </span>
              </div>

              {/* Payee */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                  Payee / Claimant
                </span>
                <span className="font-semibold text-text truncate block mt-0.5" title={voucher.payeeName}>
                  {voucher.payeeName}
                </span>
              </div>

              {/* Amount */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                  Total Valuation
                </span>
                <span className="font-bold font-mono block mt-0.5 text-primary">
                  {formatPhp(voucher.amount)}
                </span>
              </div>

              {/* Issue Date */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                  Disbursed Date
                </span>
                <span className="font-semibold text-text block mt-0.5">
                  {voucher.voucherDate}
                </span>
              </div>
            </div>

            {/* Tabs Header */}
            <div className="px-6 border-b border-border flex items-center gap-4 shrink-0 bg-bg">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={cn(
                  "py-3 text-xs font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
                  activeTab === "details"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                Voucher Details & Breakdown
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("workflow")}
                className={cn(
                  "py-3 text-xs font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
                  activeTab === "workflow"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                Audit & Workflow History
              </button>
            </div>

            {/* Sheet Body with Scoped Scrolling */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === "details" && (
                <>
                  {/* Inline Edit Form Mode */}
                  {isEditing ? (
                    <div className="space-y-4 bg-bg-subtle/40 p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-text flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-primary" />
                          Edit Petty Cash Metadata
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-2.5 py-1 text-xs text-text-secondary hover:text-text bg-bg border border-border rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-2xs"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Save Changes
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Payee / Claimant
                          </label>
                          <input
                            type="text"
                            value={editPayee}
                            onChange={(e) => setEditPayee(e.target.value)}
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Disbursement Amount (PHP)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full text-xs font-mono font-semibold rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Disbursement Date
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Expense Category
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          >
                            {PETTY_CASH_CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Receipt / Ref #
                          </label>
                          <input
                            type="text"
                            value={editReceiptNumber}
                            onChange={(e) => setEditReceiptNumber(e.target.value)}
                            placeholder="e.g. OR #12345"
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Department
                          </label>
                          <MultiSelectDropdown
                            label="Departments"
                            icon={Building2}
                            variant="form"
                            searchable
                            selectedIds={editDepartmentIds}
                            onToggle={(id) => {
                              setEditDepartmentIds((prev) => {
                                const next = prev.includes(id)
                                  ? prev.filter((x) => x !== id)
                                  : [...prev, id];
                                setEditDepartmentId(next[0] || null);
                                return next;
                              });
                            }}
                            options={departments.map((d) => ({
                              id: d.id,
                              label: `${d.name} (${d.code})`,
                            }))}
                            placeholder="One or more departments…"
                            emptyMessage="No departments available"
                            triggerClassName="text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Attached Purchase Order #
                          </label>
                          <input
                            type="text"
                            value={editPurchaseOrderNumber}
                            onChange={(e) => setEditPurchaseOrderNumber(e.target.value)}
                            placeholder="e.g. 2026-0012"
                            className="w-full text-xs font-mono rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Supplier / Merchant
                          </label>
                          <input
                            type="text"
                            value={editSupplierName}
                            onChange={(e) => setEditSupplierName(e.target.value)}
                            placeholder="Store or vendor name"
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Purpose
                          </label>
                          <textarea
                            rows={3}
                            value={editPurpose}
                            onChange={(e) => setEditPurpose(e.target.value)}
                            placeholder="Brief purpose / justification..."
                            className="w-full text-xs rounded-md border border-border bg-bg px-2.5 py-1.5 text-text leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text mb-1 flex items-center gap-1.5">
                            <ListOrdered className="h-3.5 w-3.5" />
                            Particulars
                          </label>
                          <div className="rounded-md border border-border bg-bg-subtle/30 p-2 space-y-2">
                            <div className="grid grid-cols-[auto_minmax(0,1fr)_5.5rem_auto] gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                              <span className="w-6 text-center">#</span>
                              <span>Description</span>
                              <span className="text-right">Cost</span>
                              <span className="w-7" />
                            </div>
                            {editListItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-[auto_minmax(0,1fr)_5.5rem_auto] gap-1.5 items-center"
                              >
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-bg border border-border text-[10px] font-mono text-text-muted">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    handleEditItemChange(
                                      idx,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Item #${idx + 1}`}
                                  className="w-full text-xs rounded-md border border-border bg-bg px-2 py-1.5 text-text"
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.amount}
                                  onChange={(e) =>
                                    handleEditItemChange(
                                      idx,
                                      "amount",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full text-xs font-mono text-right rounded-md border border-border bg-bg px-2 py-1.5 text-text"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditItem(idx)}
                                  className="p-1 text-text-muted hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="flex justify-end pt-1 border-t border-border/50">
                              <button
                                type="button"
                                onClick={handleAddEditItem}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-text px-2 py-1 rounded border border-border bg-bg hover:bg-bg-subtle"
                              >
                                <Plus className="h-3 w-3" />
                                Add Item
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Standard View Card */}
                  <div className="bg-bg rounded-lg border border-border p-4 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-primary" />
                        Micro-Disbursement Information
                      </h3>
                      <div className="flex items-center gap-2">
                        {voucher.purchaseOrderNumber && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                            <Boxes className="w-3 h-3" />
                            PO #{voucher.purchaseOrderNumber}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                          {voucher.category}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[11px] text-text-muted block">Payee / Claimant:</span>
                        <span className="font-semibold text-text mt-0.5 block">{voucher.payeeName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted block">Total Disbursed:</span>
                        <span className="font-bold text-primary font-mono mt-0.5 block text-sm">
                          {formatPhp(voucher.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted block">Attached Purchase Order:</span>
                        {voucher.purchaseOrderNumber ? (
                          <span className="font-mono text-primary font-bold mt-0.5 flex items-center gap-1">
                            <Boxes className="w-3 h-3" />
                            #{voucher.purchaseOrderNumber}
                          </span>
                        ) : (
                          <span className="text-text-secondary mt-0.5 block italic">Direct micro-disbursement (No PO)</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted block">Supplier / Merchant:</span>
                        <span className="font-medium text-text mt-0.5 block">
                          {voucher.supplierName || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted block">Charging Department:</span>
                        <span className="font-medium text-text mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-text-muted" />
                          {(voucher.departments && voucher.departments.length > 0
                            ? voucher.departments.map((d) => d.name).join(", ")
                            : voucher.departmentName) || "General / None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted block">Supporting Receipt / Ref #:</span>
                        <span className="font-mono text-text mt-0.5 flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-text-muted" />
                          {voucher.receiptNumber || "None specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Purpose & Particulars Card */}
                  <div className="bg-bg rounded-lg border border-border p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        Purpose &amp; Particulars
                      </h3>
                      {particularItems.length > 0 ? (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          {particularItems.length} line item
                          {particularItems.length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted font-mono">
                          —
                        </span>
                      )}
                    </div>

                    {voucher.purpose?.trim() ? (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                          Purpose
                        </span>
                        <div className="text-xs text-text leading-relaxed whitespace-pre-line bg-bg-subtle/30 p-3 rounded-md border border-border/50">
                          {voucher.purpose}
                        </div>
                      </div>
                    ) : null}

                    {particularItems.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                          Particulars
                        </span>
                        {particularItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-md border border-border/60 bg-bg-subtle/20 p-2.5 text-xs"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span className="flex-1 font-medium text-text leading-relaxed">
                              {item.description}
                            </span>
                            {item.amount ? (
                              <span className="shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatPhp(item.amount)}
                              </span>
                            ) : null}
                          </div>
                        ))}
                        {sumParticularAmounts(particularItems) > 0 ? (
                          <div className="flex justify-between text-[11px] text-text-muted px-1 pt-0.5">
                            <span>Line items total</span>
                            <span className="font-mono font-bold text-text">
                              {formatPhp(sumParticularAmounts(particularItems))}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : !voucher.purpose?.trim() ? (
                      <p className="text-xs text-text-muted italic">
                        No purpose or particulars provided.
                      </p>
                    ) : null}
                  </div>
                </>
              )}

              {activeTab === "workflow" && (
                <div className="bg-bg rounded-lg border border-border p-4 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider border-b border-border pb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Workflow Timeline & Audit Log
                  </h3>

                  <div className="space-y-4 text-xs">
                    {/* Created Step */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">Created & Drafted</span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(voucher.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-text-secondary mt-0.5">
                          Initiated by <strong className="text-text">{voucher.createdByName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Approved Step */}
                    {voucher.approvedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text">Approved for Cash Disbursement</span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(voucher.approvedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-text-secondary mt-0.5">
                            Approved by <strong className="text-text">{voucher.approvedByName || "Admin"}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Completed / Disbursed Step */}
                    {voucher.completedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text">Cash Disbursed & Completed</span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(voucher.completedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-text-secondary mt-0.5">
                            Disbursed by <strong className="text-text">{voucher.completedByName || "Property Custodian"}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status is Cancelled */}
                    {voucher.status === "cancelled" && (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 shrink-0 mt-0.5">
                          <Ban className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-rose-600">Disbursement Cancelled / Rejected</span>
                          <p className="text-text-secondary mt-0.5">This transaction has been voided.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detailed System Activity & Audit Trail */}
                  <div className="pt-4 border-t border-border/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-primary" />
                          Detailed Change & Mutation History ({auditLogs.length})
                        </span>
                      </div>

                      {auditLogs.length > 0 ? (
                      <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden bg-bg">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="p-3 space-y-1 hover:bg-bg-subtle/30 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                                  log.action === "created" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                  log.action === "updated" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                  log.action === "approved" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                  log.action === "completed" && "bg-primary/10 text-primary border-primary/20",
                                  log.action === "cancelled" && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                                  !["created", "updated", "approved", "completed", "cancelled"].includes(log.action) && "bg-bg-subtle text-text-secondary border-border"
                                )}>
                                  {log.action.replace("_", " ")}
                                </span>
                                <span className="font-semibold text-xs text-text">
                                  {log.actorName}
                                </span>
                              </div>
                              <span className="text-[10px] text-text-muted font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>

                            {log.notes && (
                              <p className="text-xs text-text-secondary pl-0.5">
                                {log.notes}
                              </p>
                            )}

                            {Boolean(log.metadata && typeof log.metadata === "object") && (
                              <div className="text-[10px] text-text-muted font-mono bg-bg-subtle/60 px-2 py-1 rounded-md border border-border/40 mt-1">
                                {Object.entries(log.metadata as Record<string, unknown>)
                                  .filter(([key]) => key !== "changes")
                                  .map(([key, val]) => (
                                    <span key={key} className="mr-3 inline-block">
                                      <span className="text-text-secondary font-medium">{key}:</span> {String(val)}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      ) : (
                        <p className="text-xs text-text-secondary py-1">
                          No system mutation events recorded yet. Status and field edits will appear here after each save.
                        </p>
                      )}
                    </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
