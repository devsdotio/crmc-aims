"use client";

import { useEffect, useState, useRef } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  Tag,
  User,
  Building2,
  Mail,
  FileText,
  History,
  Copy,
  Check,
  Send,
  RotateCcw,
  X,
  Edit3,
  AlertCircle,
  StickyNote,
  Package,
  HardHat,
  PackageCheck,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { formatItemDescription, formatAssetCodeDisplay, formatQuantityWithUnit } from "@/lib/sanitize-display";
import { splitByConsumableClassification } from "@/lib/consumable-classification";
import { groupByPurpose } from "@/lib/request-purpose";
import { LinkedRequestsNote } from "@/components/requests/linked-requests-note";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  getActionStyle,
  getActionIcon,
  formatDateTime,
  formatRelativeTime,
  AuditNoteDisplay,
} from "@/components/audit-logs/audit-log-utils";
import type { PortalBorrowRequest } from "./types";

export interface RequestDetailSheetProps {
  request: PortalBorrowRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (request: PortalBorrowRequest) => void;
  onEdit?: (request: PortalBorrowRequest) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: React.ElementType; color: string }
> = {
  pending: {
    label: "Pending Review",
    badge: "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/40",
    icon: Hourglass,
    color: "text-status-repair-text",
  },
  approved: {
    label: "Approved",
    badge: "bg-status-active-bg/20 text-status-active-text border-status-active-bg/40",
    icon: CheckCircle2,
    color: "text-status-active-text",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-destructive text-white border-destructive",
    icon: XCircle,
    color: "text-destructive",
  },
  released: {
    label: "Released / Active",
    badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40",
    icon: Send,
    color: "text-blue-600",
  },
  returned: {
    label: "Completed",
    badge: "bg-bg-subtle text-text border-border",
    icon: RotateCcw,
    color: "text-text",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-bg-subtle text-text-secondary border-border",
    icon: X,
    color: "text-text-secondary",
  },
  unreleased: {
    label: "Returned Unreleased",
    badge: "bg-slate-500/15 text-text-secondary border-border",
    icon: RotateCcw,
    color: "text-text-secondary",
  },
};

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

