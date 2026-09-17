"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  History,
  Search,
  Package,
  Download,
  RefreshCw,
  X,
  Building2,
  User,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { formatPhp } from "@/components/projects/format-money";
import {
  useStockMovementsQuery,
  useVoidStockMovementMutation,
  type StockMovement,
} from "@/features/stock-movements/client";
import {
  IssueDetailSheet,
  type IssueDetailRecord,
} from "@/components/issue-history/issue-detail-sheet";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";

type DateFilter = "all" | "today" | "7days" | "30days";

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "7days", label: "Last 7 Days" },
  { id: "30days", label: "This Month" },
];

function supplyToDetailRecord(row: StockMovement): IssueDetailRecord {
  const signed = row.direction === "out" ? `−${row.qty}` : `+${row.qty}`;
  return {
    id: `mov-${row.id}`,
    movementId: row.id,
    code: row.movementCode,
    kind: "supply",
    itemLabel: row.itemName ?? "Consumable",
    itemCode: row.itemCode ?? "",
    destination: row.destinationLabel ?? "General Inventory",
    qtyLabel: `${signed}${row.unit ? ` ${row.unit}` : ""}`,
    when: row.createdAt,
    actor: row.actorName || "Custodian",
    source: row.voided
      ? "Voided Issue"
      : row.reason === "issue"
        ? "Issued Consumable"
        : row.reason === "restock"
          ? row.notes?.toLowerCase().includes("project material line removed")
            ? "Project Line Reversed"
            : "Restocked"
          : row.reason === "adjust"
            ? "Stock Adjustment"
            : `Movement (${row.reason})`,
    extra: row.lotCode
      ? `Lot: ${row.lotCode}${row.lineTotal ? ` · ${formatPhp(Number(row.lineTotal))}` : ""}`
      : row.lineTotal
        ? formatPhp(Number(row.lineTotal))
        : undefined,
    department: row.destinationLabel || undefined,
    lotCode: row.lotCode,
    unitCost: row.unitCost,
    lineTotal: row.lineTotal,
    unit: row.unit,
    notes: row.notes,
    requestCode: row.requestId,
    voided: row.voided,
    reversalMovementCode: row.reversalMovementCode,
  };
}

