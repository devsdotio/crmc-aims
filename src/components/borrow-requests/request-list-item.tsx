"use client";
 
import { useEffect, useRef, useState } from "react";
import { Check, X, Calendar, User, Building2, Tag, Loader2, RotateCcw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatItemDescription } from "@/lib/sanitize-display";
import { purposePreviewLabel } from "@/lib/request-purpose";
import { LinkedRequestsNote } from "@/components/requests/linked-requests-note";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import { useQueryClient } from "@tanstack/react-query";
import { borrowRequestQueryKeys } from "@/features/borrow-requests/client/query-keys";
import { borrowRequestsApi } from "@/features/borrow-requests/client/borrow-requests-api";
import type { BorrowRequest,  RequestStatus } from "@/types/borrow-requests";

export interface RequestListItemProps {
  request: BorrowRequest;
  isHighlighted?: boolean;
  onSelect: (request: BorrowRequest) => void;
  onApprove?: (request: BorrowRequest) => void;
  onReject?: (request: BorrowRequest) => void;
  onEdit?: (request: BorrowRequest) => void;
  onUndoApproval?: (request: BorrowRequest) => void | Promise<void>;
  onRelease?: (request: BorrowRequest) => void | Promise<void>;
  onReturn?: (request: BorrowRequest) => void | Promise<void>;
  onMarkUnreleased?: (request: BorrowRequest) => void | Promise<void>;
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

export function RequestListItem({
  request,
  isHighlighted = false,
  onSelect,
  onApprove,
  onReject,
  onEdit,
  onUndoApproval,
  onRelease,
  onReturn,
  onMarkUnreleased,
}: RequestListItemProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMarkingUnreleased, setIsMarkingUnreleased] = useState(false);
  const resolveCategoryStyle = useCategoryStyleResolver();
  const firstItem = request.items?.[0];
  const categoryMeta = resolveCategoryStyle(firstItem?.category);
  const statusMeta = STATUS_STYLES[request.status];
  const hasReturnableAssets = request.items?.some(
    (item) => item.itemType === "asset" || Boolean(item.assetId)
  );

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const handleMarkUnreleased = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMarkUnreleased) return;
    setIsMarkingUnreleased(true);
    try {
      await onMarkUnreleased(request);
    } finally {
      setIsMarkingUnreleased(false);
    }
  };

  const qc = useQueryClient();
  const handleMouseEnter = () => {
    void qc.prefetchQuery({
      queryKey: borrowRequestQueryKeys.detail(request.id),
      queryFn: () => borrowRequestsApi.getById(request.id),
      staleTime: 45_000,
    });
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onSelect(request)}
      onMouseEnter={handleMouseEnter}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(request);
        }
      }}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-bg border-b border-border transition-all duration-200 cursor-pointer",
        isHighlighted
          ? "bg-accent/10 border-l-4 border-l-accent ring-1 ring-accent/30 shadow-xs"
          : "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      )}
    >
      {/* Left Column: Requester & Item Info */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Row 1: Code & Category Tag */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-semibold text-text-secondary">
            {request.requestCode}
          </span>
          <span className="text-text-secondary/40">·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              categoryMeta.bg,
              categoryMeta.text
            )}
          >
            <Tag className="h-2.5 w-2.5" />
            {categoryMeta.label}
          </span>
        </div>

        {/* Row 2: Item Description */}
        <h3 className="text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
          {formatItemDescription(
            firstItem?.itemDescription,
            categoryMeta.label,
            firstItem?.itemType
          )}{" "}
          {request.items.length > 1 ? `(+${request.items.length - 1} more)` : ""}
          {request.items.length === 1 && firstItem && firstItem.quantity > 1 && (
            <span className="ml-2 text-xs font-semibold text-text-secondary">
              (Qty: {firstItem.quantity})
            </span>
          )}
        </h3>

        {/* Row 3: Requester Name & Department */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
          <span className="flex items-center gap-1 font-medium text-text">
            <User className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
            {request.requestedByName || request.requesterName}
          </span>
          {request.requestedByName &&
            request.requestedByName !== request.requesterName && (
              <span className="text-text-secondary/80">
                via {request.requesterName}
              </span>
            )}
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
            {request.department}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-text-secondary/80">
            <Calendar className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
            Return by: <span className="font-semibold text-text">{request.expectedReturnDate}</span>
          </span>
          {(() => {
            const preview = purposePreviewLabel(
              request.purpose,
              (request.items ?? []).map((item) => item.purpose)
            );
            if (!preview) return null;
            return (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                <span className="truncate max-w-xs">{preview}</span>
              </span>
            );
          })()}
          <LinkedRequestsNote related={request.relatedRequests} />
        </div>
      </div>

      {/* Right Column: Status Tag & Inline Actions */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {/* Picked Up By Pill (only for Released) */}
        {request.status === "released" && request.pickedUpBy && (
          <span
            className="inline-flex items-center gap-1.5 justify-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-bg-subtle text-text-secondary border border-border"
          >
            <User className="h-3 w-3" />
            <span className="font-normal opacity-80">Picker:</span> {request.pickedUpBy}
          </span>
        )}

        {/* Status Badge */}
        <span
          className={cn(
            "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums whitespace-nowrap",
            statusMeta.bg,
            statusMeta.text
          )}
        >
          {statusMeta.label}
        </span>

        {/* Inline Actions (only for Pending requests) */}
        {request.status === "pending" && onApprove && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onApprove(request)}
              aria-label={`Approve request ${request.requestCode} from ${request.requesterName}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground cursor-pointer",
                "shadow-xs transition-colors duration-150 hover:opacity-90",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Approve
            </button>
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(request)}
                aria-label={`Reject request ${request.requestCode} from ${request.requesterName}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-text-secondary cursor-pointer",
                  "transition-colors duration-150 hover:border-destructive hover:text-destructive hover:bg-destructive/10",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                )}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
          </div>
        )}

        {/* Inline Actions (only for Approved requests) */}
        {request.status === "approved" && (onRelease || onUndoApproval) && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onUndoApproval && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUndoApproval(request);
                }}
                aria-label={`Undo approval for request ${request.requestCode}`}
                title="Undo approval and return to Pending Review"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo
              </button>
            )}
            {onRelease && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRelease) onRelease(request);
                }}
                aria-label={`Mark request ${request.requestCode} as released`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold",
                  "shadow-xs transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  "bg-accent text-accent-foreground hover:opacity-90 focus-visible:ring-accent"
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Release
              </button>
            )}
          </div>
        )}

        {/* Inline Actions (only for Released requests with returnable assets) */}
        {request.status === "released" && onReturn && hasReturnableAssets && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onReturn) onReturn(request);
              }}
              aria-label={`Mark request ${request.requestCode} as returned`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold",
                "shadow-xs transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                "bg-accent text-accent-foreground hover:opacity-90 focus-visible:ring-accent"
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Mark Returned
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
