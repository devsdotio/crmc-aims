"use client";
 
import { useEffect, useRef, useState } from "react";
import { X, Check, Mail, Phone, Building2, Tag, History, FileText, User, Loader2, Send, CheckCircle, XCircle, PackageCheck, PackageMinus, RotateCcw, Edit3, Calendar, Clock, AlertCircle, StickyNote, Briefcase, Package, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatItemDescription, isUuid } from "@/lib/sanitize-display";
import { groupByPurpose } from "@/lib/request-purpose";
import { LinkedRequestsNote } from "@/components/requests/linked-requests-note";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import type { BorrowRequest,  RequestStatus } from "@/types/borrow-requests";
import { ActionHistoryTimeline } from "@/components/audit-logs/audit-log-utils";
import { LoadingState } from "@/components/providers/loading-context";

/** Deterministic color from a string — same code always gets the same hue. */
function getAssetCodeColor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return {
    bg: `hsla(${hue}, 70%, 95%, 1)`,
    text: `hsla(${hue}, 60%, 35%, 1)`,
    border: `hsla(${hue}, 55%, 80%, 1)`,
  };
}

export interface RequestDetailPanelProps {
  request: BorrowRequest | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onApprove?: (request: BorrowRequest) => void;
  onReject?: (request: BorrowRequest) => void;
  onUndoApproval?: (request: BorrowRequest) => void | Promise<void>;
  onRelease?: (request: BorrowRequest) => void | Promise<void>;
  onReturn?: (request: BorrowRequest) => void | Promise<void>;
  onMarkUnreleased?: (request: BorrowRequest) => void | Promise<void>;
  onEdit?: (request: BorrowRequest) => void;
}

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending:    { bg: "bg-status-repair-bg/20",       text: "text-status-repair-text font-bold",      label: "Pending Review" },
  approved:   { bg: "bg-status-active-bg/20",       text: "text-status-active-text font-bold",      label: "Approved" },
  rejected:   { bg: "bg-destructive", text: "text-white font-bold", label: "Rejected" },
  released:   { bg: "bg-status-active-bg/20",       text: "text-status-active-text font-bold",      label: "Released" },
  unreleased: { bg: "bg-bg-subtle",                 text: "text-text-secondary font-bold",          label: "Unreleased" },
  returned:   { bg: "bg-status-active-bg/20",       text: "text-status-active-text font-bold",      label: "Returned" },
  cancelled:  { bg: "bg-bg-subtle",                 text: "text-text-secondary font-bold",          label: "Cancelled" },
};

function getActionIcon(action: string) {
  switch (action.toLowerCase()) {
    case "pending":
    case "created":
      return <Send className="h-3.5 w-3.5 text-accent" />;
    case "approved":
      return <CheckCircle className="h-3.5 w-3.5 text-status-active-text" />;
    case "released":
      return <PackageMinus className="h-3.5 w-3.5 text-status-active-text" />;
    case "unreleased":
      return <RotateCcw className="h-3.5 w-3.5 text-status-repair-text" />;
    case "returned":
      return <PackageCheck className="h-3.5 w-3.5 text-status-active-text" />;
    case "rejected":
    case "cancelled":
      return <XCircle className="h-3.5 w-3.5 text-status-outofservice-text" />;
    default:
      return <History className="h-3.5 w-3.5 text-text-secondary" />;
  }
}

