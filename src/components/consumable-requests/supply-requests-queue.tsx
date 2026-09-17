"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Inbox,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Check,
  X,
  Send,
  User,
  Building2,
  FileText,
  Tag,
  Package,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatItemDescription } from "@/lib/sanitize-display";
import { purposePreviewLabel } from "@/lib/request-purpose";
import { LinkedRequestsNote } from "@/components/requests/linked-requests-note";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { ReleaseConsumableRequestDialog } from "@/components/consumable-requests/release-consumable-request-dialog";
import { ApproveRejectConsumableDialog } from "@/components/consumable-requests/approve-reject-consumable-dialog";
import { SupplyRequestDetailPanel } from "@/components/consumable-requests/supply-request-detail-panel";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import {
  useApproveConsumableRequestMutation,
  useCancelConsumableRequestMutation,
  useConsumableRequests,
  useRejectConsumableRequestMutation,
  useReleaseConsumableRequestMutation,
  useUndoConsumableRequestApprovalMutation,
  type ConsumableRequest,
} from "@/features/consumable-requests/client";
import type {
  ApproveConsumableRequestPayload,
  ReleaseConsumableRequestPayload,
} from "@/features/consumable-requests/client/consumable-requests-api";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: {
    bg: "bg-status-repair-bg/20",
    text: "text-status-repair-text font-bold",
    label: "Pending Review",
  },
  approved: {
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400 font-bold",
    label: "Approved",
  },
  released: {
    bg: "bg-status-active-bg/20",
    text: "text-status-active-text font-bold",
    label: "Issued",
  },
  rejected: {
    bg: "bg-destructive",
    text: "text-white font-bold",
    label: "Rejected",
  },
  cancelled: {
    bg: "bg-bg-subtle",
    text: "text-text-secondary font-bold",
    label: "Cancelled",
  },
};

export interface SupplyRequestsQueueProps {
  status?: ConsumableRequest["status"];
  searchQuery?: string;
  department?: string;
}

const SUPPLY_STATUS_THEMES: Record<
  string,
  { dot: string; badge: string; activeBadge: string }
> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    activeBadge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30",
  },
  approved: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    activeBadge: "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30",
  },
  released: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    activeBadge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30",
  },
  rejected: {
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border border-destructive/20",
    activeBadge: "bg-destructive/20 text-destructive font-bold border border-destructive/30",
  },
  cancelled: {
    dot: "bg-destructive/70",
    badge: "bg-destructive/10 text-destructive/80 border border-destructive/20",
    activeBadge: "bg-destructive/20 text-destructive font-bold border border-destructive/30",
  },
};

