"use client";

import React, { useState } from "react";
import {
  X,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Building2,
  Calendar,
  CreditCard,
  Printer,
  Trash2,
  Send,
  ShieldCheck,
  Check,
  Loader2,
  ArrowRight,
  Boxes,
  User,
} from "lucide-react";
import type { Voucher, VoucherStatus, VoucherType } from "@/types/vouchers";
import { formatPhp } from "@/components/projects/format-money";
import {
  useUpdateVoucherStatusMutation,
  useDeleteVoucherMutation,
} from "@/features/vouchers/client";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";

interface VoucherDetailSheetProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

function getStatusBadge(status: VoucherStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completed / Paid",
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

function getTypeBadge(type: VoucherType) {
  switch (type) {
    case "disbursement":
      return {
        label: "Disbursement Voucher",
        className: "bg-primary/10 text-primary border-primary/20",
      };
    case "property_transfer":
      return {
        label: "Property Transfer",
        className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "liquidation":
      return {
        label: "Liquidation Receipt",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
  }
}

export function VoucherDetailSheet({
  voucher,
  isOpen,
  onClose,
  onRefresh,
}: VoucherDetailSheetProps) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  const updateStatusMutation = useUpdateVoucherStatusMutation();
  const deleteMutation = useDeleteVoucherMutation();

  if (!isOpen || !voucher) return null;

  const statusInfo = getStatusBadge(voucher.status);
  const typeInfo = getTypeBadge(voucher.type);
  const StatusIcon = statusInfo.icon;

  const handleStatusChange = async (newStatus: VoucherStatus) => {
    setActionLoading(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: voucher.id,
        payload: { status: newStatus },
      });
      toast.success(`Voucher marked as ${newStatus.replace("_", " ")}.`);
      onRefresh?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update voucher status.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this draft voucher?")) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteMutation.mutateAsync(voucher.id);
      toast.success("The draft voucher was removed.");
      onRefresh?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete voucher.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl flex flex-col bg-bg border-l border-border shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-border bg-bg-subtle/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", statusInfo.className)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusInfo.label}
                </span>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", typeInfo.className)}>
                  {typeInfo.label}
                </span>
                {voucher.isLegacy && (
                  <span className="inline-flex items-center rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-bold text-text-secondary uppercase">
                    Legacy
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-mono font-bold tracking-tight text-text">
                  {voucher.voucherCode}
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Issued on {voucher.voucherDate}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
                  Amount
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPhp(voucher.amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Payee & Payment Info Card */}
            <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Payee / Disbursed To
              </div>
              <div className="text-base font-bold text-text">
                {voucher.payeeName}
              </div>
              {voucher.supplierName && voucher.supplierName !== voucher.payeeName && (
                <div className="text-xs text-text-secondary flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Supplier: {voucher.supplierName}
                </div>
              )}

              {voucher.checkNumber && (
                <div className="pt-2 border-t border-border/60 text-xs">
                  <span className="text-text-secondary">Check / Ref No.:</span>{" "}
                  <span className="font-mono font-semibold text-text">
                    {voucher.checkNumber}
                  </span>
                </div>
              )}
            </div>

            {/* References Card (PO / Asset) */}
            {(voucher.purchaseOrderNumber || voucher.assetCode) && (
              <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Associated References
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {voucher.purchaseOrderNumber && (
                    <div className="rounded-xl border border-border bg-bg p-3">
                      <div className="flex items-center gap-1.5 text-text-secondary mb-1">
                        <Boxes className="h-3.5 w-3.5 text-primary" />
                        <span>Purchase Order</span>
                      </div>
                      <div className="font-mono font-bold text-text">
                        #{voucher.purchaseOrderNumber}
                      </div>
                    </div>
                  )}

                  {voucher.assetCode && (
                    <div className="rounded-xl border border-border bg-bg p-3">
                      <div className="flex items-center gap-1.5 text-text-secondary mb-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Asset Reference</span>
                      </div>
                      <div className="font-mono font-bold text-text">
                        {voucher.assetCode}
                      </div>
                      {voucher.assetName && (
                        <div className="mt-0.5 text-[11px] text-text-secondary truncate">
                          {voucher.assetName}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Particulars Card */}
            <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Particulars / Notes
              </div>
              <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                {voucher.particulars || "No particulars provided."}
              </p>
            </div>

            {/* Audit & Workflow Trail */}
            <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Workflow &amp; Audit Trail
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-text">
                    <User className="h-3.5 w-3.5 text-text-secondary" />
                    <span>Created by:</span>
                  </div>
                  <span className="font-medium text-text">
                    {voucher.createdByName}
                  </span>
                </div>

                {voucher.approvedByName && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Approved by:</span>
                    </div>
                    <span className="font-medium text-text">
                      {voucher.approvedByName}
                    </span>
                  </div>
                )}

                {voucher.completedByName && (
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Disbursed by:</span>
                    </div>
                    <span className="font-medium text-text">
                      {voucher.completedByName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar / Workflow Transitions */}
          <div className="p-4 border-t border-border bg-bg-subtle/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-text hover:bg-bg-subtle transition-colors shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>

              {voucher.status === "draft" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Workflow status progression buttons */}
            <div className="flex items-center gap-2">
              {voucher.status === "draft" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("pending_approval")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Submit for Approval</span>
                </button>
              )}

              {voucher.status === "pending_approval" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("cancelled")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("approved")}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    <span>Approve Voucher</span>
                  </button>
                </>
              )}

              {voucher.status === "approved" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("cancelled")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("completed")}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Mark Completed / Paid</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
