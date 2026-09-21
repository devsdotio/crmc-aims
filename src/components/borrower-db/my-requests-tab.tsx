"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, ClipboardCheck, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { MyRequestItem, MyRequestItemSkeleton } from "./my-request-item";
import { CancelRequestDialog } from "./cancel-request-dialog";
import { RequestDetailSheet } from "./request-detail-sheet";
import type { PortalBorrowRequest, RequestStatusFilter } from "./types";
import {
  mapBorrowRequestToPortal,
  mapConsumableRequestToPortal,
  portalRequestKindLabel,
} from "./map-portal-request";

import { useBorrowRequests, useCancelBorrowRequestMutation } from "@/features/borrow-requests/client/use-borrow-requests";
import { useConsumableRequests, useCancelConsumableRequestMutation } from "@/features/consumable-requests/client";
import { useToast } from "@/components/providers/toast-context";

const STATUS_FILTERS: {
  key: RequestStatusFilter;
  label: string;
  dot: string;
  badge: string;
  activeBadge: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    activeBadge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30",
  },
  {
    key: "approved",
    label: "Approved",
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    activeBadge: "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30",
  },
  {
    key: "returned",
    label: "Issued / Completed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    activeBadge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30",
  },
  {
    key: "rejected",
    label: "Rejected",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border border-destructive/20",
    activeBadge: "bg-destructive/20 text-destructive font-bold border border-destructive/30",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    dot: "bg-orange-500",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20",
    activeBadge: "bg-orange-500/20 text-orange-800 dark:text-orange-300 font-bold border border-orange-500/30",
  },
];

const ALL_REQUESTS_FILTER = {
  key: "all" as const,
  label: "All Requests",
  dot: "bg-text-secondary/70",
  badge: "bg-bg-subtle text-text-secondary border border-border",
  activeBadge: "bg-bg-subtle text-text font-bold border border-border/80",
};

const REQUESTS_PAGE_SIZE = 10;

export type RequestKindFilter = "all" | "borrow" | "assign" | "supply";

function matchesKind(request: PortalBorrowRequest, kind: RequestKindFilter) {
  if (kind === "all") return true;
  const label = portalRequestKindLabel(request);
  if (kind === "supply") return label === "Supplies";
  if (kind === "assign") return label === "Assignment";
  return label === "Borrow";
}

