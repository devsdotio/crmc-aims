"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, ClipboardCheck, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAssetOperatorRole } from "@/constants/roles";
import { useMeQuery } from "@/features/users/client";
import { MyRequestItem, MyRequestItemSkeleton } from "./my-request-item";
import { CancelRequestDialog } from "./cancel-request-dialog";
import { EditRequestDialog } from "./edit-request-dialog";
import { RequestDetailSheet } from "./request-detail-sheet";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import type { PortalBorrowRequest, RequestStatusFilter } from "./types";
import {
  mapBorrowRequestToPortal,
  mapConsumableRequestToPortal,
  portalRequestKindLabel,
} from "./map-portal-request";

import { useBorrowRequests, useCancelBorrowRequestMutation } from "@/features/borrow-requests/client/use-borrow-requests";
import { borrowRequestQueryKeys } from "@/features/borrow-requests/client/query-keys";
import { useConsumableRequests, useCancelConsumableRequestMutation } from "@/features/consumable-requests/client";
import { consumableRequestQueryKeys } from "@/features/consumable-requests/client/query-keys";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/providers/toast-context";

const STATUS_FILTERS: {
  key: RequestStatusFilter;
  label: string;
  dot: string;
  badge: string;
  activeBadge: string;
}[] = [
  {
    key: "all",
    label: "All",
    dot: "bg-text-secondary/70",
    badge: "bg-bg-subtle text-text-secondary border border-border",
    activeBadge: "bg-bg-subtle text-text font-bold border border-border/80",
  },
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

const REQUESTS_PAGE_SIZE = 10;

export type RequestKindFilter = "all" | "borrow" | "assign" | "supply" | "material" | "mixed";

const TYPE_SUBFILTERS: { key: RequestKindFilter; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "borrow", label: "Borrow" },
  { key: "assign", label: "Assignment" },
  { key: "supply", label: "Supplies" },
  { key: "material", label: "Materials" },
  { key: "mixed", label: "Mixed" },
];

function matchesKind(request: PortalBorrowRequest, kind: RequestKindFilter) {
  if (kind === "all") return true;
  const label = portalRequestKindLabel(request);
  if (kind === "supply") return label === "Supplies";
  if (kind === "material") return label === "Materials";
  if (kind === "mixed") return label === "Mixed";
  if (kind === "assign") return label === "Assignment";
  return label === "Borrow";
}

