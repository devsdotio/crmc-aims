"use client";

import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useBorrowRequests,
  useApproveBorrowRequestMutation,
  useRejectBorrowRequestMutation,
  useReleaseBorrowRequestMutation,
  useMarkUnreleasedBorrowRequestMutation,
  useMarkReturnedBorrowRequestMutation,
  useUndoBorrowRequestApprovalMutation,
} from "@/features/borrow-requests/client/use-borrow-requests";
import type {
  BorrowRequest,
  TabFilter,
  BorrowRequestFilterState,
} from "@/types/borrow-requests";
import type {
  ApproveBorrowRequestPayload,
  ReleaseBorrowRequestPayload,
} from "@/features/borrow-requests/client/borrow-requests-api";
import { BorrowRequestTabs } from "@/components/borrow-requests/borrow-request-tabs";
import {
  RequestSearchAndDept,
  RequestDateFilter,
} from "@/components/borrow-requests/request-filters";
import { RequestList } from "@/components/borrow-requests/request-list";
import { RequestDetailPanel } from "@/components/borrow-requests/request-detail-panel";
import { ApproveRejectDialog } from "@/components/borrow-requests/approve-reject-dialog";
import { ReleaseDialog } from "@/components/borrow-requests/release-dialog";
import { ReturnDialog } from "@/components/borrow-requests/return-dialog";
import { EditRequestDialog } from "@/components/borrower-db/edit-request-dialog";
import {
  SupplyRequestsQueue,
  SupplyRequestStatusTabs,
} from "@/components/consumable-requests/supply-requests-queue";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import type { ConsumableRequest } from "@/features/consumable-requests/client";
import { RotateCcw, X, Loader2 } from "lucide-react";

type RequestKind = "borrow" | "assign" | "supply";

function kindToPath(kind: RequestKind): string {
  if (kind === "supply") return "/borrow-requests/supplies";
  if (kind === "assign") return "/borrow-requests/assign";
  return "/borrow-requests/borrow";
}