function getActionStyle(action: string) {
  switch (action) {
    case "submitted":
      return { bg: "bg-bg-subtle border-border", text: "text-text-secondary" };
    case "approved":
      return { bg: "bg-status-active-bg/20 border-status-active-bg/30", text: "text-status-active-text" };
    case "rejected":
      return { bg: "bg-destructive border-destructive", text: "text-white", iconText: "text-white" };
    case "released":
      return { bg: "bg-status-active-bg/20 border-status-active-bg/30", text: "text-status-active-text" };
    case "unreleased":
      return { bg: "bg-bg-subtle border-border", text: "text-text-secondary" };
    case "returned":
      return { bg: "bg-status-active-bg/20 border-status-active-bg/30", text: "text-status-active-text" };
    default:
      return { bg: "bg-bg-subtle border-border", text: "text-text-secondary" };
  }
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  const date = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RequestDetailPanel({
  request,
  isOpen,
  isLoading = false,
  onClose,
  onApprove,
  onReject,
  onUndoApproval,
  onRelease,
  onReturn,
  onMarkUnreleased,
  onEdit,
}: RequestDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMarkingUnreleased, setIsMarkingUnreleased] = useState(false);
  const [isUndoingApproval, setIsUndoingApproval] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);
  const resolveCategoryStyle = useCategoryStyleResolver();

  // Keyboard Escape listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isMarkingUnreleased && !isUndoingApproval) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isMarkingUnreleased, isUndoingApproval]);

  const handleUndoApproval = async () => {
    if (!onUndoApproval || !request) return;
    setIsUndoingApproval(true);
    try {
      await onUndoApproval(request);
    } finally {
      setIsUndoingApproval(false);
    }
  };

  const handleMarkUnreleased = async () => {
    if (!onMarkUnreleased || !request) return;
    setIsMarkingUnreleased(true);
    try {
      await onMarkUnreleased(request);
    } finally {
      setIsMarkingUnreleased(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !request) {
      setIsOverdue(false);
      return;
    }
    const isAssign = request.requestType === "assignable";
    const hasAssets =
      !isAssign &&
      request.items?.some(
        (item) => item.itemType === "asset" || Boolean(item.assetId)
      );
    const overdue =
      Boolean(hasAssets) &&
      !isAssign &&
      request.status === "released" &&
      Boolean(
        request.expectedReturnDate &&
          new Date(request.expectedReturnDate).setHours(23, 59, 59, 999) < Date.now()
      );
    setIsOverdue(overdue);
  }, [isOpen, request]);

  if (!isOpen) return null;

  if (isLoading || !request) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Loading request details"
          className={cn(
            "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
            "animate-in slide-in-from-right duration-250 ease-in-out"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
            <div className="h-6 w-36 bg-border/60 rounded-md animate-pulse" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <LoadingState
              variant="card"
              icon="clipboard"
              message="Loading borrow request..."
              subtitle="Retrieving requested inventory items, borrower verification, and approval timeline"
            />
          </div>
        </aside>
      </div>
    );
  }

  const statusMeta = STATUS_STYLES[request.status];
  const isAssignRequest = request.requestType === "assignable";
  const hasReturnableAssets =
    !isAssignRequest &&
    request.items?.some(
      (item) => item.itemType === "asset" || Boolean(item.assetId)
    );
  const totalUnits =
    request.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={() => !isMarkingUnreleased && onClose()} aria-hidden="true" />

      {/* Drawer content panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <h2 id="detail-panel-heading" className="font-mono text-base font-bold tracking-tight text-text leading-tight">
              {request.requestCode}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-text-secondary font-medium">
                {isAssignRequest ? "Assignment" : hasReturnableAssets ? "Borrow" : "Supplies"}
              </span>
              <span className="text-text-secondary/40">•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <User className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-45">
                  {request.requestedByName || request.requesterName}
                </span>
              </span>
            </div>
            {request.relatedRequests && request.relatedRequests.length > 0 && (
              <div className="mt-1">
                <LinkedRequestsNote related={request.relatedRequests} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 shrink-0">
            {statusMeta && (
              <span
                className={cn(
                  "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border border-border/50 shadow-xs text-center",
                  statusMeta.bg,
                  statusMeta.text
                )}
              >
                {statusMeta.label}
              </span>
            )}

            {onEdit && request.status === "pending" && (
              <button
                type="button"
                onClick={() => onEdit(request)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-bg text-text hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors cursor-pointer shadow-xs"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </button>
            )}

            {request.status === "released" && onReturn && hasReturnableAssets && (
              <button
                type="button"
                onClick={() => onReturn(request)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2.5} />
                Mark Returned
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Panel Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rejection Reason */}
          {request.rejectionReason && (
            <div className="p-3.5 rounded-lg border border-destructive bg-destructive/10 text-destructive text-xs">
              <span className="font-bold block mb-1">Rejection Reason:</span>
              {request.rejectionReason}
            </div>
          )}

          {/* Cancellation Reason */}
          {request.cancellationReason && (
            <div className="p-3.5 rounded-lg border border-orange-400/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 text-xs">
              <span className="font-bold block mb-1">Cancellation Reason:</span>
              {request.cancellationReason}
            </div>
          )}

          {/* Requested Item Info */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                Requested Items
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
                  {request.items.length} {request.items.length === 1 ? "item" : "items"}
                </span>
                <span className="text-[11px] font-bold text-text bg-bg-subtle px-2 py-0.5 rounded-full border border-border font-mono">
                  {totalUnits} {totalUnits === 1 ? "unit" : "units"}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {groupByPurpose(request.items, request.purpose).map((group) => (
                <div
                  key={group.purpose}
                  className="rounded-xl border border-border bg-bg overflow-hidden shadow-xs"
                >
                  <div className="px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Purpose
                    </p>
                    <p className="text-xs font-semibold text-text mt-0.5">{group.purpose}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {group.lines.map((item, idx) => {
                const itemCategoryMeta = resolveCategoryStyle(item.category);
                const displayDesc = formatItemDescription(
                  item.itemDescription,
                  itemCategoryMeta.label,
                  item.itemType
                );
                const isAsset =
                  item.itemType === "asset" || Boolean(item.assetId);
                const shouldShowAssetCode =
                  Boolean(item.assetCode) &&
                  !isUuid(item.assetCode) &&
                  !item.assetCode?.toLowerCase().startsWith("cat-");

                return (
                  <div
                    key={idx}
                    className="p-3 flex items-center gap-3 hover:bg-bg-subtle/50 transition-colors"
                  >
                    {/* Visual Icon Avatar */}
                    <div
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border",
                        itemCategoryMeta.bg,
                        "border-border/30"
                      )}
                    >
                      {isAsset ? (
                        <Box className={cn("h-4 w-4", itemCategoryMeta.text)} />
                      ) : (
                        <Package className={cn("h-4 w-4", itemCategoryMeta.text)} />
                      )}
                    </div>

                    {/* Title + Metadata tags */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text truncate">
                        {displayDesc}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            itemCategoryMeta.bg,
                            itemCategoryMeta.text
                          )}
                        >
                          {itemCategoryMeta.label}
                        </span>

                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold border",
                            isAsset
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          )}
                        >
                          {isAsset ? "Asset" : "Consumable"}
                        </span>

                        {shouldShowAssetCode && item.assetCode && (() => {
                          const acColor = getAssetCodeColor(item.assetCode);
                          return (
                            <span
                              className="rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-2xs"
                              style={{
                                backgroundColor: acColor.bg,
                                color: acColor.text,
                                border: `1px solid ${acColor.border}`,
                              }}
                            >
                              {item.assetCode}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Quantity Pill */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex flex-col items-end px-2.5 py-1 rounded-md bg-bg-subtle border border-border">
                        <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold leading-none">
                          Qty
                        </span>
                        <span className="font-mono font-black text-xs text-text mt-0.5">
                          {item.quantity} {item.unit ? item.unit : item.quantity === 1 ? "pc" : "pcs"}
                        </span>
                      </div>
                    </div>
                  </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requester Contact Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Requester Information
            </h3>
            <div className="p-4 rounded-lg border border-border bg-bg space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-text-secondary">Department account</p>
                  <span className="font-bold text-text">{request.requesterName}</span>
                </div>
              </div>
              {request.requestedByName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary">Requested by</p>
                    <span className="font-bold text-text">{request.requestedByName}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-text-secondary">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{request.department} Department</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${request.requesterEmail}`} className="hover:underline text-primary">
                  {request.requesterEmail}
                </a>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{request.requesterPhone}</span>
              </div>
            </div>
          </div>

          {/* Purpose & Notes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-500" />
              Purpose & Notes
            </h3>
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 p-4 space-y-3 text-xs shadow-xs">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Purpose of Request
                  </span>
                </div>
                <p className="text-sm font-semibold text-text leading-relaxed pl-0.5">
                  {request.purpose}
                </p>
              </div>

              {request.notes && (
                <div className="pt-2.5 border-t border-indigo-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <StickyNote className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Additional Notes
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed pl-0.5">
                    {request.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fulfillment Details */}
          {request.pickedUpBy && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <PackageCheck className="h-3.5 w-3.5 text-status-active-text" />
                Fulfillment Details
              </h3>
              <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <User className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Picked Up By
                    </span>
                    <span className="font-bold text-sm text-text block mt-0.5">
                      {request.pickedUpBy}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <Check className="h-3 w-3" /> Released
                </span>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              {isAssignRequest ? "Schedule & Allocation" : hasReturnableAssets ? "Schedule & Return Date" : "Schedule & Status"}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Requested On Card */}
              <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-950/20 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                  <span className="p-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Calendar className="h-3 w-3" />
                  </span>
                  Requested On
                </div>
                <div>
                  <span className="font-bold text-sm text-text block">
                    {new Date(request.requestedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    {new Date(request.requestedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Expected Return / Custody Status Card */}
              {isAssignRequest ? (
                <div className="p-3.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      <Briefcase className="h-3 w-3" />
                    </span>
                    Custody Allocation
                  </div>
                  <div>
                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200 block">
                      Direct Assignment
                    </span>
                    <span className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 font-medium">
                      Continuous custody • No return date
                    </span>
                  </div>
                </div>
              ) : hasReturnableAssets ? (
                request.status === "returned" ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                      </span>
                      Return Status
                    </div>
                    <div>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 block">
                        Returned
                      </span>
                      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                        Expected: {formatDisplayDate(request.expectedReturnDate)}
                      </span>
                    </div>
                  </div>
                ) : isOverdue ? (
                  <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 dark:bg-destructive/15 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 text-destructive font-bold text-[10px] uppercase tracking-wider">
                        <span className="p-1 rounded-md bg-destructive/15 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                        </span>
                        Expected Return
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-destructive text-white uppercase tracking-wider">
                        Overdue
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-sm text-destructive block">
                        {formatDisplayDate(request.expectedReturnDate)}
                      </span>
                      <span className="text-[10px] text-destructive/80 font-medium">
                        Past scheduled return
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/25 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                      </span>
                      Expected Return
                    </div>
                    <div>
                      <span className="font-bold text-sm text-amber-900 dark:text-amber-200 block">
                        {formatDisplayDate(request.expectedReturnDate)}
                      </span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                        Scheduled check-in
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl border border-border bg-bg-subtle/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-border text-text-secondary">
                      <PackageCheck className="h-3 w-3" />
                    </span>
                    Return Requirement
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-text block">
                      Non-returnable
                    </span>
                    <span className="text-[10px] text-text-secondary font-medium">
                      Consumable item issued
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Action History
            </h3>
            <ActionHistoryTimeline entries={request.history} />
          </div>
        </div>

        {/* Action Footer (Only for pending requests with action handlers) */}
        {request.status === "pending" && (onApprove || onReject || onEdit) && (
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(request)}
                className="px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-bg text-text-secondary hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                Reject Request
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(request)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-bg text-text hover:bg-bg-subtle hover:border-accent/40 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-text-secondary" />
                  Edit Request
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(request)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Approve Request
                </button>
              )}
            </div>
          </div>
        )}
        
        
        {/* Action Footer (Only for approved requests) */}
        {request.status === "approved" && (onRelease || onUndoApproval) && (
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
            {onUndoApproval && (
              <button
                type="button"
                onClick={handleUndoApproval}
                disabled={isUndoingApproval}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-bg text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUndoingApproval ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Undo Approval</span>
              </button>
            )}
            {onRelease && (
              <button
                type="button"
                onClick={() => onRelease && request && onRelease(request)}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Release Request
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