export function MyRequestsTab({ kind = "all" }: { kind?: RequestKindFilter }) {
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("pending");
  const [subKind, setSubKind] = useState<RequestKindFilter>("all");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<PortalBorrowRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PortalBorrowRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<PortalBorrowRequest | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();

  const activeKind = kind === "all" ? subKind : kind;
  const fetchAssets = activeKind !== "supply" && activeKind !== "material" && activeKind !== "mixed";
  const fetchSupplies = activeKind !== "borrow" && activeKind !== "assign";

  const {
    data: response,
    isLoading: loadingAssets,
    isError: errorAssets,
    error: assetsError,
    refetch: refetchAssets,
  } = useBorrowRequests({
    fetchAll: true,
    requestType: activeKind === "borrow" ? "borrowable" : activeKind === "assign" ? "assignable" : undefined,
    enabled: fetchAssets,
  });
  const {
    data: supplyResponse,
    isLoading: loadingSupplies,
    isError: errorSupplies,
    error: suppliesError,
    refetch: refetchSupplies,
  } = useConsumableRequests({
    fetchAll: true,
    enabled: fetchSupplies,
  });
  const assetRequests = useMemo(() => response?.data ?? [], [response?.data]);
  const supplyRequests = useMemo(
    () => supplyResponse?.data ?? [],
    [supplyResponse?.data]
  );
  const loading =
    (fetchAssets && loadingAssets) || (fetchSupplies && loadingSupplies);
  const hasError = (fetchAssets && errorAssets) || (fetchSupplies && errorSupplies);
  const firstErrorMsg =
    (assetsError as Error | undefined)?.message ||
    (suppliesError as Error | undefined)?.message ||
    "Failed to load requests.";
  const { mutateAsync: cancelRequest } = useCancelBorrowRequestMutation();
  const { mutateAsync: cancelSupply } = useCancelConsumableRequestMutation();
  const toast = useToast();

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, kind, subKind]);

  useEffect(() => {
    if (kind !== "all" || typeof window === "undefined") return;
    const typeParam = new URLSearchParams(window.location.search).get("type");
    if (
      typeParam === "borrow" ||
      typeParam === "assign" ||
      typeParam === "supply" ||
      typeParam === "material" ||
      typeParam === "mixed"
    ) {
      setSubKind(typeParam);
    }
  }, [kind]);

  const allMappedRequests = useMemo<PortalBorrowRequest[]>(() => {
    const mappedAssets = fetchAssets ? assetRequests.map(mapBorrowRequestToPortal) : [];
    const mappedSupplies = fetchSupplies ? supplyRequests.map(mapConsumableRequestToPortal) : [];
    return [...mappedSupplies, ...mappedAssets].sort((a, b) =>
      b.requestedAt.localeCompare(a.requestedAt)
    );
  }, [assetRequests, supplyRequests, fetchAssets, fetchSupplies]);

  const mixedCount = useMemo(
    () => allMappedRequests.filter((row) => portalRequestKindLabel(row) === "Mixed").length,
    [allMappedRequests]
  );

  const requesterUserIdById = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const row of assetRequests) map.set(row.id, row.requesterUserId);
    for (const row of supplyRequests) map.set(row.id, row.requesterUserId);
    return map;
  }, [assetRequests, supplyRequests]);

  const canEditRequest = useCallback(
    (req: PortalBorrowRequest) => {
      if (req.status !== "pending" || !me) return false;
      if (isAssetOperatorRole(me.role)) return true;
      const ownerId = requesterUserIdById.get(req.id);
      return Boolean(ownerId && ownerId === me.id);
    },
    [me, requesterUserIdById]
  );

  const requests = useMemo<PortalBorrowRequest[]>(() => {
    return allMappedRequests.filter((row) => matchesKind(row, activeKind));
  }, [allMappedRequests, activeKind]);

  useEffect(() => {
    setSelectedRequest((prev) => {
      if (!prev) return prev;
      return requests.find((row) => row.id === prev.id) ?? prev;
    });
  }, [requests]);

  const handleCancelConfirmed = async (requestId: string, reason: string) => {
    const target = requests.find((r) => r.id === requestId);
    const isSupply = Boolean(
      target &&
        (target.portalKind !== undefined ||
          target.requestCode?.startsWith("CRQ-") ||
          (target.items.length > 0 &&
            target.items.every((i) => i.itemType === "consumable")))
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
    <div className="rounded-xl border border-border overflow-hidden bg-bg shadow-xs flex flex-col flex-1 min-h-0">
      <div className="px-4 md:px-6 py-3 bg-bg border-b border-border flex flex-col gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 flex-1 min-w-48 justify-end">
            <div className="relative flex-1 min-w-40 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search requests by code, item, or purpose"
                placeholder="Search request code, item, or purpose…"
                className={cn(
                  "w-full h-9 pl-8.5 pr-8 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60",
                  "focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-text-secondary hover:text-text cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {kind === "all" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mr-1">
              Type:
            </span>
            {TYPE_SUBFILTERS.map((opt) => {
              const count =
                opt.key === "all"
                  ? allMappedRequests.length
                  : allMappedRequests.filter((r) => matchesKind(r, opt.key)).length;
              const isSelected = subKind === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSubKind(opt.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-bg-subtle border-border text-text-secondary hover:text-text hover:border-text-secondary/40"
                  )}
                >
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-bg text-text-secondary border border-border/60"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(kind === "supply" || kind === "material") && mixedCount > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              You also have{" "}
              <strong className="font-bold">{mixedCount}</strong>{" "}
              mixed requisition{mixedCount === 1 ? "" : "s"} containing both supplies and materials.
            </span>
            <Link
              href="/borrower-db/requests"
              className="text-xs font-bold text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:opacity-80 shrink-0"
            >
              View in All Requests →
            </Link>
          </div>
        )}
      </div>

      {hasError && (
        <QueryErrorBanner
          message={firstErrorMsg}
          onRetry={() => {
            if (fetchAssets) void refetchAssets();
            if (fetchSupplies) void refetchSupplies();
          }}
        />
      )}

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
                ? activeKind === "supply"
                  ? "You haven't submitted any supplies requisitions yet."
                  : activeKind === "material"
                    ? "You haven't submitted any materials requisitions yet."
                    : activeKind === "mixed"
                      ? "You don't have any mixed requisitions combining supplies and materials."
                      : activeKind === "assign"
                        ? "You haven't submitted any assignment requests yet."
                        : activeKind === "borrow"
                          ? "You haven't submitted any borrow requests yet."
                          : "You haven't submitted any borrow, assignment, supplies, or materials requests yet."
                : "No requests match the selected filters."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {(statusFilter !== "all" || search.trim() || subKind !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setSubKind("all");
                    setSearch("");
                  }}
                  className="px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  Show all requests
                </button>
              )}
              <Link
                href="/borrower-db/catalog"
                className="px-3.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Browse catalog
              </Link>
            </div>
          </div>
        ) : (
          paginatedRequests.map((request) => (
            <MyRequestItem
              key={request.id}
              request={request}
              onViewDetails={(r) => setSelectedRequest(r)}
              onCancel={(r) => setCancelTarget(r)}
              onEdit={canEditRequest(request) ? (r) => setEditingRequest(r) : undefined}
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

      {/* Edit Request Dialog */}
      {editingRequest && (
        <EditRequestDialog
          request={editingRequest}
          open={Boolean(editingRequest)}
          onOpenChange={(open) => {
            if (!open) setEditingRequest(null);
          }}
          onSuccess={() => {
            setEditingRequest(null);
            setSelectedRequest(null);
            void queryClient.invalidateQueries({ queryKey: borrowRequestQueryKeys.all });
            void queryClient.invalidateQueries({ queryKey: consumableRequestQueryKeys.all });
            void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
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
          onEdit={
            canEditRequest(selectedRequest)
              ? (req) => {
                  setSelectedRequest(null);
                  setEditingRequest(req);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
