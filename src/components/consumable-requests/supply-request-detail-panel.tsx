"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Check,
  Mail,
  Phone,
  Building2,
  Tag,
  History,
  User,
  Package,
  PackageMinus,
  XCircle,
  CheckCircle,
  Send,
  DollarSign,
  RotateCcw,
  FileText,
  StickyNote,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { groupByPurpose } from "@/lib/request-purpose";
import { LinkedRequestsNote } from "@/components/requests/linked-requests-note";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import { ActionHistoryTimeline } from "@/components/audit-logs/audit-log-utils";
import type { ConsumableRequest } from "@/features/consumable-requests/client";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-amber-500/15",  text: "text-amber-700 dark:text-amber-300 font-bold",   label: "Pending Review" },
  approved:  { bg: "bg-blue-500/15",   text: "text-blue-700 dark:text-blue-300 font-bold",     label: "Approved" },
  released:  { bg: "bg-emerald-500/15",text: "text-emerald-700 dark:text-emerald-300 font-bold",label: "Issued" },
  rejected:  { bg: "bg-red-500/12",    text: "text-red-700 dark:text-red-400 font-bold",       label: "Rejected" },
  cancelled: { bg: "bg-bg-subtle",     text: "text-text-secondary font-bold",                  label: "Cancelled" },
};

export interface SupplyRequestDetailPanelProps {
  request: ConsumableRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (request: ConsumableRequest) => void;
  onReject?: (request: ConsumableRequest) => void;
  onUndoApproval?: (request: ConsumableRequest) => void;
  onRelease?: (request: ConsumableRequest) => void;
}

export function SupplyRequestDetailPanel({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onUndoApproval,
  onRelease,
}: SupplyRequestDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resolveCategoryStyle = useCategoryStyleResolver();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (!request) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <aside className="relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 animate-in slide-in-from-right duration-250 ease-in-out">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
            <div className="h-6 w-36 bg-border/60 rounded-md animate-pulse" />
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-text-secondary">Loading details…</p>
          </div>
        </aside>
      </div>
    );
  }

  const statusMeta = STATUS_STYLES[request.status] ?? {
    bg: "bg-bg-subtle",
    text: "text-text-secondary font-bold",
    label: request.status,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supply-detail-heading"
        className="relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden animate-in slide-in-from-right duration-250 ease-in-out"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="supply-detail-heading" className="font-mono text-lg font-bold tracking-tight text-text">
                {request.requestCode}
              </h2>
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border border-border/50", statusMeta.bg, statusMeta.text)}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{request.relativeTime}</p>
            {request.relatedRequests && request.relatedRequests.length > 0 && (
              <div className="mt-1.5">
                <LinkedRequestsNote related={request.relatedRequests} />
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0" aria-label="Close panel">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Requester */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Requester
            </h3>
            <div className="p-4 rounded-xl border border-border bg-bg space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">{request.requesterName}</p>
                  <p className="text-[10px] uppercase tracking-wide text-text-secondary mt-0.5">Department account</p>
                  {request.requestedByName && (
                    <p className="text-xs text-text-secondary mt-1.5">
                      Requested by: <span className="font-semibold text-text">{request.requestedByName}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-text-secondary">
                    {request.requesterEmail && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /> {request.requesterEmail}</span>
                    )}
                    {request.requesterPhone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {request.requesterPhone}</span>
                    )}
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3 shrink-0" /> {request.department}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purpose & Notes */}
          {(request.purpose || request.notes) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-500" /> Purpose & Notes
              </h3>
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 p-4 space-y-3 text-xs shadow-xs">
                {request.purpose && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                        Purpose of Requisition
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text leading-relaxed pl-0.5">
                      {request.purpose}
                    </p>
                  </div>
                )}
                {request.notes && (
                  <div className={cn(request.purpose && "pt-2.5 border-t border-indigo-500/15")}>
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
          )}

          {/* Rejection reason */}
          {request.rejectionReason && (
            <div className="p-3 rounded-xl border border-red-500/25 bg-red-500/8 flex gap-2.5">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-0.5">Rejection Reason</p>
                <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{request.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {request.cancellationReason && (
            <div className="p-3 rounded-xl border border-orange-500/25 bg-orange-500/8 flex gap-2.5">
              <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-0.5">Cancellation Reason</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">{request.cancellationReason}</p>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Requested Items ({request.lines.length})
            </h3>
            <div className="space-y-3">
              {groupByPurpose(request.lines, request.purpose).map((group) => (
                <div key={group.purpose} className="rounded-xl border border-border bg-bg overflow-hidden">
                  <div className="px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Purpose</p>
                    <p className="text-xs font-semibold text-text mt-0.5">{group.purpose}</p>
                  </div>
                  {group.lines.map((line, i) => {
                const catMeta = resolveCategoryStyle(line.category);
                return (
                  <div key={line.id} className={cn("flex items-start gap-3 p-3", i !== 0 && "border-t border-border")}>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", catMeta.bg)}>
                      <Package className={cn("h-3.5 w-3.5", catMeta.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-text truncate">{line.itemName}</p>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase shrink-0", catMeta.bg, catMeta.text)}>
                          <Tag className="h-2.5 w-2.5" />{catMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary">
                        <span className="font-mono">{line.itemCode}</span>
                        <span className="font-semibold text-text">Qty: {line.quantityRequested} {line.unit || "pcs"}</span>
                      </div>
                      {line.notes && <p className="text-xs text-text-secondary mt-1 italic">{line.notes}</p>}
                    </div>
                  </div>
                  );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Details */}
          {request.status === "released" && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <PackageMinus className="h-3.5 w-3.5" /> Fulfillment Details
              </h3>
              <div className="p-3.5 rounded-xl border border-border bg-bg space-y-2.5">
                {request.receivedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-text-secondary">Received by:</span>
                    <span className="font-bold text-text">{request.receivedBy}</span>
                  </div>
                )}
                {request.releasedByName && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-text-secondary">Released by:</span>
                    <span className="font-bold text-text">{request.releasedByName}</span>
                  </div>
                )}
                {request.totalCost && parseFloat(request.totalCost) > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-text-secondary">Total Cost:</span>
                    <span className="font-bold text-text">
                      &#8369;{parseFloat(request.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approved banner */}
          {request.status === "approved" && request.approvedByName && (
            <div className="p-3 rounded-xl border border-blue-500/25 bg-blue-500/8 flex gap-2.5">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">
                  Approved by {request.approvedByName}
                </p>
                {request.approvedAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {new Date(request.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action History */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Action History
            </h3>
            <ActionHistoryTimeline entries={request.history} />
          </div>
        </div>

        {/* Footer — pending */}
        {request.status === "pending" && (onApprove || onReject) && (
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(request)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                Reject
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={() => onApprove(request)}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Approve Request
              </button>
            )}
          </div>
        )}

        {/* Footer — approved */}
        {request.status === "approved" && (onRelease || onUndoApproval) && (
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
            {onUndoApproval && (
              <button
                type="button"
                onClick={() => onUndoApproval(request)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo Approval
              </button>
            )}
            {onRelease && (
              <button
                type="button"
                onClick={() => onRelease(request)}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Send className="h-4 w-4" />
                Issue Supplies
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