function BorrowRequestsContent({ kind }: { kind: RequestKind }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestIdParam =
    searchParams.get("requestId") || searchParams.get("highlightId");
  const statusParam = searchParams.get("status") as TabFilter | null;


  const approveMutation = useApproveBorrowRequestMutation();
  const rejectMutation = useRejectBorrowRequestMutation();
  const undoApprovalMutation = useUndoBorrowRequestApprovalMutation();
  const releaseMutation = useReleaseBorrowRequestMutation();
  const markUnreleasedMutation = useMarkUnreleasedBorrowRequestMutation();
  const returnMutation = useMarkReturnedBorrowRequestMutation();
  const toast = useToast();
  const { canOperate } = useAssetOperator();

  const [undoApprovalTarget, setUndoApprovalTarget] = useState<BorrowRequest | null>(null);
  const [undoApprovalNote, setUndoApprovalNote] = useState("");
  const [isUndoingApproval, setIsUndoingApproval] = useState(false);

  const [activeTab, setActiveTab] = useState<TabFilter>(
    statusParam &&
      ["pending", "approved", "rejected", "released", "returned", "all"].includes(
        statusParam
      )
      ? statusParam
      : "pending"
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(
    requestIdParam
  );
  const [editTarget, setEditTarget] = useState<BorrowRequest | null>(null);

  // Filter & Pagination State
  const [filters, setFilters] = useState<
    BorrowRequestFilterState & { page: number }
  >({
    searchQuery: "",
    department: "All Departments",
    startDate: "",
    endDate: "",
    page: 1,
  });

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useBorrowRequests({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: activeTab === "all" ? undefined : (activeTab as any),
    department:
      filters.department === "All Departments"
        ? undefined
        : filters.department,
    search: filters.searchQuery || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    page: filters.page,
    limit: 10,
    requestType: kind === "assign" ? "assignable" : "borrowable",
    enabled: kind !== "supply",
  });

  const [supplyStatus, setSupplyStatus] = useState<
    ConsumableRequest["status"] | undefined
  >("pending");
  const [supplyCounts, setSupplyCounts] = useState({
    pending: 0,
    approved: 0,
    released: 0,
    rejected: 0,
    cancelled: 0,
  });
  const handleSupplyCountsChange = useCallback(
    (counts: {
      pending: number;
      approved: number;
      released: number;
      rejected: number;
      cancelled: number;
    }) => {
      setSupplyCounts((prev) =>
        prev.pending === counts.pending &&
        prev.approved === counts.approved &&
        prev.released === counts.released &&
        prev.rejected === counts.rejected &&
        prev.cancelled === counts.cancelled
          ? prev
          : counts
      );
    },
    []
  );

  const requests = useMemo(() => response?.data ?? [], [response?.data]);
  const meta = response?.meta;

  // Modal & Drawer State
  const [selectedRequest, setSelectedRequest] =
    useState<BorrowRequest | null>(null);
  const [dialogState, setDialogState] = useState<{
    request: BorrowRequest | null;
    mode: "approve" | "reject" | null;
    isOpen: boolean;
  }>({
    request: null,
    mode: null,
    isOpen: false,
  });

  const [releaseDialogState, setReleaseDialogState] = useState<{
    request: BorrowRequest | null;
    isOpen: boolean;
  }>({
    request: null,
    isOpen: false,
  });

  const [returnDialogState, setReturnDialogState] = useState<{
    request: BorrowRequest | null;
    isOpen: boolean;
  }>({
    request: null,
    isOpen: false,
  });

  const autoOpenedIdRef = useRef<string | null>(null);

  // Sync search params if query changes
  useEffect(() => {
    if (requestIdParam) {
      setHighlightedId(requestIdParam);
    }
    if (
      statusParam &&
      ["pending", "approved", "rejected", "cancelled", "released", "returned", "all"].includes(
        statusParam
      )
    ) {
      setActiveTab(statusParam as TabFilter);
    }
  }, [requestIdParam, statusParam]);

  // When requests load, auto-select matched request into drawer once if specified in URL
  useEffect(() => {
    if (
      requestIdParam &&
      requests.length > 0 &&
      autoOpenedIdRef.current !== requestIdParam
    ) {
      const match = requests.find((r) => r.id === requestIdParam);
      if (match) {
        autoOpenedIdRef.current = requestIdParam;
        setSelectedRequest(match);
      }
    }
  }, [requestIdParam, requests]);

  // Compute live tab counts across full dataset
  const pendingCount = meta?.counts?.pending || 0;
  const approvedCount = meta?.counts?.approved || 0;
  const rejectedCount = meta?.counts?.rejected || 0;
  const cancelledCount = meta?.counts?.cancelled || 0;
  const releasedCount = meta?.counts?.released || 0;
  const returnedCount = meta?.counts?.returned || 0;
  const totalCount = meta?.counts
    ? Object.values(meta.counts).reduce((a, b) => a + (b || 0), 0)
    : 0;

  // Handlers for state updates
  const handleFilterChange = (
    updated: Partial<BorrowRequestFilterState>
  ) => {
    setHighlightedId(null);
    setFilters((prev) => ({ ...prev, ...updated, page: 1 }));
  };

  const handleResetFilters = () => {
    setHighlightedId(null);
    setFilters({
      searchQuery: "",
      department: "All Departments",
      startDate: "",
      endDate: "",
      page: 1,
    });
  };

  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
    setHighlightedId(null);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenApproveModal = (req: BorrowRequest) => {
    setDialogState({ request: req, mode: "approve", isOpen: true });
  };

  const handleOpenRejectModal = (req: BorrowRequest) => {
    setDialogState({ request: req, mode: "reject", isOpen: true });
  };

  const handleConfirmAction = async (
    req: BorrowRequest,
    mode: "approve" | "reject",
    payload?: { reason?: string; approve?: ApproveBorrowRequestPayload }
  ) => {
    try {
      if (mode === "approve") {
        await approveMutation.mutateAsync({
          id: req.id,
          payload: payload?.approve,
        });
        toast.success("Request approved successfully.");
      } else {
        await rejectMutation.mutateAsync({
          id: req.id,
          reason: payload?.reason || "Rejected by Custodian",
        });
        toast.success("Request rejected.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
      throw err;
    }

    // Keep drawer in sync if open
    if (selectedRequest && selectedRequest.id === req.id) {
      setSelectedRequest(null);
    }
  };

  const handleOpenUndoApprovalModal = (req: BorrowRequest) => {
    setUndoApprovalTarget(req);
    setUndoApprovalNote("");
  };

  const handleConfirmUndoApproval = async () => {
    if (!undoApprovalTarget) return;
    setIsUndoingApproval(true);
    try {
      await undoApprovalMutation.mutateAsync({
        id: undoApprovalTarget.id,
        note: undoApprovalNote.trim() || undefined,
      });
      toast.success(
        `Approval undone for ${undoApprovalTarget.requestCode}. Returned to Pending Review.`
      );
      if (selectedRequest && selectedRequest.id === undoApprovalTarget.id) {
        setSelectedRequest(null);
      }
      setUndoApprovalTarget(null);
      setUndoApprovalNote("");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to undo approval."
      );
    } finally {
      setIsUndoingApproval(false);
    }
  };

  const handleOpenReleaseModal = (req: BorrowRequest) => {
    setReleaseDialogState({ request: req, isOpen: true });
  };

  const handleReleaseConfirm = async (
    req: BorrowRequest,
    payload: ReleaseBorrowRequestPayload
  ) => {
    try {
      await releaseMutation.mutateAsync({ id: req.id, payload });
      toast.success("Request released for pickup.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Release failed.");
      throw err;
    }
    if (selectedRequest && selectedRequest.id === req.id) {
      setSelectedRequest(null);
    }
  };

  const handleMarkUnreleased = async (req: BorrowRequest) => {
    try {
      await markUnreleasedMutation.mutateAsync({ id: req.id });
      toast.success("Request marked as unreleased.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark as unreleased."
      );
      throw err;
    }
    if (selectedRequest && selectedRequest.id === req.id) {
      setSelectedRequest(null);
    }
  };

  const handleOpenReturnModal = (req: BorrowRequest) => {
    setReturnDialogState({ request: req, isOpen: true });
  };

  const handleReturnConfirm = async (
    req: BorrowRequest,
    payload: { returnedBy: string; note?: string }
  ) => {
    try {
      await returnMutation.mutateAsync({ id: req.id, payload });
      toast.success("Item marked as returned.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Return failed.");
      throw err;
    }
    if (selectedRequest && selectedRequest.id === req.id) {
      setSelectedRequest(null);
    }
  };

  return (
    <div
      className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md"
      data-theme="light"
    >
      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-4 pb-2 bg-bg shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-text">
          {kind === "assign"
            ? "Assign Requests"
            : kind === "supply"
              ? "Supply Requests"
              : "Borrow Requests"}
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          {kind === "assign"
            ? "Long-term department assignment requests."
            : kind === "supply"
              ? "Consumable requisitions awaiting approval and issue."
              : "Temporary equipment loans awaiting review and release."}
        </p>
        <OperatorReadOnlyBanner />
      </div>

      {/* ── Status Tabs + Filters ─────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-2.5 bg-bg border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        {kind === "supply" ? (
          <SupplyRequestStatusTabs
            status={supplyStatus}
            counts={supplyCounts}
            onStatusChange={setSupplyStatus}
          />
        ) : (
          <BorrowRequestTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            pendingCount={pendingCount}
            approvedCount={approvedCount}
            rejectedCount={rejectedCount}
            cancelledCount={cancelledCount}
            releasedCount={releasedCount}
            returnedCount={returnedCount}
            totalCount={totalCount}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 justify-end min-w-0">
          <RequestSearchAndDept
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          <RequestDateFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />
        </div>
      </div>

      {kind === "supply" ? (
        <SupplyRequestsQueue
          status={supplyStatus}
          searchQuery={filters.searchQuery}
          department={filters.department}
          onCountsChange={handleSupplyCountsChange}
        />
      ) : (
        <>
          {isError && (
            <QueryErrorBanner
              message={error?.message || "Failed to load borrow requests."}
              onRetry={() => void refetch()}
            />
          )}

          {/* ── Internal Scrollable Request List Region ────────────────────── */}
          <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
            <RequestList
          requests={requests}
          activeTab={activeTab}
          loading={isLoading && !isError}
          transitioning={isPlaceholderData}
          highlightedId={highlightedId}
          onSelect={(req) => {
            setSelectedRequest(req);
          }}
          onApprove={canOperate ? handleOpenApproveModal : undefined}
          onReject={canOperate ? handleOpenRejectModal : undefined}
          onEdit={canOperate ? (req) => setEditTarget(req) : undefined}
          onUndoApproval={canOperate ? handleOpenUndoApprovalModal : undefined}
          onRelease={canOperate ? handleOpenReleaseModal : undefined}
          onReturn={canOperate ? handleOpenReturnModal : undefined}
          onMarkUnreleased={canOperate ? handleMarkUnreleased : undefined}
        />

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg shrink-0 mt-auto">
            <span className="text-sm text-text-secondary">
              Showing{" "}
              <span className="font-medium text-text">
                {Math.min(
                  (meta.page - 1) * meta.limit + 1,
                  meta.total
                )}
              </span>{" "}
              to{" "}
              <span className="font-medium text-text">
                {Math.min(meta.page * meta.limit, meta.total)}
              </span>{" "}
              of <span className="font-medium text-text">{meta.total}</span>{" "}
              results
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={meta.page <= 1}
                className="px-3 py-1.5 text-sm font-medium text-text bg-bg border border-border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: Math.min(meta.totalPages, prev.page + 1),
                  }))
                }
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1.5 text-sm font-medium text-text bg-bg border border-border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Request Detail Slide-over Panel ───────────────────────────── */}
      <RequestDetailPanel
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => {
          setSelectedRequest(null);
          setHighlightedId(null);
          if (requestIdParam) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("requestId");
            params.delete("highlightId");
            const newQuery = params.toString();
            router.replace(
              newQuery ? `${kindToPath(kind)}?${newQuery}` : kindToPath(kind)
            );
          }
        }}
        onApprove={canOperate ? handleOpenApproveModal : undefined}
        onReject={canOperate ? handleOpenRejectModal : undefined}
        onUndoApproval={canOperate ? handleOpenUndoApprovalModal : undefined}
        onRelease={canOperate ? handleOpenReleaseModal : undefined}
        onReturn={canOperate ? handleOpenReturnModal : undefined}
        onMarkUnreleased={canOperate ? handleMarkUnreleased : undefined}
        onEdit={
          canOperate
            ? (req) => {
                setSelectedRequest(null);
                setEditTarget(req);
              }
            : undefined
        }
      />

      {/* ── Edit Request Modal ────────────────────────────────────────── */}
      {editTarget && (
        <EditRequestDialog
          request={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={() => {
            setEditTarget(null);
            refetch();
          }}
        />
      )}

      {canOperate && (
      <>
      {/* ── Approve / Reject Confirmation Modal ───────────────────────── */}
      <ApproveRejectDialog
        request={dialogState.request}
        mode={dialogState.mode}
        isOpen={dialogState.isOpen}
        onClose={() =>
          setDialogState({ request: null, mode: null, isOpen: false })
        }
        onConfirm={handleConfirmAction}
      />

      {/* ── Release Confirmation Modal ────────────────────────────────── */}
      <ReleaseDialog
        request={releaseDialogState.request}
        isOpen={releaseDialogState.isOpen}
        onClose={() =>
          setReleaseDialogState({ request: null, isOpen: false })
        }
        onConfirm={handleReleaseConfirm}
      />

      {/* ── Return Confirmation Modal ─────────────────────────────────── */}
      <ReturnDialog
        request={returnDialogState.request}
        isOpen={returnDialogState.isOpen}
        onClose={() =>
          setReturnDialogState({ request: null, isOpen: false })
        }
        onConfirm={handleReturnConfirm}
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
            aria-labelledby="undo-approval-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="undo-approval-title"
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
              Are you sure you want to revert this request back to <strong className="font-semibold text-text">Pending Review</strong>? The request will re-enter the review queue and can be re-evaluated, edited, approved, or rejected.
            </p>

            <div className="mt-4 space-y-1.5">
              <label htmlFor="undo-note" className="block text-xs font-semibold text-text">
                Reason / Note <span className="text-text-secondary font-normal">(Optional)</span>
              </label>
              <textarea
                id="undo-note"
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
      )}
        </>
      )}
    </div>
  );
}

export function BorrowRequestsPage({ kind }: { kind: RequestKind }) {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-bg-subtle p-8 text-sm text-text-secondary">
          Loading requests…
        </div>
      }
    >
      <BorrowRequestsContent kind={kind} />
    </Suspense>
  );
}

export type { RequestKind };