export function SupplyRequestStatusTabs({
  status,
  counts,
  onStatusChange,
}: {
  status: ConsumableRequest["status"] | undefined;
  counts?: Record<string, number>;
  onStatusChange: (status: ConsumableRequest["status"]) => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
        Status:
      </span>
      <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0 overflow-x-auto scrollbar-none relative">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["released", "Issued"],
            ["rejected", "Rejected"],
            ["cancelled", "Cancelled"],
          ] as const
        ).map(([id, label]) => {
          const isSelected = status === id;
          const theme = SUPPLY_STATUS_THEMES[id] || {
            dot: "bg-text-secondary",
            badge: "bg-bg-subtle text-text-secondary border border-border",
            activeBadge: "bg-bg-subtle text-text font-bold border border-border/80",
          };
          const count = counts?.[id] ?? 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onStatusChange(id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap select-none",
                isSelected
                  ? "text-text"
                  : "text-text-secondary hover:text-text"
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="supply-requests-status-tab"
                  className="absolute inset-0 rounded-lg bg-bg shadow-xs border border-border/80"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={cn("h-1.5 w-1.5 rounded-full relative z-10 shrink-0", theme.dot)}
                aria-hidden="true"
              />
              <span className="relative z-10">{label}</span>
              <span
                className={cn(
                  "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold transition-colors duration-150",
                  isSelected ? theme.activeBadge : theme.badge
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SupplyRequestsQueue({
  status = "pending",
  searchQuery = "",
  department,
}: SupplyRequestsQueueProps) {
  const { canOperate } = useAssetOperator();
  const toast = useToast();
  const resolveCategoryStyle = useCategoryStyleResolver();
  const [releaseTarget, setReleaseTarget] = useState<ConsumableRequest | null>(null);
  const [detailTarget, setDetailTarget] = useState<ConsumableRequest | null>(null);
  const [dialogState, setDialogState] = useState<{
    request: ConsumableRequest | null;
    mode: "approve" | "reject" | null;
    isOpen: boolean;
  }>({
    request: null,
    mode: null,
    isOpen: false,
  });
  const deptParam =
    department && department !== "All Departments" ? department : undefined;

  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useConsumableRequests({
      status,
      search: searchQuery.trim() || undefined,
      department: deptParam,
      limit: 50,
    });
  const rows = data?.data ?? [];
  const approve = useApproveConsumableRequestMutation();
  const reject = useRejectConsumableRequestMutation();
  const cancel = useCancelConsumableRequestMutation();
  const release = useReleaseConsumableRequestMutation();
  const undoApproval = useUndoConsumableRequestApprovalMutation();

  const [undoApprovalTarget, setUndoApprovalTarget] = useState<ConsumableRequest | null>(null);
  const [undoApprovalNote, setUndoApprovalNote] = useState("");
  const [isUndoingApproval, setIsUndoingApproval] = useState(false);

  const handleOpenUndoApproval = (row: ConsumableRequest) => {
    setUndoApprovalTarget(row);
    setUndoApprovalNote("");
  };

  const handleConfirmUndoApproval = async () => {
    if (!undoApprovalTarget) return;
    setIsUndoingApproval(true);
    try {
      await undoApproval.mutateAsync({
        id: undoApprovalTarget.id,
        note: undoApprovalNote.trim() || undefined,
      });
      toast.success(
        `Approval undone for ${undoApprovalTarget.requestCode}. Returned to Pending Review.`
      );
      if (detailTarget?.id === undoApprovalTarget.id) {
        setDetailTarget(null);
      }
      setUndoApprovalTarget(null);
      setUndoApprovalNote("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to undo approval.");
    } finally {
      setIsUndoingApproval(false);
    }
  };

  const handleOpenApproveModal = (row: ConsumableRequest) => {
    setDialogState({
      request: row,
      mode: "approve",
      isOpen: true,
    });
  };

  const handleOpenRejectModal = (row: ConsumableRequest) => {
    setDialogState({
      request: row,
      mode: "reject",
      isOpen: true,
    });
  };

  const handleCloseDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = async (
    targetRequest: ConsumableRequest,
    mode: "approve" | "reject",
    payload?: { reason?: string; approve?: ApproveConsumableRequestPayload }
  ) => {
    if (mode === "approve") {
      await approve.mutateAsync({
        id: targetRequest.id,
        payload: payload?.approve,
      });
      toast.success(`${targetRequest.requestCode} approved.`);
    } else {
      if (!payload?.reason) return;
      await reject.mutateAsync({
        id: targetRequest.id,
        reason: payload.reason,
      });
      toast.success(`${targetRequest.requestCode} rejected.`);
    }
  };

  const handleCancelApproved = async (row: ConsumableRequest) => {
    if (
      !window.confirm(
        `Cancel ${row.requestCode}? Reserved stock will be released back to available quantity.`
      )
    ) {
      return;
    }
    try {
      await cancel.mutateAsync({ id: row.id });
      toast.success(`${row.requestCode} cancelled. Reservation released.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed.");
    }
  };

  const handleReleaseConfirm = async (
    row: ConsumableRequest,
    payload: ReleaseConsumableRequestPayload
  ) => {
    await release.mutateAsync({ id: row.id, payload });
    toast.success(`${row.requestCode} issued. Stock deducted.`);
    setReleaseTarget(null);
  };

  return (
    <>

      {isError && (
        <QueryErrorBanner
          message={error?.message || "Failed to load supply requests."}
          onRetry={() => void refetch()}
        />
      )}

      <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 md:px-6 animate-pulse flex flex-col gap-2">
                <div className="h-4 w-32 bg-border rounded" />
                <div className="h-5 w-64 bg-border rounded" />
                <div className="h-4 w-48 bg-border rounded" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs",
                status === "pending"
                  ? "bg-status-active-bg/15 border-status-active-bg/30 text-status-active-text"
                  : status === "approved"
                    ? "bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400"
                    : status === "released"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                      : "bg-bg-subtle border-border text-text-secondary"
              )}
            >
              {status === "pending" ? (
                <ClipboardCheck className="h-7 w-7" strokeWidth={2} />
              ) : status === "approved" ? (
                <PackagePlus className="h-7 w-7" strokeWidth={1.8} />
              ) : status === "released" ? (
                <PackageCheck className="h-7 w-7" strokeWidth={1.8} />
              ) : status === "rejected" || status === "cancelled" ? (
                <Inbox className="h-7 w-7" strokeWidth={1.8} />
              ) : (
                <PackageSearch className="h-7 w-7" strokeWidth={1.8} />
              )}
            </span>
            <div>
              <h3 className="text-base font-bold text-text">
                {status === "pending"
                  ? "All supply requests reviewed"
                  : status === "approved"
                    ? "No approved requests pending issue"
                    : status === "released"
                      ? "No issued supply records"
                      : status === "rejected"
                        ? "No rejected supply requests"
                        : status === "cancelled"
                          ? "No cancelled supply requests"
                          : "No supply requests found"}
              </h3>
              <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
                {status === "pending"
                  ? "There are no consumable requisition requests awaiting custodian approval."
                  : status === "approved"
                    ? "All approved requisition orders have been fulfilled and disbursed."
                    : status === "released"
                      ? "Consumable items released from inventory will appear here."
                      : "No requisition logs match the selected queue filter."}
              </p>
            </div>
          </div>
        ) : (
          <ul
            className={cn(
              "divide-y divide-border transition-opacity duration-150",
              isPlaceholderData && "opacity-40"
            )}
            aria-label="Supply requests queue"
          >
            {rows.map((row) => {
              const firstLine = row.lines?.[0];
              const categoryMeta = resolveCategoryStyle(firstLine?.category);
              const statusMeta = STATUS_STYLES[row.status] || {
                bg: "bg-bg-subtle",
                text: "text-text-secondary font-bold",
                label: row.status,
              };

              return (
                <li
                  key={row.id}
                  onClick={() => setDetailTarget(row)}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-bg hover:bg-bg-subtle/80 transition-colors cursor-pointer"
                >
                  {/* Left Column: Requester & Item Info */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {/* Row 1: Code & Category Tag */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-text-secondary">
                        {row.requestCode}
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
                        firstLine?.itemName,
                        categoryMeta.label,
                        "consumable"
                      )}{" "}
                      {row.lines.length > 1 ? `(+${row.lines.length - 1} more items)` : ""}
                      {firstLine && (
                        <span className="ml-2 text-xs font-semibold text-text-secondary">
                          (Qty: {firstLine.quantityRequested} {firstLine.unit || "pcs"})
                        </span>
                      )}
                    </h3>

                    {/* Row 3: Requester Name, Department, Purpose */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1 font-medium text-text">
                        <User className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                        {row.requestedByName || row.requesterName}
                      </span>
                      {row.requestedByName &&
                        row.requestedByName !== row.requesterName && (
                          <span className="text-text-secondary/80">
                            via {row.requesterName}
                          </span>
                        )}
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                        {row.department}
                      </span>
                      {(() => {
                        const preview = purposePreviewLabel(
                          row.purpose,
                          row.lines.map((l) => l.purpose)
                        );
                        if (!preview) return null;
                        return (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                            <span className="truncate max-w-xs">{preview}</span>
                          </span>
                        );
                      })()}
                      {row.lines.length > 1 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-text-secondary/80">
                          <Package className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                          <span className="truncate max-w-sm">
                            {row.lines.map((l) => `${l.itemName} (${l.quantityRequested})`).join(", ")}
                          </span>
                        </span>
                      )}
                      <LinkedRequestsNote related={row.relatedRequests} />
                    </div>
                  </div>

                  {/* Right Column: Status Tag & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
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

                    {/* Inline Actions for Pending */}
                    {canOperate && row.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenApproveModal(row); }}
                          aria-label={`Approve request ${row.requestCode}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground",
                            "shadow-xs transition-colors duration-150 hover:opacity-90 cursor-pointer",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenRejectModal(row); }}
                          aria-label={`Reject request ${row.requestCode}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-secondary cursor-pointer",
                            "transition-colors duration-150 hover:border-destructive hover:text-destructive hover:bg-destructive/10",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                          )}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Inline Actions for Approved */}
                    {canOperate && row.status === "approved" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenUndoApproval(row); }}
                          disabled={cancel.isPending || isUndoingApproval}
                          aria-label={`Undo approval for request ${row.requestCode}`}
                          title="Undo approval and return to Pending Review"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Undo
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReleaseTarget(row); }}
                          disabled={cancel.isPending}
                          aria-label={`Issue supplies for request ${row.requestCode}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground",
                            "shadow-xs transition-colors duration-150 hover:opacity-90 cursor-pointer",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
                            "disabled:cursor-not-allowed disabled:opacity-60"
                          )}
                        >
                          <Send className="h-3.5 w-3.5" strokeWidth={2} />
                          Issue…
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleCancelApproved(row); }}
                          disabled={cancel.isPending}
                          aria-label={`Cancel approved request ${row.requestCode}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-secondary cursor-pointer",
                            "transition-colors duration-150 hover:border-destructive hover:text-destructive hover:bg-destructive/10",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1",
                            "disabled:cursor-not-allowed disabled:opacity-60"
                          )}
                        >
                          {cancel.isPending && cancel.variables?.id === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {cancel.isPending && cancel.variables?.id === row.id
                            ? "Cancelling…"
                            : "Cancel"}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ApproveRejectConsumableDialog
        request={dialogState.request}
        mode={dialogState.mode}
        isOpen={dialogState.isOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmAction}
      />

      <ReleaseConsumableRequestDialog
        request={releaseTarget}
        isOpen={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        onConfirm={handleReleaseConfirm}
      />

      <SupplyRequestDetailPanel
        request={detailTarget}
        isOpen={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        onApprove={canOperate ? (req) => { setDetailTarget(null); handleOpenApproveModal(req); } : undefined}
        onReject={canOperate ? (req) => { setDetailTarget(null); handleOpenRejectModal(req); } : undefined}
        onUndoApproval={canOperate ? (req) => { handleOpenUndoApproval(req); } : undefined}
        onRelease={canOperate ? (req) => { setDetailTarget(null); setReleaseTarget(req); } : undefined}
      />

      {/* ── Undo Approval Confirmation Modal ───────────────────────────── */}
      {undoApprovalTarget && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
          <div
            className="absolute inset-0"
            onClick={() => !isUndoingApproval && setUndoApprovalTarget(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="undo-supply-approval-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="undo-supply-approval-title"
                    className="text-base font-bold text-text leading-tight"
                  >
                    Undo Request Approval
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed font-mono">
                    {undoApprovalTarget.requestCode}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUndoApprovalTarget(null)}
                disabled={isUndoingApproval}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-text leading-relaxed">
              Are you sure you want to revert this request back to <strong className="font-semibold text-text">Pending Review</strong>? Reserved supplies will be released back into available inventory.
            </p>

            <div className="mt-4 space-y-1.5">
              <label htmlFor="undo-supply-note" className="block text-xs font-semibold text-text">
                Reason / Note <span className="text-text-secondary font-normal">(Optional)</span>
              </label>
              <textarea
                id="undo-supply-note"
                rows={3}
                value={undoApprovalNote}
                onChange={(e) => setUndoApprovalNote(e.target.value)}
                placeholder="e.g., Approved by mistake, requester asked to adjust quantities..."
                className="w-full text-xs rounded-lg border border-border bg-bg p-2.5 text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-5">
              <button
                type="button"
                onClick={() => setUndoApprovalTarget(null)}
                disabled={isUndoingApproval}
                className="h-9 px-4 text-xs font-bold text-text rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUndoApproval}
                disabled={isUndoingApproval}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isUndoingApproval && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Undo Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