function IssueHistoryContent() {
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("item") ?? "";

  const [search, setSearch] = useState(itemParam);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedRecord, setSelectedRecord] = useState<IssueDetailRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const toast = useToast();
  const { canOperate } = useAssetOperator();
  const voidMutation = useVoidStockMovementMutation();

  const {
    data: movements = [],
    isLoading: loading,
    isError: moveError,
    error: moveErr,
    refetch: refetchMoves,
    isRefetching: isRefreshing,
  } = useStockMovementsQuery({ reason: "issue", limit: 500 });

  const departments = useMemo(() => {
    const set = new Set<string>();
    movements.forEach((m) => m.destinationLabel && set.add(m.destinationLabel));
    return Array.from(set).sort();
  }, [movements]);

  const allRecords = useMemo(
    () =>
      movements
        .map(supplyToDetailRecord)
        .sort((a, b) => b.when.localeCompare(a.when)),
    [movements]
  );

  const filteredRecords = useMemo(() => {
    let result = allRecords;

    if (departmentFilter !== "all") {
      result = result.filter(
        (r) =>
          r.destination.toLowerCase() === departmentFilter.toLowerCase() ||
          r.department?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === "today") {
        result = result.filter((r) => new Date(r.when) >= startOfDay);
      } else if (dateFilter === "7days") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter((r) => new Date(r.when) >= weekAgo);
      } else if (dateFilter === "30days") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter((r) => new Date(r.when) >= monthAgo);
      }
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.itemLabel.toLowerCase().includes(q) ||
          r.itemCode.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          (r.actor ?? "").toLowerCase().includes(q) ||
          (r.extra ?? "").toLowerCase().includes(q) ||
          (r.lotCode ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allRecords, departmentFilter, dateFilter, search]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.info("No records available to export.");
      return;
    }

    const headers = [
      "Movement Code",
      "Item Code",
      "Item Description",
      "Quantity",
      "Destination",
      "Issued By",
      "Date Issued",
      "Lot Code",
      "Valuation Total",
    ];

    const rowsData = filteredRecords.map((r) => [
      r.code,
      r.itemCode,
      `"${(r.itemLabel || "").replace(/"/g, '""')}"`,
      r.qtyLabel,
      `"${(r.destination || "").replace(/"/g, '""')}"`,
      `"${(r.actor || "").replace(/"/g, '""')}"`,
      new Date(r.when).toISOString(),
      r.lotCode || "",
      r.lineTotal || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rowsData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `consumable-issue-history-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredRecords.length} supply issues to CSV.`);
  };

  const handleRefresh = async () => {
    await refetchMoves();
    toast.success("Consumable issue history updated.");
  };

  const handleVoidIssue = async (record: IssueDetailRecord, reason: string) => {
    if (!record.movementId) return;
    try {
      await voidMutation.mutateAsync({
        id: record.movementId,
        payload: { reason: reason || undefined },
      });
      toast.success(
        `${record.code} undone — ${record.qtyLabel.replace(/^−/, "")} restocked to inventory.`
      );
      setSelectedRecord(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to undo supply issue.");
      throw err;
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md">
      <div className="px-4 md:px-6 pt-5 pb-4 bg-bg shrink-0 border-b border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              Issue History
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Consumable supply issues and dispatches (<span className="font-mono font-bold">MOV-</span>). Asset custody lives in the Custody Log.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh supply issue records"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <History className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-bold text-text tabular-nums">{filteredRecords.length}</span>
              {" "}
              supply issue{filteredRecords.length === 1 ? "" : "s"}
              {filteredRecords.length !== allRecords.length
                ? ` (of ${allRecords.length})`
                : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-72 justify-end">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search code, item, destination, or issuer…"
                className="w-full h-9 pl-8.5 pr-8 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-secondary hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {departments.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-text-secondary shrink-0">
                  Dept:
                </span>
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent shrink-0 cursor-pointer"
                >
                  <option value="all">All Destinations</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-text-secondary shrink-0">
                Date:
              </span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as DateFilter);
                  setPage(1);
                }}
                className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent shrink-0 cursor-pointer"
              >
                {DATE_FILTERS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {moveError && (
        <QueryErrorBanner
          message={
            moveErr?.message ||
            "Unable to load consumable issue records. Please check your network."
          }
          onRetry={() => {
            void refetchMoves();
          }}
        />
      )}

      <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-card border border-border flex items-center justify-between px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-24 bg-border/70 rounded" />
                  <div className="h-4 w-40 bg-border/50 rounded" />
                </div>
                <div className="h-4 w-28 bg-border/50 rounded" />
              </div>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-active-bg/10 border border-status-active-bg/25 text-status-active-text shadow-xs mb-3">
              <Package className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <p className="text-base font-bold text-text">No Supply Issues Found</p>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              {search || departmentFilter !== "all" || dateFilter !== "all"
                ? "No consumable issues match your filters. Try resetting search or date range."
                : "Consumable dispatches will appear here when supplies are issued from inventory."}
            </p>
            {(search || departmentFilter !== "all" || dateFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDepartmentFilter("all");
                  setDateFilter("all");
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer text-text"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col min-h-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-bg-subtle/95 backdrop-blur-xs border-b border-border z-10 select-none">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Movement Code
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Item Description
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                    Quantity / Valuation
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary hidden md:table-cell">
                    Issued Date
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRecords.map((row) => {
                  const dateStr = new Date(row.when).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = new Date(row.when).toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRecord(row)}
                      className="hover:bg-bg-subtle/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg shrink-0 bg-status-active-bg/20 text-status-active-text">
                            <Package className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-text group-hover:text-accent transition-colors">
                                {row.code}
                              </span>
                              {row.voided && (
                                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30">
                                  Voided
                                </span>
                              )}
                            </div>
                            {row.source && (
                              <div className="text-[10px] text-text-secondary mt-0.5">
                                {row.source}
                                {row.voided ? " · restocked" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-bold text-text truncate max-w-55">
                          {row.itemLabel}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary mt-0.5">
                          <span>{row.itemCode}</span>
                          {row.lotCode && (
                            <span className="bg-bg-subtle px-1 py-0.2 rounded border border-border text-[10px]">
                              Lot: {row.lotCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 font-semibold text-text">
                          <Building2 className="h-3 w-3 text-text-secondary shrink-0" />
                          <span className="truncate max-w-45">{row.destination}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-text-secondary mt-0.5">
                          <User className="h-3 w-3 text-text-secondary/70 shrink-0" />
                          <span className="truncate max-w-37.5">{row.actor}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle hidden sm:table-cell">
                        <span className="font-mono font-bold text-text">{row.qtyLabel}</span>
                        {row.lineTotal && (
                          <p className="text-[11px] text-status-active-text font-mono font-semibold">
                            {formatPhp(Number(row.lineTotal))}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-middle hidden md:table-cell">
                        <p className="font-medium text-text">{dateStr}</p>
                        <p className="text-[11px] text-text-secondary">{timeStr}</p>
                      </td>

                      <td className="px-4 py-3.5 align-middle text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(row);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-text-secondary group-hover:text-accent rounded-md border border-border group-hover:border-accent/40 bg-bg transition-colors"
                        >
                          <span>Details</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRecords.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-bg shrink-0 mt-auto">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    Showing{" "}
                    <span className="font-bold text-text">
                      {Math.min((page - 1) * pageSize + 1, filteredRecords.length)}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-text">
                      {Math.min(page * pageSize, filteredRecords.length)}
                    </span>{" "}
                    of <span className="font-bold text-text">{filteredRecords.length}</span>{" "}
                    results
                  </span>

                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-7 px-2 text-xs bg-bg-subtle border border-border rounded text-text font-semibold focus:outline-none"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-semibold text-text bg-bg border border-border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-mono font-bold text-text px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-semibold text-text bg-bg border border-border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <IssueDetailSheet
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        canOperate={canOperate}
        onVoidIssue={canOperate ? handleVoidIssue : undefined}
      />
    </div>
  );
}

export default function IssueHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-xs text-text-secondary bg-bg-subtle">
          Loading consumable issue history…
        </div>
      }
    >
      <IssueHistoryContent />
    </Suspense>
  );
}
