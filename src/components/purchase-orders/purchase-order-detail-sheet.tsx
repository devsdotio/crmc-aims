"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FileText,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Send,
  Tag,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Ban,
  Building2,
  User,
  History,
  QrCode,
  AlertCircle,
  Loader2,
  Trash2,
  X,
  Edit3,
  Layers,
  Calendar,
  Boxes,
  ArrowUpRight,
  Receipt,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseLot, PurchaseOrderStatus } from "@/types/purchase-lots";
import { formatPhp } from "@/components/projects/format-money";
import {
  useUpdatePOStatusMutation,
  useUpdatePurchaseOrderMutation,
} from "@/features/purchase-lots/client";
import { useAuditLogsQuery } from "@/features/audit-logs/client";
import { useUsersQuery } from "@/features/users/client";
import { formatDateTime, formatRelativeTime } from "@/components/audit-logs/audit-log-utils";
import { useToast } from "@/components/providers/toast-context";
import { POReceiptUploader } from "./po-receipt-uploader";
import { PoDisbursementBadge } from "./po-disbursement-badge";

interface PurchaseOrderDetailSheetProps {
  lot: PurchaseLot | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintSlip: (lot: PurchaseLot) => void;
  onPrintTag?: (lot: PurchaseLot) => void;
  onReleaseStock?: (lot: PurchaseLot) => void;
  onDelete?: (lot: PurchaseLot) => void;
  canOperate?: boolean;
}

const WORKFLOW_STEPS: Array<{
  status: PurchaseOrderStatus;
  label: string;
  desc: string;
  icon: typeof Clock;
}> = [
  {
    status: "pending_approval",
    label: "Draft / Pending",
    desc: "Awaiting Custodian review",
    icon: Clock,
  },
  {
    status: "approved",
    label: "Approved",
    desc: "Ready for supplier issuance",
    icon: ShieldCheck,
  },
  {
    status: "ordered",
    label: "Ordered",
    desc: "In transit from vendor",
    icon: Truck,
  },
  {
    status: "delivered",
    label: "Delivered",
    desc: "Received & stocked in inventory",
    icon: PackageCheck,
  },
];