export function RequestDetailSheet({
  request,
  open,
  onOpenChange,
  onCancel,
  onEdit,
}: RequestDetailSheetProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const [copied, setCopied] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useFocusTrap(open, panelRef, () => onOpenChange(false));

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open, request?.id]);

  useEffect(() => {
    if (!open || !request) {
      setIsOverdue(false);
      return;
    }
    const isAssign = request.requestType === "assignable";
    const hasAsset = !isAssign && request.items?.some((i) => i.itemType === "asset");
    const returnDate = request.requestedDateTo || request.expectedReturnDate;
    let overdue = false;
    if (hasAsset && !isAssign && request.status === "released" && returnDate) {
      const parsed = returnDate.includes("T")
        ? new Date(returnDate)
        : new Date(`${returnDate}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        overdue = parsed.getTime() < Date.now();
      }
    }
    setIsOverdue(overdue);
  }, [open, request]);

  if (!open || !request) return null;

  const statusConfig = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const isAssignRequest = request.requestType === "assignable";
  const hasAsset = !isAssignRequest && request.items?.some((i) => i.itemType === "asset");
  const isConsumable =
    Boolean(request.portalKind) ||
    Boolean(request.items?.length && request.items.every((i) => i.itemType === "consumable"));
  const consumableHeading =
    request.portalKind === "mixed"
      ? "Mixed Requisition (Supplies & Materials)"
      : request.portalKind === "material"
        ? "Materials Requisition"
        : "Supplies Requisition";
  const consumableShort =
    request.portalKind === "mixed"
      ? "Supplies & materials"
      : request.portalKind === "material"
        ? "Materials"
        : "Supplies";

  const handleCopyCode = async () => {
    if (!request.requestCode) return;
    try {
      await navigator.clipboard.writeText(request.requestCode);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Synthesize logs if history array is empty so the accountability timeline is always complete
  const rawLogs =
    request.history && request.history.length > 0
      ? request.history
      : [
          {
            id: "sub-1",
            action: "submitted" as const,
            actor: request.requesterName || "Requester",
            timestamp: request.requestedAt || new Date().toISOString(),
            note: request.purpose || "Request submitted for review",
          },
          ...(request.status === "approved" || request.status === "released" || request.status === "returned"
            ? [
                {
                  id: "app-1",
                  action: "approved" as const,
                  actor: "Property Custodian",
                  timestamp: request.requestedAt,
                  note: "Request approved and queued for issuance",
                },
              ]
            : []),
          ...(request.status === "rejected"
            ? [
                {
                  id: "rej-1",
                  action: "rejected" as const,
                  actor: "Property Custodian",
                  timestamp: request.requestedAt,
                  note: request.rejectionReason || "Request was rejected",
                },
              ]
            : []),
          ...(request.status === "cancelled"
            ? [
                {
                  id: "can-1",
                  action: "cancelled" as const,
                  actor: request.requesterName || "Requester",
                  timestamp: request.requestedAt,
                  note: request.cancellationReason
                    ? `Reason: ${request.cancellationReason}`
                    : "Request was cancelled",
                },
              ]
            : []),
          ...(request.status === "released" || request.status === "returned"
            ? [
                {
                  id: "rel-1",
                  action: "released" as const,
                  actor: "Property Custodian",
                  timestamp: request.requestedDateFrom || request.requestedAt,
                  note: request.pickedUpBy
                    ? `Released to: ${request.pickedUpBy}`
                    : isConsumable
                    ? `${consumableShort} issued and deducted from stock`
                    : "Items released to requester",
                },
              ]
            : []),
          ...(request.status === "returned"
            ? [
                {
                  id: "ret-1",
                  action: "returned" as const,
                  actor: "Property Custodian",
                  timestamp: request.requestedDateTo || request.expectedReturnDate,
                  note: "Items returned and checked back into inventory",
                },
              ]
            : []),
        ];

  // Present newest action first, matching the admin accountability timeline view
  const logs = [...rawLogs].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-detail-title"
    >
      {/* Backdrop (Click to close) */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 focus:outline-none"
      >
        {/* Highlighted Header - Code & Badge as Heroes */}
        <div className="p-5 border-b border-border bg-card shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h2
                id="request-detail-title"
                className="text-sm font-bold text-text"
              >
                Request details
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Highlighted Request Code */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/25 shadow-xs">
                  <span
                    id="request-code-highlight"
                    className="font-mono text-base font-extrabold text-accent tracking-wide"
                  >
                    {request.requestCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="Copy request code"
                    className="p-1 rounded-md text-accent hover:bg-accent/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-status-active-text" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {copied && (
                  <span className="text-[11px] font-bold text-status-active-text animate-in fade-in duration-150">
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Status, Edit & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && request.status === "pending" && (
                <button
                  type="button"
                  onClick={() => onEdit(request)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-border bg-bg-subtle text-text hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors shadow-xs cursor-pointer"
                  title="Edit request details"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-xs tracking-wide",
                  statusConfig.badge
                )}
              >
                <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                {statusConfig.label}
              </span>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close request details"
                className="h-9 w-9 rounded-xl border border-border bg-bg-subtle/60 flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-secondary pt-0.5 gap-2 flex-wrap">
            <span className="font-bold text-text">
              {isConsumable
                ? consumableHeading
                : isAssignRequest
                  ? "Assignment Request"
                  : "Borrow Request"}
            </span>
            <span>
              Submitted {formatDisplayDate(request.requestedAt)}
            </span>
          </div>
          {request.releasedSummary && (
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1.5">
              Issued allocation: {request.releasedSummary.totalReleased} of{" "}
              {request.releasedSummary.totalRequested} requested (
              {request.releasedSummary.totalRemaining} remaining)
            </p>
          )}
          {request.relatedRequests && request.relatedRequests.length > 0 && (
            <div className="pt-1">
              <LinkedRequestsNote related={request.relatedRequests} />
            </div>
          )}
        </div>

        {/* Scrollable Sheet Body - All Sections Visible at a Glance */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Notice Banner */}
          {request.status === "approved" && (
            <div className="rounded-xl border border-status-active-bg/30 bg-status-active-bg/10 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-status-active-text shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-status-active-text">
                  Request Approved
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Please proceed to the Property Custodian&apos;s Office with your staff ID to complete checkout and pickup.
                </p>
              </div>
            </div>
          )}

          {request.status === "rejected" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-destructive">
                  Request Rejected
                </p>
                <p className="text-xs text-text leading-relaxed">
                  <span className="font-semibold">Reason: </span>
                  {request.rejectionReason || "No specific reason provided."}
                </p>
              </div>
            </div>
          )}

          {request.status === "cancelled" && (
            <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3.5 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  Request Cancelled
                </p>
                <p className="text-xs text-text leading-relaxed">
                  <span className="font-semibold">Reason: </span>
                  {request.cancellationReason || "No cancellation reason provided."}
                </p>
              </div>
            </div>
          )}

          {/* Requester Details */}
          <section aria-labelledby="requester-heading" className="space-y-2">
            <h3 id="requester-heading" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-1">
              Requester Information
            </h3>
            <div className="rounded-xl border border-border bg-card p-3.5 grid grid-cols-2 gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary shrink-0" />
                <div>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Department account</p>
                  <p className="font-bold text-text mt-0.5">{request.requesterName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-text-secondary shrink-0" />
                <div>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Department</p>
                  <p className="font-bold text-text mt-0.5">{request.department}</p>
                </div>
              </div>

              {(request.requestedByName ||
                (request.requestType === "assignable" && request.assignedToName)) && (
                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-bg-subtle/40 px-2.5 py-2">
                    <User className="h-4 w-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                        Requested By
                      </p>
                      <p className="font-bold text-text mt-0.5">
                        {request.requestedByName?.trim() || request.requesterName}
                      </p>
                    </div>
                  </div>
                  {request.requestType === "assignable" && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-2.5 py-2">
                      <User className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                          Assign To
                        </p>
                        <p className="font-bold text-text mt-0.5">
                          {request.assignedToName?.trim() || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-border/50">
                <Mail className="h-4 w-4 text-text-secondary shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Email</p>
                  <p className="font-medium text-text mt-0.5 truncate">{request.requesterEmail}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Requested Items (separated by Supplies vs Materials when combined, then grouped by purpose) */}
          <section aria-labelledby="items-heading" className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 id="items-heading" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Requested Items ({request.items?.length || 0})
              </h3>
              <span className="text-[10px] text-text-secondary font-mono">
                {request.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1} Total Units
              </span>
            </div>
            {(() => {
              const allItems = request.items ?? [];
              const consumableSplit = splitByConsumableClassification(
                allItems.filter((i) => i.itemType === "consumable")
              );
              const renderItemGroups = (items: typeof allItems) =>
                groupByPurpose(items, request.purpose).map((group) => (
                  <div
                    key={group.purpose}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
                  >
                    <div className="px-3.5 py-2 bg-indigo-500/5 border-b border-indigo-500/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                        Purpose
                      </p>
                      <p className="text-xs font-semibold text-text mt-0.5">{group.purpose}</p>
                    </div>
                    <div className="divide-y divide-border">
                      {group.lines.map((item, idx) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const catMeta = getCategoryStyle(item.category as any);
                        const desc = formatItemDescription(item.itemDescription, catMeta.label, item.itemType);
                        const displayCode = formatAssetCodeDisplay(item.assetCode);
                        return (
                          <div key={idx} className="p-3.5 flex items-center gap-3.5 bg-card hover:bg-bg-subtle/40 transition-colors">
                            <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border", catMeta.bg, "border-transparent")}>
                              <Tag className={cn("h-4 w-4", catMeta.text)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-bold text-text truncate">{desc}</p>
                                {item.itemType === "consumable" && item.classification && (
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0",
                                      item.classification === "material"
                                        ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                                    )}
                                  >
                                    {item.classification === "material" ? "Material" : "Supply"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary font-mono mt-0.5">
                                {displayCode ? `${displayCode} · ` : ""}<span className="capitalize">{catMeta.label}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0 bg-bg-subtle px-2.5 py-1 rounded-md border border-border">
                              <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Qty</p>
                              <p className="font-bold text-xs text-text">
                                {formatQuantityWithUnit(item.quantity, item.unit, item.itemType)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));

              if (consumableSplit.isCombined) {
                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Supplies ({consumableSplit.supplies.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderItemGroups(consumableSplit.supplies)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <HardHat className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                          Materials ({consumableSplit.materials.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderItemGroups(consumableSplit.materials)}
                      </div>
                    </div>
                  </div>
                );
              }

              return renderItemGroups(allItems);
            })()}
          </section>

          {/* Schedule & Timing */}
          <section aria-labelledby="schedule-heading" className="space-y-2">
            <h3 id="schedule-heading" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              {isAssignRequest ? "Schedule & Allocation" : "Schedule & Dates"}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Checkout / Needed Date Card */}
              <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-950/20 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                  <span className="p-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Calendar className="h-3 w-3" />
                  </span>
                  {!hasAsset && !isAssignRequest ? "Date Needed" : "Checkout Date"}
                </div>
                <div>
                  <span className="font-bold text-sm text-text block">
                    {formatDisplayDate(request.requestedDateFrom || request.requestedAt?.split("T")[0])}
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    Submitted: {formatDisplayDate(request.requestedAt)}
                  </span>
                </div>
              </div>

              {/* Expected Return Card */}
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
              ) : hasAsset ? (
                request.status === "returned" ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      Return Status
                    </div>
                    <div>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 block">
                        Returned
                      </span>
                      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                        Expected: {formatDisplayDate(request.requestedDateTo || request.expectedReturnDate)}
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
                        {formatDisplayDate(request.requestedDateTo || request.expectedReturnDate)}
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
                        {formatDisplayDate(request.requestedDateTo || request.expectedReturnDate)}
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
                      {consumableHeading}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Purpose summary */}
          <section aria-labelledby="purpose-heading" className="space-y-2">
            <h3 id="purpose-heading" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-500" />
              Purpose summary
            </h3>
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 p-4 space-y-2 text-xs shadow-xs">
              <p className="text-sm font-semibold text-text leading-relaxed pl-0.5">
                {request.purpose}
              </p>
            </div>
          </section>

          {/* Notes if provided */}
          {request.notes && (
            <section aria-labelledby="notes-heading" className="space-y-2">
              <h3 id="notes-heading" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-1 flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                Additional Notes
              </h3>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 dark:bg-amber-950/20 p-4 space-y-2 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <StickyNote className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Requester / Custodian Remarks
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-medium leading-relaxed pl-0.5">
                  {request.notes}
                </p>
              </div>
            </section>
          )}

          {/* ── Accountability & Action History (Admin Replicated UI) ── */}
          <section aria-labelledby="logs-heading" className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 id="logs-heading" className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-accent" />
                Accountability & Action History
              </h3>
              <span className="text-[10px] text-text-secondary font-mono">
                {logs.length} Event{logs.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {logs.map((h, index) => {
                  const style = getActionStyle(h.action);
                  const icon = getActionIcon(h.action);

                  return (
                    <li key={h.id || index} className="pl-6 relative">
                      {/* Timeline Circular Node - Replicating admin action node */}
                      <span
                        className={cn(
                          "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-xs z-10",
                          style.bg,
                          (style as Record<string, string>).iconText || style.text
                        )}
                      >
                        {icon}
                      </span>

                      <div className="flex flex-col gap-1 pt-1">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className={cn("font-bold capitalize text-sm", style.text)}>
                            {style.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-right">
                            <time className="text-xs text-text-secondary font-medium">
                              {formatDateTime(h.timestamp)}
                            </time>
                            <span className="text-xs text-text-secondary/75">
                              ({formatRelativeTime(h.timestamp)})
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary font-medium">
                          By <span className="font-bold text-text">{h.actor}</span>
                        </p>
                      </div>

                      {/* Action Chips: Picked up / Returned by & Notes */}
                      <AuditNoteDisplay action={h.action} note={h.note} className="mt-2" />
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        </div>

        {/* Footer Actions (Cancel allowed for pending and approved requests before release) */}
        {(request.status === "pending" || request.status === "approved") && onCancel && (
          <div className="p-4 border-t border-border bg-card shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              {request.status === "approved"
                ? "Need to cancel this approved request before release?"
                : "Need to withdraw this pending request?"}
            </p>
            <button
              type="button"
              onClick={() => onCancel(request)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Cancel Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
