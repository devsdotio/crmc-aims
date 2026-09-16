"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Trash2,
  Send,
  ShieldCheck,
  Check,
  Loader2,
  ArrowRight,
  Boxes,
  User,
  ArrowUpRight,
  ExternalLink,
  Laptop,
  Sparkles,
  Copy,
  Edit3,
  Save,
  Undo2,
} from "lucide-react";
import type { Voucher, VoucherStatus, VoucherType } from "@/types/vouchers";
import { formatPhp } from "@/components/projects/format-money";
import {
  useUpdateVoucherStatusMutation,
  useUpdateVoucherMutation,
  useDeleteVoucherMutation,
} from "@/features/vouchers/client";
import { useUsersQuery } from "@/features/users/client";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";

interface VoucherDetailSheetProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: VoucherStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completed / Paid",
        className:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
      };
    case "approved":
      return {
        label: "Approved",
        className:
          "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
        icon: ShieldCheck,
      };
    case "pending_approval":
      return {
        label: "Pending Approval",
        className:
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: Clock,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className:
          "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: Ban,
      };
    case "draft":
    default:
      return {
        label: "Draft",
        className:
          "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
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
        className:
          "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "liquidation":
      return {
        label: "Liquidation Receipt",
        className:
          "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
  }
}

function getRoleBadgeStyle(role?: string) {
  switch (role) {
    case "superadmin":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
    case "admin":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "borrower":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "staff":
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export function VoucherDetailSheet({
  voucher,
  isOpen,
  onClose,
  onRefresh,
}: VoucherDetailSheetProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    "details" | "references" | "workflow"
  >("details");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    voucherCode: "",
    payeeName: "",
    amount: "",
    voucherDate: "",
    checkNumber: "",
    supplierName: "",
    purchaseOrderNumber: "",
    assetCode: "",
    particulars: "",
  });

  const updateStatusMutation = useUpdateVoucherStatusMutation();
  const updateVoucherMutation = useUpdateVoucherMutation();
  const deleteMutation = useDeleteVoucherMutation();

  const { data: users = [] } = useUsersQuery();
  const { data: purchaseLots = [] } = usePurchaseLotsQuery();

  // Handle escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  // Sync edit form on voucher change
  useEffect(() => {
    if (voucher) {
      setEditForm({
        voucherCode: voucher.voucherCode,
        payeeName: voucher.payeeName,
        amount: voucher.amount,
        voucherDate: voucher.voucherDate,
        checkNumber: voucher.checkNumber || "",
        supplierName: voucher.supplierName || "",
        purchaseOrderNumber: voucher.purchaseOrderNumber || "",
        assetCode: voucher.assetCode || "",
        particulars: voucher.particulars || "",
      });
      setIsEditing(false);
      setActiveTab("details");
    }
  }, [voucher]);

  const matchedUser = useMemo(() => {
    if (!voucher) return null;
    return (
      users.find(
        (u) =>
          (voucher.createdByUserId && u.id === voucher.createdByUserId) ||
          (voucher.createdByName &&
            u.name.toLowerCase() === voucher.createdByName.toLowerCase()),
      ) ?? null
    );
  }, [users, voucher]);

  const linkedLot = useMemo(() => {
    if (!voucher?.purchaseOrderNumber) return null;
    const cleanPo = voucher.purchaseOrderNumber.trim().toLowerCase();
    return (
      purchaseLots.find(
        (lot) =>
          (lot.poNumber && lot.poNumber.trim().toLowerCase() === cleanPo) ||
          lot.lotCode.trim().toLowerCase() === cleanPo,
      ) ?? null
    );
  }, [purchaseLots, voucher]);

  if (!isOpen || !voucher) return null;

  const particularsDeptMatch = voucher.particulars?.match(/^\[(.*?)\]/);
  const extractedDeptFromParticulars = particularsDeptMatch
    ? particularsDeptMatch[1].trim()
    : null;

  const lotDeptMatch = linkedLot?.purpose?.match(/^\[(.*?)\]/);
  const extractedDeptFromLot = lotDeptMatch ? lotDeptMatch[1].trim() : null;

  const displayRequesterName =
    voucher.createdByName?.trim() || matchedUser?.name || "Authorized Staff";

  const displayDepartment =
    extractedDeptFromParticulars ||
    extractedDeptFromLot ||
    matchedUser?.department?.trim() ||
    "Property & Supply Management";

  const displayRole = (() => {
    const role = matchedUser?.role;
    if (role === "superadmin") return "Superadmin";
    if (role === "admin") return "Property Custodian / Admin";
    if (role === "borrower") return "Department Custodian";
    if (role === "staff") return "Staff Requester";
    return "Disbursing Officer";
  })();

  const cleanParticulars = (() => {
    if (!voucher.particulars) return "";
    if (particularsDeptMatch) {
      return voucher.particulars.replace(/^\[(.*?)\]\s*/, "").trim();
    }
    return voucher.particulars;
  })();

  const statusInfo = getStatusBadge(voucher.status);
  const typeInfo = getTypeBadge(voucher.type);
  const StatusIcon = statusInfo.icon;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucher.voucherCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

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
      const msg =
        err instanceof Error ? err.message : "Failed to update voucher status.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.payeeName.trim()) {
      toast.error("Payee name is required.");
      return;
    }

    setActionLoading(true);
    try {
      await updateVoucherMutation.mutateAsync({
        id: voucher.id,
        payload: {
          voucherCode: editForm.voucherCode.trim() || undefined,
          payeeName: editForm.payeeName.trim(),
          amount: editForm.amount.trim() || "0",
          voucherDate: editForm.voucherDate,
          checkNumber: editForm.checkNumber.trim() || null,
          supplierName: editForm.supplierName.trim() || null,
          purchaseOrderNumber: editForm.purchaseOrderNumber.trim() || null,
          assetCode: editForm.assetCode.trim() || null,
          particulars: editForm.particulars.trim(),
        },
      });
      toast.success("Voucher updated successfully.");
      setIsEditing(false);
      onRefresh?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update voucher.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("Are you sure you want to delete this draft voucher?")
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteMutation.mutateAsync(voucher.id);
      toast.success("The draft voucher was removed.");
      onRefresh?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete voucher.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-xl h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out",
        )}
      >
        {/* Panel Header */}
        <div className="border-b border-border bg-bg-subtle/50 shrink-0 p-5 space-y-3.5">
          {/* Top Controls & Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Disbursement Voucher
              </span>
              <span className="text-text-secondary/40">•</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs",
                  statusInfo.className,
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-2xs",
                  typeInfo.className,
                )}
              >
                {typeInfo.label}
              </span>
              {voucher.isLegacy && (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Legacy Entry
                </span>
              )}
            </div>

            {/* Header Right Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                title={isEditing ? "Cancel edit mode" : "Edit voucher details"}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shadow-2xs",
                  isEditing
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-bg text-text hover:bg-bg-subtle hover:border-primary/40",
                )}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{isEditing ? "Cancel Edit" : "Edit"}</span>
              </button>

              {voucher.status === "draft" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  title="Delete Draft Voucher"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Row: Voucher Code & Disbursed Amount */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <h2
                id="voucher-detail-heading"
                className="font-mono text-xl font-bold tracking-tight text-text truncate"
              >
                {voucher.voucherCode}
              </h2>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy Voucher Code"
                className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer shrink-0"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Total Valuation Chip */}
            <div className="text-right shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-bold block">
                Disbursed Valuation
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatPhp(voucher.amount)}
              </span>
            </div>
          </div>

          {/* Key Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-xs">
            {/* Requester Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/20 bg-primary/5 min-w-0">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                  Requester
                </span>
                <span
                  className="font-semibold text-text truncate block text-xs"
                  title={displayRequesterName}
                >
                  {displayRequesterName}
                </span>
                <span
                  className="text-[10px] text-text-secondary truncate block"
                  title={`${displayDepartment} · ${displayRole}`}
                >
                  {displayDepartment}
                </span>
              </div>
            </div>

            {/* Payee Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                  Payee
                </span>
                <span
                  className="font-semibold text-text truncate block text-xs"
                  title={voucher.payeeName}
                >
                  {voucher.payeeName}
                </span>
                <span className="text-[10px] text-text-secondary truncate block">
                  {voucher.supplierName || "Direct Payee"}
                </span>
              </div>
            </div>

            {/* Total Cost Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-sm font-mono">
                ₱
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                  Total Amount
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-xs truncate">
                  {formatPhp(voucher.amount)}
                </span>
              </div>
            </div>

            {/* Issued Date Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                  Issued Date
                </span>
                <span className="font-medium text-text block text-xs truncate">
                  {voucher.voucherDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contextual Workflow CTA Banner */}
          <div
            className={cn(
              "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors",
              voucher.status === "completed"
                ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15"
                : voucher.status === "approved"
                  ? "border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15"
                  : voucher.status === "pending_approval"
                    ? "border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15"
                    : voucher.status === "cancelled"
                      ? "border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/15"
                      : "border-primary/30 bg-primary/10 dark:bg-primary/15",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                  voucher.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : voucher.status === "approved"
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      : voucher.status === "pending_approval"
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : voucher.status === "cancelled"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-primary/20 text-primary border border-primary/30",
                )}
              >
                {voucher.status === "draft" && <FileText className="h-4 w-4" />}
                {voucher.status === "pending_approval" && (
                  <Clock className="h-4 w-4" />
                )}
                {voucher.status === "approved" && (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {voucher.status === "completed" && (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {voucher.status === "cancelled" && <Ban className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text truncate">
                  {voucher.status === "draft" &&
                    "Draft Voucher — Submit for Custodian Approval"}
                  {voucher.status === "pending_approval" &&
                    "Pending Approval — Authorize Disbursing Voucher"}
                  {voucher.status === "approved" &&
                    "Approved — Ready for Cashier Disbursement & Payment"}
                  {voucher.status === "completed" &&
                    "Completed & Paid — Disbursement Finalized"}
                  {voucher.status === "cancelled" && "Voucher Void / Cancelled"}
                </p>
                <p className="text-[10px] text-text-secondary truncate">
                  {voucher.status === "draft" &&
                    "Ready for administrative review and signature routing"}
                  {voucher.status === "pending_approval" &&
                    "Custodian review required before releasing funds"}
                  {voucher.status === "approved" &&
                    "Cashier payment release and liquidation tracking"}
                  {voucher.status === "completed" &&
                    "All financial disbursement transactions concluded"}
                  {voucher.status === "cancelled" &&
                    "This disbursement record is permanently closed"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {voucher.status === "draft" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("pending_approval")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit</span>
                </button>
              )}
              {voucher.status === "pending_approval" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("cancelled")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("approved")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                </>
              )}
              {voucher.status === "approved" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("cancelled")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("completed")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Disburse / Pay</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-bg-subtle/40 px-6 shrink-0 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("details");
            }}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "details"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary hover:text-text",
            )}
          >
            <FileText className="h-4 w-4" />
            <span>{isEditing ? "Edit Form" : "Details"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("references");
            }}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "references"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary hover:text-text",
            )}
          >
            <Boxes className="h-4 w-4" />
            <span>References &amp; Items</span>
            {(voucher.purchaseOrderNumber || voucher.assetCode) && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {(voucher.purchaseOrderNumber ? 1 : 0) +
                  (voucher.assetCode ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("workflow");
            }}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "workflow"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary hover:text-text",
            )}
          >
            <Clock className="h-4 w-4" />
            <span>Workflow &amp; Audit</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS & EDIT FORM */}
          {activeTab === "details" &&
            (isEditing ? (
              /* EDIT MODE FORM */
              <div className="rounded-2xl border border-primary/30 bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-text uppercase tracking-wider">
                      Edit Voucher Information
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Modifying {voucher.voucherCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Voucher Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Voucher Code / Number
                    </label>
                    <input
                      type="text"
                      value={editForm.voucherCode}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          voucherCode: e.target.value,
                        }))
                      }
                      className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Voucher Date */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Voucher Date
                    </label>
                    <input
                      type="date"
                      value={editForm.voucherDate}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          voucherDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Payee Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Payee / Disbursed To{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.payeeName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          payeeName: e.target.value,
                        }))
                      }
                      placeholder="Individual or entity name"
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Amount (₱) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="w-full font-mono font-semibold rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Check / Reference Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Check / Reference Number
                    </label>
                    <input
                      type="text"
                      value={editForm.checkNumber}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          checkNumber: e.target.value,
                        }))
                      }
                      placeholder="Check or deposit transaction ref"
                      className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Supplier Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Supplier / Dealer Name
                    </label>
                    <input
                      type="text"
                      value={editForm.supplierName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          supplierName: e.target.value,
                        }))
                      }
                      placeholder="Associated supplier firm"
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Linked Purchase Order Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Linked Purchase Order #
                    </label>
                    <input
                      type="text"
                      value={editForm.purchaseOrderNumber}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          purchaseOrderNumber: e.target.value,
                        }))
                      }
                      placeholder="PO-YYYY-XXXX"
                      className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Linked Asset Code */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Linked Asset Code
                    </label>
                    <input
                      type="text"
                      value={editForm.assetCode}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          assetCode: e.target.value,
                        }))
                      }
                      placeholder="AST-YYYY-XXXX"
                      className="w-full font-mono rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Particulars */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Particulars / Explanatory Notes
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.particulars}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        particulars: e.target.value,
                      }))
                    }
                    placeholder="Enter itemized requisition or accounting notes..."
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                  />
                </div>

                {/* Save / Cancel Edit Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD DETAILS VIEW */
              <div className="space-y-6">
                {/* Payee & Disbursement Beneficiary Card */}
                <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Payee &amp; Disbursement Beneficiary
                    </div>
                    {voucher.supplierName && (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Accredited Supplier
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-text">
                        {voucher.payeeName}
                      </div>
                      {voucher.supplierName &&
                        voucher.supplierName !== voucher.payeeName && (
                          <div className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5">
                            <Building2 className="h-3.5 w-3.5 text-text-secondary" />
                            <span>
                              Supplier:{" "}
                              <strong className="text-text font-medium">
                                {voucher.supplierName}
                              </strong>
                            </span>
                          </div>
                        )}
                    </div>

                    {voucher.checkNumber && (
                      <div className="sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block tracking-wider mb-0.5">
                          Check / Reference
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                          <CreditCard className="h-3.5 w-3.5" />
                          {voucher.checkNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Requester & Department Details Card */}
                <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Requester &amp; Department Details
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs",
                        getRoleBadgeStyle(matchedUser?.role),
                      )}
                    >
                      {displayRole}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">
                        Requested By
                      </span>
                      <p className="font-bold text-text text-sm flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{displayRequesterName}</span>
                      </p>
                      {matchedUser?.email ? (
                        <span className="text-[10px] text-text-secondary font-mono truncate block">
                          {matchedUser.email}
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-secondary block">
                          CRMC-AIMS Staff Account
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">
                        Department / Office
                      </span>
                      <p className="font-semibold text-text text-sm flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{displayDepartment}</span>
                      </p>
                      <span className="text-[10px] text-text-secondary block">
                        Requisitioning Unit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Particulars Card */}
                {(() => {
                  const rawContent =
                    cleanParticulars || voucher.particulars || "";
                  const lines = rawContent
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);
                  const isNumberedList =
                    lines.length > 0 &&
                    lines.every((l) => /^\d+[\.\)]\s*/.test(l));

                  return (
                    <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3.5 shadow-2xs">
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span>Particulars &amp; Notes</span>
                        </div>
                        {lines.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary">
                            {isNumberedList
                              ? `${lines.length} Line Items`
                              : "Narrative Entry"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary italic">
                            Unspecified
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      {lines.length > 0 ? (
                        isNumberedList ? (
                          <div className="space-y-2">
                            {lines.map((line, idx) => {
                              const match = line.match(/^(\d+)[\.\)]\s*(.*)$/);
                              const itemNumber = match ? match[1] : `${idx + 1}`;
                              const itemText = match ? match[2] : line;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-bg p-2.5 text-xs text-text transition-colors hover:border-primary/40 hover:bg-bg-subtle/40"
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[10px] font-bold text-primary">
                                    {itemNumber}
                                  </span>
                                  <span className="flex-1 font-medium leading-relaxed pt-0.5">
                                    {itemText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/70 bg-bg p-3.5 text-xs text-text leading-relaxed font-medium whitespace-pre-wrap">
                            {rawContent}
                          </div>
                        )
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-bg/50 p-4 text-center">
                          <p className="text-xs italic text-text-secondary">
                            No particulars or explanatory notes recorded for
                            this voucher.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}

          {/* TAB 2: REFERENCES & PO LINE ITEMS */}
          {activeTab === "references" && (
            <div className="space-y-6">
              {/* Associated References Links */}
              {voucher.purchaseOrderNumber || voucher.assetCode ? (
                <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-primary" />
                      <span>Associated System References</span>
                    </div>
                    <span className="text-[10px] text-text-secondary">
                      Click to inspect records
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {voucher.purchaseOrderNumber && (
                      <Link
                        href={`/purchase-orders?search=${encodeURIComponent(voucher.purchaseOrderNumber)}`}
                        className="group rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all p-3.5 flex flex-col justify-between block cursor-pointer shadow-xs hover:shadow-sm"
                        title="Open Purchase Order in PO Module"
                      >
                        <div>
                          <div className="flex items-center justify-between text-text-secondary mb-1.5">
                            <div className="flex items-center gap-1.5 text-primary font-semibold text-xs">
                              <Boxes className="h-3.5 w-3.5" />
                              <span>Purchase Order</span>
                            </div>
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                              <span>Open PO</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className="font-mono font-bold text-sm text-text">
                            #{voucher.purchaseOrderNumber}
                          </div>
                          {linkedLot && (
                            <div className="mt-1 text-[11px] text-text-secondary flex items-center gap-1.5">
                              <span className="truncate">
                                {linkedLot.supplierName || "Internal / Direct"}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                {formatPhp(
                                  parseFloat(linkedLot.totalCost) || 0,
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-primary/15 flex items-center justify-between text-[10px] text-text-secondary">
                          <span className="uppercase tracking-wider font-medium">
                            Fulfillment Order
                          </span>
                          <span className="text-primary font-medium group-hover:underline">
                            View in POs →
                          </span>
                        </div>
                      </Link>
                    )}

                    {voucher.assetCode && (
                      <Link
                        href={`/assets?search=${encodeURIComponent(voucher.assetCode)}`}
                        className="group rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all p-3.5 flex flex-col justify-between block cursor-pointer shadow-xs hover:shadow-sm"
                        title="Open Asset in Inventory Module"
                      >
                        <div>
                          <div className="flex items-center justify-between text-text-secondary mb-1.5">
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                              <Laptop className="h-3.5 w-3.5" />
                              <span>Asset Reference</span>
                            </div>
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                              <span>Open Asset</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className="font-mono font-bold text-sm text-text">
                            {voucher.assetCode}
                          </div>
                          {voucher.assetName && (
                            <div className="mt-1 text-[11px] text-text-secondary truncate">
                              {voucher.assetName}
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-indigo-500/15 flex items-center justify-between text-[10px] text-text-secondary">
                          <span className="uppercase tracking-wider font-medium">
                            Fixed Asset Inventory
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                            View in Assets →
                          </span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-subtle/20 p-8 text-center space-y-2">
                  <Boxes className="h-8 w-8 text-text-secondary/40 mx-auto" />
                  <h4 className="text-sm font-semibold text-text">
                    No Associated System References
                  </h4>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    This voucher was recorded as a direct or standalone
                    disbursement without an active Purchase Order or Fixed Asset
                    code.
                  </p>
                </div>
              )}

              {/* Linked PO Line Items Breakdown Table */}
              {linkedLot && (
                <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Linked Purchase Order Line Items</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      PO Total:{" "}
                      {formatPhp(parseFloat(linkedLot.totalCost) || 0)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-bg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-bg-subtle text-text-secondary border-b border-border font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Item Name</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">
                            Unit Acquisition
                          </th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr className="hover:bg-bg-subtle/50 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-text">
                            <div>{linkedLot.itemName}</div>
                            <span className="font-mono text-[10px] text-text-secondary">
                              Code: {linkedLot.itemCode}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-semibold text-text">
                            {linkedLot.quantity}{" "}
                            {linkedLot.itemType === "asset" ? "unit(s)" : "pcs"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-text">
                            {formatPhp(parseFloat(linkedLot.unitCost) || 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatPhp(parseFloat(linkedLot.totalCost) || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORKFLOW & AUDIT TRAIL */}
          {activeTab === "workflow" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Sequential Workflow Timeline</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Step 1: Created */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-bg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-text block">
                          Step 1: Voucher Inception
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          Issued on {voucher.voucherDate}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text">
                        {voucher.createdByName}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {displayDepartment} · {displayRole}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Approved */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-colors",
                      voucher.approvedByName
                        ? "border-blue-500/30 bg-blue-500/5"
                        : "border-border/60 bg-bg opacity-75",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          voucher.approvedByName
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-bg-subtle text-text-secondary/50",
                        )}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-text block">
                          Step 2: Property Custodian Approval
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {voucher.approvedAt
                            ? formatDateTime(voucher.approvedAt)
                            : "Awaiting Administrative Review"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {voucher.approvedByName ? (
                        <>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {voucher.approvedByName}
                          </div>
                          <div className="text-[10px] text-text-secondary">
                            Verified Sign-off
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] italic text-text-secondary">
                          Pending Sign-off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Disbursed / Paid */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-colors",
                      voucher.completedByName
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border/60 bg-bg opacity-75",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          voucher.completedByName
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-bg-subtle text-text-secondary/50",
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-text block">
                          Step 3: Cashier Disbursing / Settlement
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {voucher.completedAt
                            ? formatDateTime(voucher.completedAt)
                            : "Awaiting Fund Release"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {voucher.completedByName ? (
                        <>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {voucher.completedByName}
                          </div>
                          <div className="text-[10px] text-text-secondary">
                            Disbursed / Paid
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] italic text-text-secondary">
                          Pending Payment
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer Action Bar */}
        <div className="p-4 border-t border-border bg-bg-subtle/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {voucher.status === "draft" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("approved")}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("completed")}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
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
      </aside>
    </div>
  );
}