export function PurchaseOrderDetailSheet({
  lot,
  isOpen,
  onClose,
  onPrintSlip,
  onPrintTag,
  onReleaseStock,
  onDelete,
  canOperate = false,
}: PurchaseOrderDetailSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"specs" | "receipt" | "workflow" | "qr">("specs");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [receivedQuantity, setReceivedQuantity] = useState("");
  const [deliveryReceiptUrl, setDeliveryReceiptUrl] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<PurchaseOrderStatus | null>(null);
  const [isEditingPoNumber, setIsEditingPoNumber] = useState(false);
  const [editablePoNumber, setEditablePoNumber] = useState("");

  const updateStatusMutation = useUpdatePOStatusMutation();
  const updatePOMutation = useUpdatePurchaseOrderMutation();
  const toast = useToast();

  const handleRemoveReceipt = async () => {
    if (!lot) return;
    try {
      await updatePOMutation.mutateAsync({
        id: lot.id,
        payload: { receiptUrl: null },
      });
      toast.success("Receipt removed from purchase order.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove receipt.");
    }
  };

  const entityCode = lot ? lot.poNumber || lot.lotCode : "";
  const { data: auditLogs = [] } = useAuditLogsQuery({
    entityId: entityCode,
    entityType: "purchase_order",
    enabled: Boolean(entityCode),
  });
  const { data: users = [] } = useUsersQuery();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lot) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lot.poNumber || lot.lotCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const payload = lot.qrPayload?.trim() || `CRMC-AIMS-LOT:${lot.lotCode.trim()}`;
  const totalCostNum = parseFloat(lot.totalCost) || 0;
  const unitCostNum = parseFloat(lot.unitCost) || 0;
  const consumedUnits = Math.max(0, lot.quantity - lot.quantityRemaining);
  const remainingValue = lot.quantityRemaining * unitCostNum;
  const remainingRatio = lot.quantity > 0 ? (lot.quantityRemaining / lot.quantity) * 100 : 0;
  const isDepleted = lot.status === "delivered" && lot.quantityRemaining === 0;
  const isLowStock = lot.status === "delivered" && !isDepleted && remainingRatio <= 20;
  const poDate = lot.purchasedOn || lot.createdAt.split("T")[0];
  const isMultiItem = Boolean(lot.items && lot.items.length > 1);
  const totalLineItems = lot.items?.length || 1;
  const aggregateTotalCost = isMultiItem
    ? lot.items!.reduce((acc, item) => acc + (parseFloat(item.totalCost) || 0), 0)
    : totalCostNum;
  const aggregateTotalQuantity = isMultiItem
    ? lot.items!.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : lot.quantity;

  const uniqueDealers = Array.from(
    new Set(
      (lot.items && lot.items.length > 0
        ? lot.items.map((i) => i.suggestedDealer?.trim())
        : [lot.supplierName?.trim()]
      ).filter((d): d is string => Boolean(d))
    )
  );
  const displayDealer =
    uniqueDealers.length === 0
      ? "Internal / Direct"
      : uniqueDealers.length === 1
      ? uniqueDealers[0]
      : `Multiple Dealers (${uniqueDealers.length})`;

  const currentStepIdx = WORKFLOW_STEPS.findIndex((s) => s.status === lot.status);
  const isApproved =
    lot.status === "approved" ||
    lot.status === "ordered" ||
    lot.status === "delivered";

  const matchedUser =
    users.find(
      (u) =>
        (lot.recordedByUserId && u.id === lot.recordedByUserId) ||
        (lot.recordedByName && u.name.toLowerCase() === lot.recordedByName.toLowerCase())
    ) ?? null;

  const purposeDeptMatch = lot.purpose?.match(/^\[(.*?)\]/);
  const extractedDeptFromPurpose = purposeDeptMatch ? purposeDeptMatch[1].trim() : null;

  const displayRequesterName =
    lot.recordedByName?.trim() || matchedUser?.name || "Authorized Staff";

  const displayDepartment =
    lot.departmentName?.trim() ||
    extractedDeptFromPurpose ||
    matchedUser?.department?.trim() ||
    "General Administration";

  const displayRole = (() => {
    const role = matchedUser?.role;
    if (role === "superadmin") return "Superadmin";
    if (role === "admin") return "Property Custodian / Admin";
    if (role === "borrower") return "Department Custodian";
    if (role === "staff") return "Staff Requester";
    return "Staff Requester";
  })();

  const cleanPurpose = (() => {
    if (!lot.purpose) return "General Operations Replenishment";
    if (purposeDeptMatch) {
      const remainder = lot.purpose.replace(/^\[(.*?)\]\s*/, "").trim();
      return remainder || "General Operations Replenishment";
    }
    return lot.purpose;
  })();

  const handleTransitionStatus = async (nextStatus: PurchaseOrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      const parsedReceived =
        nextStatus === "delivered" && lot.itemType === "consumable"
          ? Number.parseInt(receivedQuantity || String(lot.quantity), 10)
          : undefined;

      if (
        nextStatus === "delivered" &&
        lot.itemType === "consumable" &&
        (!Number.isFinite(parsedReceived) || (parsedReceived ?? 0) < 1)
      ) {
        toast.error("Enter a valid received quantity (at least 1).");
        setIsUpdatingStatus(false);
        return;
      }

      await updateStatusMutation.mutateAsync({
        id: lot.id,
        payload: {
          status: nextStatus,
          notes: statusNote.trim() || undefined,
          receivedQuantity: parsedReceived,
          receiptUrl: deliveryReceiptUrl || undefined,
        },
      });
      toast.success(
        nextStatus === "delivered" && parsedReceived != null
          ? lot.projectId
            ? `PO ${lot.poNumber || lot.lotCode} delivered · ${parsedReceived} material unit(s) credited directly to ${lot.projectName || "project"}.`
            : `PO ${lot.poNumber || lot.lotCode} delivered · ${parsedReceived} unit(s) added to inventory.`
          : `PO ${lot.poNumber || lot.lotCode} updated to ${nextStatus.replace("_", " ")}.`
      );
      setShowStatusModal(null);
      setStatusNote("");
      setReceivedQuantity("");
      setDeliveryReceiptUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSavePoNumber = async () => {
    const trimmed = editablePoNumber.trim();
    if (!trimmed) {
      toast.error("PO Number cannot be empty.");
      return;
    }
    try {
      await updatePOMutation.mutateAsync({
        id: lot.id,
        payload: { poNumber: trimmed },
      });
      toast.success(`Purchase Order number updated to "${trimmed}".`);
      setIsEditingPoNumber(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update PO number.");
    }
  };

  const canRelease =
    canOperate &&
    lot.status === "delivered" &&
    lot.itemType === "consumable" &&
    lot.quantityRemaining > 0 &&
    Boolean(onReleaseStock);

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="po-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-xl h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="border-b border-border bg-bg-subtle/50 shrink-0 p-5 space-y-3.5">
          {/* Top Controls & Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Purchase Order
              </span>
              <span className="text-text-secondary/40">•</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-2xs",
                  lot.itemType === "asset"
                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25"
                    : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25"
                )}
              >
                {lot.itemType}
              </span>

              {/* Status Badge */}
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize flex items-center gap-1 shadow-2xs",
                  lot.status === "delivered"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : lot.status === "ordered"
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                    : lot.status === "approved"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    : lot.status === "cancelled"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                    : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {lot.status.replace("_", " ")}
              </span>

              <PoDisbursementBadge
                disbursement={lot.disbursement}
                showCode
              />

            </div>

            {/* Delete Action */}
            {canOperate && onDelete && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onDelete(lot)}
                  title="Delete Purchase Order"
                  aria-label="Delete Purchase Order"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Hero Row: PO Number */}
          <div className="flex items-center gap-2">
            {isEditingPoNumber ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-150 w-full">
                <input
                  type="text"
                  value={editablePoNumber}
                  onChange={(e) => setEditablePoNumber(e.target.value)}
                  placeholder="Enter PO Number..."
                  className="h-9 flex-1 px-3 text-sm font-mono font-bold rounded-lg border border-accent bg-bg text-text focus:outline-hidden ring-2 ring-accent/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSavePoNumber();
                    if (e.key === "Escape") setIsEditingPoNumber(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSavePoNumber}
                  disabled={updatePOMutation.isPending}
                  title="Save PO Number"
                  className="p-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                >
                  {updatePOMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPoNumber(false)}
                  title="Cancel"
                  className="p-2 rounded-lg border border-border text-text-secondary hover:text-text hover:bg-bg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h2 id="po-detail-heading" className="font-mono text-xl font-bold tracking-tight text-text truncate">
                  {lot.poNumber || lot.lotCode}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy PO Code"
                  className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer shrink-0"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-status-active-text" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                {canOperate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditablePoNumber(lot.poNumber || lot.lotCode);
                      setIsEditingPoNumber(true);
                    }}
                    title="Edit PO Number"
                    className="p-1 rounded-md text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Key Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-0.5 text-xs">
            {/* Supplier Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-text-secondary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">Dealer</span>
                <span className="font-semibold text-text truncate block text-xs" title={displayDealer}>
                  {displayDealer}
                </span>
              </div>
            </div>

            {/* Requester & Department Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <User className="h-3.5 w-3.5 text-accent shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">Requester</span>
                <span className="font-semibold text-text truncate block text-xs" title={displayRequesterName}>
                  {displayRequesterName}
                </span>
                <span className="text-[10px] text-text-secondary truncate block" title={`${displayDepartment} · ${displayRole}`}>
                  {displayDepartment}
                </span>
              </div>
            </div>

            {/* Total Value Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-sm font-mono">₱</span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">Total Cost</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-xs truncate">
                  ₱{aggregateTotalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Total Quantity Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <Boxes className="h-3.5 w-3.5 text-text-secondary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">Quantity</span>
                <span className="font-bold text-text block text-xs truncate">
                  {aggregateTotalQuantity}{" "}
                  <span className="font-normal text-text-secondary text-[10px]">
                    {isMultiItem ? `(${totalLineItems} items)` : lot.itemType === "asset" ? "units" : "pcs"}
                  </span>
                </span>
              </div>
            </div>

            {/* Date Chip */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-bg/80 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">Date</span>
                <span className="font-medium text-text block text-xs truncate" title={poDate}>
                  {poDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contextual Workflow CTA Banner */}
          {canOperate && (
            <div
              className={cn(
                "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors",
                lot.status === "delivered"
                  ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15"
                  : lot.status === "ordered"
                  ? "border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15"
                  : lot.status === "approved"
                  ? "border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15"
                  : lot.status === "cancelled"
                  ? "border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/15"
                  : "border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/15"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    lot.status === "delivered"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : lot.status === "ordered"
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      : lot.status === "approved"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : lot.status === "cancelled"
                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                  )}
                >
                  {lot.status === "pending_approval" && <ShieldCheck className="h-4 w-4" />}
                  {lot.status === "approved" && <Truck className="h-4 w-4" />}
                  {lot.status === "ordered" && <PackageCheck className="h-4 w-4" />}
                  {lot.status === "delivered" && <CheckCircle2 className="h-4 w-4" />}
                  {lot.status === "cancelled" && <Ban className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-bold truncate",
                      lot.status === "delivered" ? "text-emerald-800 dark:text-emerald-200" : "text-text"
                    )}
                  >
                    {lot.status === "pending_approval" && "Pending Approval Review"}
                    {lot.status === "approved" && "Approved — Ready for Issuance"}
                    {lot.status === "ordered" && "In Transit / Awaiting Delivery"}
                    {lot.status === "delivered" && (
                      lot.projectId
                        ? `Delivered & Auto-Credited to ${lot.projectName || "Project"}`
                        : canRelease
                        ? "Delivered & Stocked — Ready to Issue"
                        : "Delivered & Stored in Inventory"
                    )}
                    {lot.status === "cancelled" && "Purchase Order Cancelled"}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] truncate",
                      lot.status === "delivered"
                        ? "text-emerald-700/80 dark:text-emerald-300/80"
                        : "text-text-secondary"
                    )}
                  >
                    {lot.status === "pending_approval" && "Authorize this order for supplier fulfillment"}
                    {lot.status === "approved" && "Confirm order transmission to dealer"}
                    {lot.status === "ordered" && (
                      lot.projectId
                        ? "Receive items and credit directly to project expense ledger"
                        : "Receive items and register into active stock"
                    )}
                    {lot.status === "delivered" && (
                      lot.projectId
                        ? "Auto-issued to project; cataloged as Consumable Material"
                        : canRelease
                        ? "Issue units to requesting departments"
                        : "All workflow stages completed"
                    )}
                    {lot.status === "cancelled" && "This purchase order has been closed"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {lot.status === "pending_approval" && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal("approved")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                )}
                {lot.status === "approved" && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal("ordered")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Mark Ordered</span>
                  </button>
                )}
                {lot.status === "ordered" && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal("delivered")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>{lot.projectId ? "Receive & Credit to Project" : "Receive & Stock"}</span>
                  </button>
                )}
                {canRelease && (
                  <button
                    type="button"
                    onClick={() => onReleaseStock?.(lot)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Release Stock</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPrintSlip(lot)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs",
                    lot.status === "delivered"
                      ? "border-emerald-500/30 bg-bg hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:border-emerald-500/50"
                      : "border-border bg-bg hover:bg-bg-subtle text-text hover:border-accent/40"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export Slip</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-bg-subtle/40 px-6 shrink-0 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "specs"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipt")}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "receipt"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text"
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Receipt</span>
            {lot.receiptUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 shadow-2xs" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("workflow")}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "workflow"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text"
            )}
          >
            <History className="h-4 w-4" />
            <span>Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={cn(
              "py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "qr"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text"
            )}
          >
            <QrCode className="h-4 w-4" />
            <span>QR Tag</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Visual Workflow Stepper Header */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                PO Workflow Progression
              </span>
              <span className="text-[10px] text-text-secondary">
                {lot.status === "delivered" ? "Completed" : "Active Stage"}
              </span>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;
                const Icon = step.icon;

                return (
                  <div key={step.status} className="flex flex-col items-center text-center space-y-1">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center border transition-all",
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                          : isCurrent
                          ? "bg-accent text-accent-foreground border-accent shadow-xs scale-105"
                          : "bg-bg-subtle text-text-secondary border-border"
                      )}
                    >
                      {isPassed ? <Check className="h-4 w-4 stroke-3" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] leading-tight font-medium",
                        isCurrent ? "font-bold text-text" : "text-text-secondary"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons Toolbar for Operators */}
            {canOperate && (
              <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                {lot.status === "pending_approval" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("approved")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve PO
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("cancelled")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel PO
                    </button>
                  </>
                )}

                {lot.status === "approved" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus("ordered")}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Mark as Ordered
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("delivered")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Receive & Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("cancelled")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel PO
                    </button>
                  </>
                )}

                {lot.status === "ordered" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("delivered")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Receive & Intake into Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal("cancelled")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel PO
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onPrintSlip(lot)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer ml-auto"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Official Form
                </button>
              </div>
            )}
          </div>

          {activeTab === "specs" && (
            <div className="space-y-6">
              {/* Line Item & Cost Specifications */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-accent" />
                    {lot.items && lot.items.length > 1
                      ? `Line Items (${lot.items.length})`
                      : "Item & Cost Specifications"}
                  </span>
                </div>

                {lot.items && lot.items.length > 1 ? (
                  /* Multi-item PO — line items table */
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-bg-subtle text-text-secondary border-b border-border font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2 text-center">Qty</th>
                            <th className="px-3 py-2 text-right">Unit Cost</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {lot.items.map((item, idx) => {
                            const iUnitCost = parseFloat(item.unitCost) || 0;
                            const iTotalCost = parseFloat(item.totalCost) || 0;
                            return (
                              <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                                <td className="px-3 py-2.5 text-text-secondary font-mono text-[10px]">{idx + 1}</td>
                                <td className="px-3 py-2.5">
                                  <span className="font-semibold text-text block">{item.itemName}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-[10px] text-text-secondary">{item.itemCode}</span>
                                    {item.lotCode && (
                                      <span className="font-mono text-[10px] text-text-muted">· {item.lotCode}</span>
                                    )}
                                    <span className={cn(
                                      "inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border shadow-2xs",
                                      item.itemType === "asset"
                                        ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25"
                                        : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25"
                                    )}>
                                      {item.itemType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono font-bold text-text">{item.quantity}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-text">{formatPhp(iUnitCost)}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-status-active-text">{formatPhp(iTotalCost)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-border bg-bg-subtle/50">
                          <tr>
                            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Grand Total</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-text">
                              {lot.items.reduce((sum, li) => sum + li.quantity, 0)}
                            </td>
                            <td className="px-3 py-2.5"></td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-base text-status-active-text">
                              {formatPhp(lot.items.reduce((sum, li) => sum + (parseFloat(li.totalCost) || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-text-secondary">Dealer / Supplier</span>
                        <p className="font-semibold text-text">{displayDealer}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-text-secondary">Purpose / Usage</span>
                        <p className="font-medium text-text">{cleanPurpose}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single-item PO — original spec grid */
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Item Name</span>
                      <p className="font-bold text-text text-sm leading-snug">{lot.itemName}</p>
                      <span className="font-mono text-[10px] text-text-secondary">Code: {lot.itemCode}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Dealer / Supplier</span>
                      <p className="font-semibold text-text">{lot.supplierName || "Internal / Direct"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">
                        {lot.status === "delivered" ? "Quantity in Stock" : "Quantity Ordered"}
                      </span>
                      <p className="font-mono font-bold text-text text-sm">
                        {lot.quantity}{" "}
                        {lot.itemType === "asset"
                          ? lot.quantity === 1
                            ? "unit"
                            : "units"
                          : "pcs"}
                      </p>
                      {lot.status === "delivered" &&
                        lot.orderedQuantity != null &&
                        lot.orderedQuantity !== lot.quantity && (
                          <p className="text-[10px] text-text-secondary">
                            Ordered {lot.orderedQuantity} · received {lot.receivedQuantity ?? lot.quantity}
                          </p>
                        )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Unit Acquisition Cost</span>
                      <p className="font-mono font-bold text-text">{formatPhp(unitCostNum)}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Purpose / Usage</span>
                      <p className="font-medium text-text">{cleanPurpose}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Total PO Valuation</span>
                      <p className="font-mono font-bold text-base text-status-active-text">
                        {formatPhp(totalCostNum)}
                      </p>
                    </div>
                  </div>
                )}

                {lot.notes && (
                  <div className="p-3 rounded-lg bg-bg-subtle/80 border border-border/60 text-xs">
                    <span className="font-bold text-text-secondary uppercase text-[10px] block mb-1">
                      Notes & Observations
                    </span>
                    <p className="text-text leading-relaxed">{lot.notes}</p>
                  </div>
                )}
              </div>

              {/* Requester & Department Information Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-accent" />
                    Requester & Department Details
                  </span>
                  <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                    {displayRole}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-text-secondary">
                      Requested By
                    </span>
                    <p className="font-bold text-text text-sm flex items-center gap-1.5">
                      <User className="h-4 w-4 text-accent shrink-0" />
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
                      <Building2 className="h-4 w-4 text-accent shrink-0" />
                      <span className="truncate">{displayDepartment}</span>
                    </p>
                    <span className="text-[10px] text-text-secondary block">
                      Target Requisitioning Unit
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-text-secondary">
                      Authorizing Officer
                    </span>
                    <p className="font-semibold text-text text-sm flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{lot.approvedByName || "Pending Custodian Review"}</span>
                    </p>
                    <span className="text-[10px] text-text-secondary block">
                      {lot.approvedAt
                        ? `Approved ${formatDateTime(lot.approvedAt)}`
                        : "Property Custodian Office"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Availability Card (for delivered consumable lots) */}
              {lot.itemType === "consumable" && lot.status === "delivered" && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-accent" />
                      Lot Remaining Stock Status
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        isDepleted
                          ? "bg-status-retired-bg/15 text-status-retired-text border-status-retired-bg/30"
                          : isLowStock
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30"
                      )}
                    >
                      {isDepleted ? "Depleted" : isLowStock ? "Low Stock" : "In Stock"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-text-secondary">Units Remaining / Available:</span>
                      <span className="font-mono font-bold text-text">
                        {lot.quantityRemaining} of {lot.quantity}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isDepleted
                            ? "bg-status-retired-bg"
                            : isLowStock
                            ? "bg-amber-500"
                            : "bg-status-active-bg"
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, remainingRatio))}%` }}
                      />
                    </div>
                  </div>

                  {canRelease && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onReleaseStock?.(lot)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <Send className="h-4 w-4" />
                        <span>Issue / Release From This Lot</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "receipt" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-accent" />
                    Official Vendor Receipt & Proof of Purchase
                  </span>
                  {lot.receiptUrl ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Receipt Attached
                    </span>
                  ) : !isApproved ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Upload Disabled ({lot.status === "cancelled" ? "Cancelled" : "Pending Approval"})
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
                      Pending Upload
                    </span>
                  )}
                </div>

                {!isApproved && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">Receipt Upload Disabled</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed">
                        Receipt upload is disabled while this Purchase Order is {lot.status === "cancelled" ? "cancelled" : "pending approval"}. Official vendor receipts and sales invoices can only be uploaded once the purchase order is approved.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-text-secondary leading-relaxed">
                  Maintain compliance and proof of purchase by archiving the scanned receipt, delivery receipt (DR), or sales invoice issued for purchase order <strong className="text-text font-mono">{lot.poNumber || lot.lotCode}</strong>.
                </p>

                <POReceiptUploader
                  receiptUrl={lot.receiptUrl}
                  poNumber={lot.poNumber || lot.lotCode}
                  lotId={lot.id}
                  canOperate={canOperate}
                  disabled={!isApproved}
                  disabledReason={
                    !isApproved
                      ? lot.status === "cancelled"
                        ? "Receipt upload is disabled because this Purchase Order is cancelled."
                        : "Receipt upload is disabled until this Purchase Order is approved."
                      : undefined
                  }
                  onUploadSuccess={async (url) => {
                    await updatePOMutation.mutateAsync({
                      id: lot.id,
                      payload: { receiptUrl: url },
                    });
                  }}
                  onRemove={handleRemoveReceipt}
                />
              </div>
            </div>
          )}

          {activeTab === "workflow" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-accent" />
                    Activity & Audit Trail
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {auditLogs.length} audit event(s) recorded
                  </span>
                </div>

                {/* Audit Timeline */}
                <ol className="relative border-l-2 border-border/80 ml-3 space-y-5">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => {
                      let bgColor = "bg-accent";
                      let textColor = "text-accent";
                      let actionLabel = "Purchase Order Activity";
                      let Icon = History;

                      if (log.action === "purchase_order_created") {
                        bgColor = "bg-blue-500";
                        textColor = "text-blue-600 dark:text-blue-400";
                        actionLabel = "Purchase Order Created";
                        Icon = FileText;
                      } else if (log.action === "purchase_order_approved") {
                        bgColor = "bg-amber-500";
                        textColor = "text-amber-600 dark:text-amber-400";
                        actionLabel = "PO Approved";
                        Icon = ShieldCheck;
                      } else if (log.action === "purchase_order_ordered") {
                        bgColor = "bg-blue-500";
                        textColor = "text-blue-600 dark:text-blue-400";
                        actionLabel = "PO Ordered / In-Transit";
                        Icon = Truck;
                      } else if (log.action === "purchase_order_delivered") {
                        bgColor = "bg-emerald-600";
                        textColor = "text-emerald-600 dark:text-emerald-400";
                        actionLabel = "Goods Delivered & Stocked";
                        Icon = PackageCheck;
                      } else if (log.action === "purchase_order_cancelled") {
                        bgColor = "bg-rose-500";
                        textColor = "text-rose-600 dark:text-rose-400";
                        actionLabel = "PO Cancelled";
                        Icon = Ban;
                      } else if (log.action === "purchase_order_updated") {
                        bgColor = "bg-purple-500";
                        textColor = "text-purple-600 dark:text-purple-400";
                        actionLabel = "PO Updated";
                        Icon = Edit3;
                      }

                      return (
                        <li key={log.id} className="pl-6 relative group">
                          <span
                            className={cn(
                              "absolute -left-2.75 top-0.5 h-5 w-5 rounded-full border-2 border-bg flex items-center justify-center text-white",
                              bgColor
                            )}
                          >
                            <Icon className="h-3 w-3" />
                          </span>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={cn("font-bold", textColor)}>{actionLabel}</span>
                              <time className="text-[10px] text-text-secondary font-mono">
                                {formatDateTime(log.timestamp as unknown as string)}
                              </time>
                            </div>
                            <p className="text-text-secondary text-[11.5px] leading-relaxed wrap-break-word">
                              {log.notes || `System recorded action: ${log.action}`}
                            </p>
                            <p className="text-text-secondary text-[10px] mt-1 pt-1 border-t border-border/40 inline-block">
                              by <strong className="text-text">{log.actorName}</strong>
                            </p>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="pl-5 relative group">
                      <span className="absolute -left-2.5 top-1 h-4 w-4 rounded-full border-2 bg-border border-bg" />
                      <div className="text-xs text-text-secondary italic">
                        No activity logs recorded.
                      </div>
                    </li>
                  )}
                </ol>
              </div>
            </div>
          )}

          {activeTab === "qr" && (() => {
            const tagItems =
              lot.items && lot.items.length > 0
                ? lot.items.map((item) => ({
                    id: item.id,
                    itemType: item.itemType,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    totalCost: item.totalCost,
                    lotCode: item.lotCode || lot.lotCode,
                    suggestedDealer: item.suggestedDealer || lot.supplierName,
                    purpose: item.purpose || lot.purpose,
                  }))
                : [
                    {
                      id: lot.id,
                      itemType: lot.itemType,
                      itemCode: lot.itemCode,
                      itemName: lot.itemName,
                      quantity: lot.quantity,
                      unitCost: lot.unitCost,
                      totalCost: lot.totalCost,
                      lotCode: lot.lotCode,
                      suggestedDealer: lot.supplierName,
                      purpose: lot.purpose,
                    },
                  ];

            const filteredTagItems =
              selectedTagFilter === "all"
                ? tagItems
                : tagItems.filter((t) => t.lotCode === selectedTagFilter);

            return (
              <div className="space-y-4">
                {/* Header info & Lot switcher for multi-lot POs */}
                {tagItems.length > 1 && (
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-accent/10 text-accent shrink-0 mt-0.5">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text text-xs">
                            Multi-Lot Physical Tags
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/25 font-mono">
                            {tagItems.length} Lots
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-normal mt-0.5">
                          Select a specific lot code to filter or view all physical intake QR tags below.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => setSelectedTagFilter("all")}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                          selectedTagFilter === "all"
                            ? "bg-accent text-accent-foreground font-bold shadow-xs"
                            : "bg-bg text-text-secondary hover:text-text border border-border"
                        )}
                      >
                        All ({tagItems.length})
                      </button>
                      {tagItems.map((t) => (
                        <button
                          key={t.lotCode}
                          type="button"
                          onClick={() => setSelectedTagFilter(t.lotCode)}
                          className={cn(
                            "px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                            selectedTagFilter === t.lotCode
                              ? "bg-accent text-accent-foreground font-bold shadow-xs"
                              : "bg-bg text-text-secondary hover:text-text border border-border"
                          )}
                        >
                          {t.lotCode}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Cards List */}
                <div className="space-y-4">
                  {filteredTagItems.map((item) => {
                    const itemPayload = `CRMC-AIMS-LOT:${item.lotCode.trim()}`;
                    const itemLot: PurchaseLot = {
                      ...lot,
                      id: item.id,
                      lotCode: item.lotCode,
                      itemCode: item.itemCode,
                      itemName: item.itemName,
                      itemType: item.itemType,
                      quantity: item.quantity,
                      quantityRemaining: item.quantity,
                      unitCost: item.unitCost,
                      totalCost: item.totalCost,
                      supplierName: item.suggestedDealer,
                      purpose: item.purpose,
                      qrPayload: itemPayload,
                    };

                    return (
                      <div
                        key={item.id + item.lotCode}
                        className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4"
                      >
                        {/* Physical Tag Card */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-white rounded-xl border-2 border-slate-900 shadow-sm text-slate-900">
                          {/* Exact Scannable QR Code */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                            <QRCodeSVG
                              value={itemPayload}
                              size={120}
                              level="M"
                              className="w-28 h-28"
                            />
                          </div>

                          {/* Tag Details */}
                          <div className="flex-1 min-w-0 text-left space-y-1 w-full sm:w-auto">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                              <span className="font-mono text-[9px] font-black tracking-wider uppercase text-slate-700">
                                CRMC-AIMS BATCH LOT TAG
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border",
                                  item.itemType === "asset"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-teal-50 text-teal-700 border-teal-200"
                                )}
                              >
                                {item.itemType}
                              </span>
                            </div>

                            <div className="font-mono text-sm font-black tracking-wide text-slate-950 flex items-center gap-1.5">
                              <span>{item.lotCode}</span>
                            </div>

                            <p
                              className="font-bold text-xs text-slate-900 truncate"
                              title={item.itemName}
                            >
                              {item.itemName}
                            </p>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-600 pt-1">
                              <div>
                                Code:{" "}
                                <strong className="text-slate-800 font-mono">
                                  {item.itemCode}
                                </strong>
                              </div>
                              <div>
                                Batch Qty:{" "}
                                <strong className="text-slate-800 font-mono">
                                  {item.quantity}{" "}
                                  {item.itemType === "asset" ? "units" : "pcs"}
                                </strong>
                              </div>
                              <div className="col-span-2 truncate">
                                Dealer:{" "}
                                <span className="font-medium text-slate-800">
                                  {item.suggestedDealer || "Internal / Direct"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-text-secondary font-mono truncate">
                            Scan: {itemPayload}
                          </span>
                          {onPrintTag && (
                            <button
                              type="button"
                              onClick={() => onPrintTag(itemLot)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer shadow-2xs shrink-0"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print Bin Tag</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </aside>
    </div>

    {/* Modal for Status Confirmation / Notes */}
    {showStatusModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-sm rounded-xl border border-border bg-bg p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-bold text-text text-sm capitalize flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Confirm {showStatusModal.replace("_", " ")}
            </h3>
            <button
              type="button"
              onClick={() => setShowStatusModal(null)}
              className="p-1 rounded text-text-secondary hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-text-secondary">
            {showStatusModal === "delivered"
              ? lot.itemType === "consumable"
                ? "Confirm the actual quantity received. That amount will be added to inventory (it can differ from the ordered quantity)."
                : "Marking this PO as delivered will activate the asset in inventory."
              : showStatusModal === "approved"
              ? "Approve this purchase order to authorize supplier issuance and procurement."
              : `Are you sure you want to transition this purchase order to ${showStatusModal.replace("_", " ")}?`}
          </p>

          {showStatusModal === "delivered" && lot.itemType === "consumable" && (
            <div className="space-y-1">
              <label
                htmlFor="po-received-qty"
                className="text-[11px] font-semibold text-text"
              >
                Actual Quantity Received <span className="text-accent">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="po-received-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={receivedQuantity || String(lot.quantity)}
                  onChange={(e) => setReceivedQuantity(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-bg text-text font-mono focus:ring-1 focus:ring-accent focus:outline-hidden"
                />
                <span className="text-[11px] text-text-secondary shrink-0">
                  of {lot.quantity} ordered
                </span>
              </div>
              {Number.parseInt(receivedQuantity || String(lot.quantity), 10) !==
                lot.quantity && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Inventory will be adjusted to the received quantity, not the ordered amount.
                </p>
              )}
            </div>
          )}

          {showStatusModal === "delivered" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text flex items-center justify-between">
                <span>Attach Receipt Picture (Optional)</span>
                {(deliveryReceiptUrl || lot.receiptUrl) && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Attached ✓
                  </span>
                )}
              </label>
              <POReceiptUploader
                receiptUrl={deliveryReceiptUrl || lot.receiptUrl}
                poNumber={lot.poNumber || lot.lotCode}
                lotId={lot.id}
                canOperate={canOperate}
                compact
                onUploadSuccess={(url) => setDeliveryReceiptUrl(url)}
                onRemove={() => setDeliveryReceiptUrl(null)}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text">Optional Audit Notes</label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Enter remarks or approval references..."
              rows={2}
              className="w-full p-2 text-xs rounded-lg border border-border bg-bg text-text focus:ring-1 focus:ring-accent focus:outline-hidden resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowStatusModal(null);
                setStatusNote("");
                setReceivedQuantity("");
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-bg-subtle text-text cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleTransitionStatus(showStatusModal)}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>
                  {showStatusModal === "delivered"
                    ? "Confirm Receive & Stock"
                    : "Confirm"}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