export function MyRequestsTab({ kind = "all" }: { kind?: RequestKindFilter }) {
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<PortalBorrowRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PortalBorrowRequest | null>(null);
  const [page, setPage] = useState(1);

  const fetchAssets = kind !== "supply";
  const fetchSupplies = kind !== "borrow" && kind !== "assign";

  const { data: response, isLoading: loadingAssets } = useBorrowRequests({
    limit: 100,
    requestType: kind === "borrow" ? "borrowable" : kind === "assign" ? "assignable" : undefined,
    enabled: fetchAssets,
  });
  const { data: supplyResponse, isLoading: loadingSupplies } = useConsumableRequests({
    limit: 100,
    enabled: fetchSupplies,
  });
  const assetRequests = useMemo(() => response?.data ?? [], [response?.data]);
  const supplyRequests = useMemo(
    () => supplyResponse?.data ?? [],
    [supplyResponse?.data]
  );
  const loading =
    (fetchAssets && loadingAssets) || (fetchSupplies && loadingSupplies);
  const { mutateAsync: cancelRequest } = useCancelBorrowRequestMutation();
  const { mutateAsync: cancelSupply } = useCancelConsumableRequestMutation();
  const toast = useToast();

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, kind]);

  const requests = useMemo<PortalBorrowRequest[]>(() => {
    const mappedAssets = assetRequests.map(mapBorrowRequestToPortal);
    const mappedSupplies = supplyRequests.map(mapConsumableRequestToPortal);
    return [...mappedSupplies, ...mappedAssets]
      .filter((row) => matchesKind(row, kind))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }, [assetRequests, supplyRequests, kind]);

  useEffect(() => {
    setSelectedRequest((prev) => {
      if (!prev) return prev;
      return requests.find((row) => row.id === prev.id) ?? prev;
    });
  }, [requests]);

  const handleCancelConfirmed = async (requestId: string, reason: string) => {
    const target = requests.find((r) => r.id === requestId);
    const isSupply = Boolean(
      target?.items.every((i) => i.itemType === "consumable")
    );
    try {
      if (isSupply) {
        await cancelSupply({ id: requestId, reason, note: reason });
      } else {
        await cancelRequest({ id: requestId, reason, note: reason });
      }
      toast.success("Request cancelled successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel request."
      );
    }
  };

  const matchesFilter = (r: PortalBorrowRequest, key: RequestStatusFilter) => {
    if (key === "all") return true;
    if (key === "returned") {
      return r.status === "returned" || r.status === "released";
    }
    return r.status === key;
  };

  const filtered = useMemo(() => {
    return requests
      .filter((r) => matchesFilter(r, statusFilter))
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const code = (r.requestCode || "").toLowerCase();
        const purpose = (r.purpose || "").toLowerCase();
        const items = r.items?.map((it) => it.itemDescription.toLowerCase()).join(" ") || "";
        return code.includes(q) || purpose.includes(q) || items.includes(q);
      });
  }, [requests, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REQUESTS_PAGE_SIZE));
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * REQUESTS_PAGE_SIZE;
    return filtered.slice(start, start + REQUESTS_PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-bg shadow-xs flex flex-col min-h-0">
      {/* Toolbar: status chips left, All Requests + search right */}
      <div className="px-4 md:px-6 py-3 bg-bg border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
            Status:
          </span>
          <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0 overflow-x-auto scrollbar-none relative">
            {STATUS_FILTERS.map((f) => {
              const count = requests.filter((r) => matchesFilter(r, f.key)).length;
              const isSelected = statusFilter === f.key;

              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap select-none",
                    isSelected
                      ? "text-text"
                      : "text-text-secondary hover:text-text"
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId={`borrower-my-requests-active-tab-${kind}`}
                      className="absolute inset-0 rounded-lg bg-bg shadow-xs border border-border/80"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full relative z-10 shrink-0", f.dot)}
                    aria-hidden="true"
                  />
                  <span className="relative z-10">{f.label}</span>
                  <span
                    className={cn(
                      "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold transition-colors duration-150",
                      isSelected ? f.activeBadge : f.badge
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Requests (opposite side) + Search */}
        <div className="flex items-center gap-2 flex-1 min-w-48 justify-end">
          <button
            type="button"
            onClick={() => setStatusFilter(ALL_REQUESTS_FILTER.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors duration-150 cursor-pointer whitespace-nowrap select-none shrink-0",
              statusFilter === "all"
                ? "text-text bg-bg shadow-xs border-border/80"
                : "text-text-secondary hover:text-text border-border bg-bg-subtle"
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full shrink-0", ALL_REQUESTS_FILTER.dot)}
              aria-hidden="true"
            />
            <span>{ALL_REQUESTS_FILTER.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold",
                statusFilter === "all"
                  ? ALL_REQUESTS_FILTER.activeBadge
                  : ALL_REQUESTS_FILTER.badge
              )}
            >
              {requests.length}
            </span>
          </button>
          <div className="relative flex-1 min-w-40 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request code, item, or purpose…"
              className={cn(
                "w-full h-9 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60",
                "focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              )}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-bg divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <MyRequestItemSkeleton key={i} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs mb-3",
                statusFilter === "pending"
                  ? "bg-status-active-bg/15 border-status-active-bg/30 text-status-active-text"
                  : statusFilter === "approved"
                    ? "bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400"
                    : statusFilter === "cancelled"
                      ? "bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400"
                      : "bg-bg-subtle border-border text-text-secondary"
              )}
            >
              {statusFilter === "pending" ? (
                <ClipboardCheck className="h-7 w-7" strokeWidth={2} />
              ) : (
                <Inbox className="h-7 w-7" strokeWidth={1.8} />
              )}
            </span>
            <h3 className="text-base font-bold text-text">
              {statusFilter === "all"
                ? "No requests found"
                : `No ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()} requests`}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              {statusFilter === "all"
                ? kind === "supply"
                  ? "You haven't submitted any supply requisitions yet."
                  : kind === "assign"
                    ? "You haven't submitted any assignment requests yet."
                    : kind === "borrow"
                      ? "You haven't submitted any borrow requests yet."
                      : "You haven't submitted any borrow, assignment, or supply requests yet."
                : "No requests match the selected status filter."}
            </p>
          </div>
        ) : (
          paginatedRequests.map((request) => (
            <MyRequestItem
              key={request.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              request={request as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onViewDetails={(r) => setSelectedRequest(r as any)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onCancel={(r) => setCancelTarget(r as any)}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-bg shrink-0">
          <p className="text-xs text-text-secondary">
            Page <span className="font-semibold text-text">{page}</span> of{" "}
            <span className="font-semibold text-text">{totalPages}</span> (
            {filtered.length} total request{filtered.length !== 1 ? "s" : ""})
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <CancelRequestDialog
          request={cancelTarget}
          open={Boolean(cancelTarget)}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          onConfirm={async (reason: string) => {
            await handleCancelConfirmed(cancelTarget.id, reason);
            setCancelTarget(null);
          }}
        />
      )}

      {/* Request Detail Sheet */}
      {selectedRequest && (
        <RequestDetailSheet
          request={selectedRequest}
          open={Boolean(selectedRequest)}
          onOpenChange={(open) => {
            if (!open) setSelectedRequest(null);
          }}
          onCancel={(req) => {
            setSelectedRequest(null);
            setCancelTarget(req);
          }}
        />
      )}
    </div>
  );
}
