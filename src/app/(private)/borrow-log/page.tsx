"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Repeat,
  Search,
  Box,
  Building2,
  Calendar,
  User,
  RotateCcw,
  Download,
  RefreshCw,
  X,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/constants/categories";
import { OverdueBadge } from "@/components/ui/overdue-badge";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { ReturnLogDialog } from "@/components/borrow-log/return-log-dialog";
import { BorrowLogDetailSheet } from "@/components/borrow-log/borrow-log-detail-sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import {
  useBorrowLogQuery,
  useHardDeleteBorrowMutation,
  useReturnBorrowMutation,
  useVoidBorrowMutation,
  type BorrowLogRecord,
} from "@/features/borrow-log/client";

type LogTab = "all" | "active" | "overdue" | "returned";
type CustodyMode = "borrow" | "assignment";

const BORROW_TABS: { id: LogTab; label: string }[] = [
  { id: "all", label: "All Records" },
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "returned", label: "Returned" },
];

const ASSIGNMENT_TABS: { id: LogTab; label: string }[] = [
  { id: "all", label: "All Records" },
  { id: "active", label: "Active" },
  { id: "returned", label: "Returned / Voided" },
];

function BorrowLogContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") || searchParams.get("status");
  const custodyParam = searchParams.get("custody") || searchParams.get("custodyKind");
  const initialTab: LogTab =
    filterParam === "overdue" ||
    filterParam === "active" ||
    filterParam === "returned"
      ? filterParam
      : "all";
  const initialCustody: CustodyMode =
    custodyParam === "assignment" || custodyParam === "assignable"
      ? "assignment"
      : "borrow";

  const [tab, setTab] = useState<LogTab>(initialTab);
  const [custodyMode, setCustodyMode] = useState<CustodyMode>(initialCustody);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [returnTarget, setReturnTarget] = useState<BorrowLogRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<BorrowLogRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BorrowLogRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const statusTabs = custodyMode === "assignment" ? ASSIGNMENT_TABS : BORROW_TABS;
  const isAssignmentMode = custodyMode === "assignment";

  // Sync state when URL params change from external links or navigation
  useEffect(() => {
    if (filterParam === "overdue" || filterParam === "active" || filterParam === "returned") {
      setTab(filterParam);
    } else if (filterParam === "all") {
      setTab("all");
    }
  }, [filterParam]);

  useEffect(() => {
    if (custodyParam === "assignment" || custodyParam === "assignable") {
      setCustodyMode("assignment");
    } else if (custodyParam === "borrow" || custodyParam === "borrowable") {
      setCustodyMode("borrow");
    }
  }, [custodyParam]);

  // Assignments have no due dates — drop overdue tab if we landed on it.
  useEffect(() => {
    if (isAssignmentMode && tab === "overdue") {
      setTab("active");
    }
  }, [isAssignmentMode, tab]);

  const toast = useToast();
  const { canOperate, role } = useAssetOperator();
  const canHardDelete = role === "superadmin";

  const {
    data: allRecords = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useBorrowLogQuery({
    custodyKind: isAssignmentMode ? "assignment" : "borrow",
  });

  const returnMutation = useReturnBorrowMutation();
  const voidMutation = useVoidBorrowMutation();
  const hardDeleteMutation = useHardDeleteBorrowMutation();

  // Extract unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => r.department && set.add(r.department));
    return Array.from(set).sort();
  }, [allRecords]);

  // Base filtered records (excluding status tab) for accurate badge counts
  const baseFilteredRecords = useMemo(() => {
    let result = allRecords;

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter(
        (r) => r.department?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.logCode.toLowerCase().includes(q) ||
          r.assetCode.toLowerCase().includes(q) ||
          r.assetName.toLowerCase().includes(q) ||
          r.borrowerName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          (r.requestCode ?? "").toLowerCase().includes(q) ||
          (r.borrowerEmail ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allRecords, departmentFilter, search]);

  // Tab counts based on active search and department filters
  const counts = useMemo(() => {
    return {
      all: baseFilteredRecords.length,
      active: baseFilteredRecords.filter((r) => r.status === "active").length,
      overdue: baseFilteredRecords.filter((r) => r.status === "overdue").length,
      returned: baseFilteredRecords.filter(
        (r) => r.status === "returned" || r.status === "voided"
      ).length,
    };
  }, [baseFilteredRecords]);

  // Final filtered records for current status tab
  const filteredRecords = useMemo(() => {
    if (tab === "all") return baseFilteredRecords;
    if (tab === "returned") {
      return baseFilteredRecords.filter(
        (r) => r.status === "returned" || r.status === "voided"
      );
    }
    return baseFilteredRecords.filter((r) => r.status === tab);
  }, [baseFilteredRecords, tab]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleReturn = async (payload: {
    condition: "good" | "damaged" | "needs_repair";
    conditionNotes?: string;
    flagMaintenance?: boolean;
  }) => {
    if (!returnTarget) return;
    try {
      await returnMutation.mutateAsync({
        id: returnTarget.id,
        payload,
      });
      toast.success(`${returnTarget.assetCode} marked returned.`);
      if (selectedRecord?.id === returnTarget.id) {
        setSelectedRecord(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record return.");
      throw err;
    }
  };

  const handleVoidIssue = async (record: BorrowLogRecord, reason: string) => {
    try {
      await voidMutation.mutateAsync({
        id: record.id,
        payload: { reason: reason || undefined },
      });
      toast.success(`${record.assetCode} issue voided — asset restored to stock.`);
      setSelectedRecord(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void issue.");
      throw err;
    }
  };

  const handleHardDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hardDeleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.logCode} permanently deleted.`);
      if (selectedRecord?.id === deleteTarget.id) {
        setSelectedRecord(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete custody log."
      );
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Custody log updated.");
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.info("No records available to export.");
      return;
    }

    const headers = [
      "Log Code",
      "Asset Code",
      "Asset Name",
      "Category",
      "Borrower / Holder",
      "Department",
      "Released Date",
      "Due Date",
      "Status",
      "Returned Date",
      "Condition",
      "Released By",
    ];

    const rowsData = filteredRecords.map((r) => [
      r.logCode,
      r.assetCode,
      `"${(r.assetName || "").replace(/"/g, '""')}"`,
      r.category || "",
      `"${(r.borrowerName || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      r.releasedAt ? new Date(r.releasedAt).toISOString() : "",
      r.dueDate ? new Date(r.dueDate).toISOString() : "",
      r.status,
      r.returnedAt ? new Date(r.returnedAt).toISOString() : "",
      r.conditionOnReturn || "",
      `"${(r.releasedBy || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rowsData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `borrow-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      `Exported ${filteredRecords.length} ${isAssignmentMode ? "assignment" : "borrow"} records to CSV.`
    );
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md">
      {/* Top Banner Header */}
      <div className="px-4 md:px-6 pt-5 pb-4 bg-bg shrink-0 border-b border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text leading-tight">
                  Custody Log
                </h1>
                <p className="text-xs text-text-secondary mt-0.5">
                  {isAssignmentMode
                    ? "Track assignable assets issued to departments or projects — return, or undo mistaken issues."
                    : "Track borrowable asset loans, overdue returns, and check-ins."}{" "}
                  (<span className="font-mono font-bold">LOG-</span>)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefetching || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh borrow records"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Custody kind + status filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
                Custody:
              </span>
              <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0">
                {(
                  [
                    { id: "borrow" as const, label: "Borrowed" },
                    { id: "assignment" as const, label: "Assigned" },
                  ] as const
                ).map((item) => {
                  const isSelected = custodyMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCustodyMode(item.id);
                        setTab("all");
                        setPage(1);
                        setSelectedRecord(null);
                      }}
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer select-none",
                        isSelected
                          ? "bg-bg text-text shadow-xs border border-border"
                          : "text-text-secondary hover:text-text"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
                Status:
              </span>
              <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0 relative">
                {statusTabs.map((item) => {
                  const isSelected = tab === item.id;
                  const count = counts[item.id];

                  const dotColor =
                    item.id === "active"
                      ? "bg-blue-500"
                      : item.id === "overdue"
                        ? "bg-destructive"
                        : item.id === "returned"
                          ? "bg-emerald-500"
                          : "bg-text-secondary/70";

                  const badgeColor =
                    item.id === "active"
                      ? isSelected
                        ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      : item.id === "overdue"
                        ? isSelected
                          ? "bg-destructive/20 text-destructive font-bold border border-destructive/30"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                        : item.id === "returned"
                          ? isSelected
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isSelected
                            ? "bg-bg-subtle text-text font-bold border border-border/80"
                            : "bg-bg-subtle text-text-secondary border border-border";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setPage(1);
                      }}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer select-none",
                        isSelected
                          ? "text-text"
                          : "text-text-secondary hover:text-text"
                      )}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="borrow-log-active-tab"
                          className="absolute inset-0 rounded-lg bg-bg shadow-xs border border-border/80"
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        />
                      )}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full relative z-10 shrink-0",
                          dotColor
                        )}
                        aria-hidden="true"
                      />
                      <span className="relative z-10">{item.label}</span>
                      <span
                        className={cn(
                          "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold transition-colors duration-150",
                          badgeColor
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search and Dropdowns */}
          <div className="flex items-center gap-2 flex-1 min-w-72 justify-end">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  isAssignmentMode
                    ? "Search asset, holder, code, or department…"
                    : "Search asset, borrower, code, or department…"
                }
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

            {/* Department Filter with Label */}
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
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {!canOperate && <OperatorReadOnlyBanner />}

      {/* Error State Banner */}
      {isError && (
        <QueryErrorBanner
          message={error?.message || "Failed to load custody logs. Please check your network."}
          onRetry={() => void refetch()}
        />
      )}

      {/* Main Table Content */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
        {isLoading ? (
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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-xs mb-3">
              <Repeat className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <p className="text-base font-bold text-text">
              {isAssignmentMode ? "No Assignment Records Found" : "No Borrow Records Found"}
            </p>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              {search || departmentFilter !== "all" || tab !== "all"
                ? "No custody logs match your active filter criteria. Try resetting your search or filters."
                : isAssignmentMode
                  ? "Assignable assets issued to departments or projects will appear here until they are returned or voided."
                  : "Released borrowable assets on loan will appear here until they are returned."}
            </p>
            {(search || departmentFilter !== "all" || tab !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDepartmentFilter("all");
                  setTab("all");
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
                    Log Code
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Asset Details
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    {isAssignmentMode ? "Holder / Department" : "Borrower / Department"}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary hidden md:table-cell">
                    {isAssignmentMode ? "Custody" : "Due Date"}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRecords.map((row) => {
                  const category = getCategoryStyle(row.category || "office");
                  const isOverdue = row.status === "overdue";
                  const isReturned = row.status === "returned";
                  const isVoided = row.status === "voided";
                  const canReturn = canOperate && !isReturned && !isVoided;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRecord(row)}
                      className="hover:bg-bg-subtle/70 transition-colors cursor-pointer group"
                    >
                      {/* Log Code */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg shrink-0 bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            <Box className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <span className="font-mono font-bold text-xs text-text group-hover:text-accent transition-colors">
                              {row.logCode}
                            </span>
                            {row.requestCode ? (
                              <p className="text-[10px] font-mono text-text-secondary mt-0.5">
                                Req: {row.requestCode}
                              </p>
                            ) : (
                              <p className="text-[10px] text-text-secondary mt-0.5">
                                {row.source === "admin_manual"
                                  ? "Manual Issue"
                                  : row.source === "project_legacy"
                                    ? "Project Issue"
                                    : "Direct Loan"}
                              </p>
                            )}
                            {row.source === "admin_manual" && row.requestCode ? (
                              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                                Manual Issue
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Asset Details */}
                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-bold text-text truncate max-w-[200px]">
                          {row.assetName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary mt-0.5">
                          <span>{row.assetCode}</span>
                          <span className="opacity-40">·</span>
                          <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold", category.bg, category.text)}>
                            {category.label}
                          </span>
                        </div>
                      </td>

                      {/* Borrower & Department */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 font-semibold text-text">
                          <User className="h-3 w-3 text-text-secondary shrink-0" />
                          <span className="truncate max-w-[170px]">{row.borrowerName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-text-secondary mt-0.5">
                          <Building2 className="h-3 w-3 text-text-secondary/70 shrink-0" />
                          <span className="truncate max-w-[150px]">{row.department}</span>
                        </div>
                      </td>

                      {/* Due Date / Open custody */}
                      <td className="px-4 py-3.5 align-middle hidden md:table-cell">
                        {row.dueDate ? (
                          <div className="flex items-center gap-1 text-text">
                            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                            <span>
                              {new Date(row.dueDate).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-secondary">
                            {isAssignmentMode ? "Open assignment" : "—"}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-middle">
                        {isOverdue ? (
                          <OverdueBadge daysOverdue={row.daysOverdue ?? 1} />
                        ) : isVoided ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30">
                            Voided
                          </span>
                        ) : isReturned ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-bg-subtle text-text-secondary border-border">
                            Returned
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-status-active-bg/15 text-status-active-text border-status-active-bg/30">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canReturn && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnTarget(row);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-border bg-bg hover:border-primary hover:text-text text-text-secondary transition-colors cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Return</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(row);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-text-secondary group-hover:text-accent rounded-md border border-border group-hover:border-accent/40 bg-bg transition-colors"
                          >
                            <span>Details</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
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
                    of <span className="font-bold text-text">{filteredRecords.length}</span> results
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

      {/* Record Return Dialog */}
      {canOperate && (
        <ReturnLogDialog
          record={returnTarget}
          isOpen={Boolean(returnTarget)}
          onClose={() => setReturnTarget(null)}
          onConfirm={handleReturn}
        />
      )}

      {/* Custody Detail Slide-over Sheet */}
      <BorrowLogDetailSheet
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        onRecordReturn={(r) => setReturnTarget(r)}
        onVoidIssue={canOperate ? handleVoidIssue : undefined}
        onHardDelete={
          canHardDelete ? (record) => setDeleteTarget(record) : undefined
        }
        canOperate={canOperate}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Permanently delete this log?"
        description={
          deleteTarget ? (
            <>
              This will hard-delete{" "}
              <span className="font-semibold text-text">
                {deleteTarget.logCode}
              </span>{" "}
              ({deleteTarget.assetCode}). If the hold is still active, the asset
              holder is cleared first. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        variant="destructive"
        isLoading={hardDeleteMutation.isPending}
        onConfirm={handleHardDelete}
        onClose={() => {
          if (!hardDeleteMutation.isPending) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

export default function BorrowLogPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-xs text-text-secondary bg-bg-subtle">
          Loading custody log…
        </div>
      }
    >
      <BorrowLogContent />
    </Suspense>
  );
}
