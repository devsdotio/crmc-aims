"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tag,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
  Wrench,
  Search,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { OverdueBadge } from "@/components/ui/overdue-badge";
import {
  getActionStyle,
  getActionIcon,
  formatRelativeTime,
  AuditNoteDisplay,
} from "@/components/audit-logs/audit-log-utils";
import { useBorrowLogQuery } from "@/features/borrow-log/client/use-borrow-log";

type HistoryStatusFilter = "all" | "active" | "overdue" | "returned";

const STATUS_FILTERS: {
  key: HistoryStatusFilter;
  label: string;
  dot: string;
  badge: string;
  activeBadge: string;
}[] = [
  {
    key: "all",
    label: "All Records",
    dot: "bg-text-secondary/70",
    badge: "bg-bg-subtle text-text-secondary border border-border",
    activeBadge: "bg-bg-subtle text-text font-bold border border-border/80",
  },
  {
    key: "active",
    label: "Active Custody",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    activeBadge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30",
  },
  {
    key: "overdue",
    label: "Overdue",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border border-destructive/20",
    activeBadge: "bg-destructive/20 text-destructive font-bold border border-destructive/30",
  },
  {
    key: "returned",
    label: "Returned",
    dot: "bg-teal-500",
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    activeBadge: "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/30",
  },
];

function ConditionBadge({ condition }: { condition?: string }) {
  if (!condition) return null;
  const map: Record<string, { label: string; className: string }> = {
    good: {
      label: "Good Condition",
      className: "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30",
    },
    damaged: {
      label: "Damaged",
      className: "bg-status-outofservice-bg/10 text-status-outofservice-bg dark:text-status-outofservice-text border-status-outofservice-bg/30",
    },
    needs_repair: {
      label: "Needs Repair",
      className: "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30",
    },
  };
  const meta = map[condition] ?? map.good;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-border" />
        <div className="h-3 w-32 animate-pulse rounded bg-border" />
      </div>
      <div className="h-6 w-24 animate-pulse rounded-full bg-border" />
    </div>
  );
}

export function BorrowHistoryTab() {
  const { getCategoryStyle } = useCategoryStyleMap();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [search, setSearch] = useState("");
  const { data: rawRecords = [], isLoading: loading } = useBorrowLogQuery();

  const records = useMemo(() => {
    return rawRecords.filter((r) => r.custodyKind !== "assignment");
  }, [rawRecords]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const searchedRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) => {
      const code = (r.logCode || "").toLowerCase();
      const assetName = (r.assetName || "").toLowerCase();
      const assetCode = (r.assetCode || "").toLowerCase();
      return code.includes(q) || assetName.includes(q) || assetCode.includes(q);
    });
  }, [records, search]);

  const counts = useMemo(() => {
    return {
      all: searchedRecords.length,
      active: searchedRecords.filter((r) => r.status === "active").length,
      overdue: searchedRecords.filter((r) => r.status === "overdue").length,
      returned: searchedRecords.filter((r) => r.status === "returned").length,
    };
  }, [searchedRecords]);

  const filteredRecords = useMemo(() => {
    if (statusFilter === "all") return searchedRecords;
    return searchedRecords.filter((r) => r.status === statusFilter);
  }, [searchedRecords, statusFilter]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-bg shadow-xs flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="px-4 md:px-6 py-3 bg-bg border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
            Status:
          </span>
          <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0 overflow-x-auto scrollbar-none relative">
            {STATUS_FILTERS.map((f) => {
              const count = counts[f.key];

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
                      layoutId="borrower-history-active-tab"
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

        {/* Search Field */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset, LOG code, or serial…"
            className={cn(
              "w-full h-9 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            )}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-bg divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-subtle text-text-secondary shadow-xs mb-3">
              <History className="h-7 w-7" strokeWidth={1.8} aria-hidden />
            </span>
            <h3 className="text-base font-bold text-text">No borrow history records</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              {statusFilter === "all"
                ? "Your completed and active borrowings will appear here once assets are released."
                : "No records match the selected status filter."}
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const categoryMeta = getCategoryStyle(record.category);
            const isExpanded = expandedId === record.id;
            const isOverdue = record.status === "overdue";
            const hasDamageNote =
              record.conditionOnReturn === "damaged" ||
              record.conditionOnReturn === "needs_repair";

            return (
              <div
                key={record.id}
                className={cn(
                  "border-b border-border last:border-b-0 transition-colors border-l-4",
                  isOverdue
                    ? "border-l-status-outofservice-bg bg-status-outofservice-bg/5"
                    : record.status === "active"
                    ? "border-l-status-active-bg/60 bg-bg hover:bg-bg-subtle/60"
                    : record.conditionOnReturn === "needs_repair"
                    ? "border-l-status-repair-bg/60 bg-bg hover:bg-bg-subtle/60"
                    : record.conditionOnReturn === "damaged"
                    ? "border-l-status-outofservice-bg/60 bg-bg hover:bg-bg-subtle/60"
                    : "border-l-transparent bg-bg hover:bg-bg-subtle/60"
                )}
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(record.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`history-detail-${record.id}`}
                  className={cn(
                    "w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:px-6 text-left cursor-pointer select-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Code + Category */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-semibold text-text-secondary">
                        {record.logCode}
                      </span>
                      <span className="text-text-secondary/40">·</span>
                      <span className="font-mono text-text-secondary text-[11px]">
                        {record.assetCode}
                      </span>
                      <span className="text-text-secondary/40">·</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          categoryMeta.bg,
                          categoryMeta.text
                        )}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {categoryMeta.label}
                      </span>
                      {record.conditionOnReturn && (
                        <ConditionBadge condition={record.conditionOnReturn} />
                      )}
                    </div>

                    {/* Asset name */}
                    <p className="text-sm font-bold text-text truncate">
                      {record.assetName}
                      {isOverdue && (
                        <AlertTriangle
                          className="inline ml-1.5 h-3.5 w-3.5 text-status-outofservice-bg"
                          aria-hidden
                        />
                      )}
                    </p>

                    {/* Dates row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" aria-hidden />
                        Borrowed:{" "}
                        <span className="font-medium text-text">
                          {new Date(record.releasedAt).toLocaleDateString(
                            "en-PH",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </span>
                      {record.dueDate && (
                        <span className="flex items-center gap-1">
                          Due:{" "}
                          <span
                            className={cn(
                              "font-medium",
                              isOverdue ? "text-status-outofservice-bg font-bold" : "text-text"
                            )}
                          >
                            {record.dueDate}
                          </span>
                        </span>
                      )}
                      {record.returnedAt && (
                        <span className="flex items-center gap-1">
                          Returned:{" "}
                          <span className="font-medium text-text">
                            {new Date(record.returnedAt).toLocaleDateString(
                              "en-PH",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right column: status + expand toggle */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {record.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Active Loan
                      </span>
                    ) : record.status === "overdue" ? (
                      <OverdueBadge daysOverdue={record.daysOverdue ?? 0} />
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-subtle text-text-secondary border border-border">
                        <CheckCircle2 className="h-3 w-3 text-status-active-text shrink-0" />
                        Returned
                      </span>
                    )}

                    <div className="p-1 rounded-lg text-text-secondary hover:bg-bg-subtle">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded audit trail */}
                {isExpanded && (
                  <div
                    id={`history-detail-${record.id}`}
                    className="p-4 md:px-6 bg-bg-subtle/50 border-t border-border space-y-3"
                  >
                    {hasDamageNote && (
                      <div className="p-3 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/20 text-xs flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-status-outofservice-bg shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-text">Return Condition Flag</p>
                          <p className="text-text-secondary mt-0.5">
                            This asset was recorded as{" "}
                            <span className="font-bold">
                              {record.conditionOnReturn?.replace("_", " ")}
                            </span>{" "}
                            upon return.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold text-text mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-text-secondary" />
                        Transaction Audit Log
                      </p>
                      <div className="space-y-2 border-l-2 border-border pl-3 ml-1.5">
                        {record.history?.map((step) => {
                          const actionMeta = getActionStyle(step.action);
                          const actionIcon = getActionIcon(step.action);
                          const timeStr =
                            step.timestamp instanceof Date
                              ? step.timestamp.toISOString()
                              : String(step.timestamp || "");

                          return (
                            <div key={step.id} className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("p-0.5 rounded", actionMeta.bg, actionMeta.text)}>
                                  {actionIcon}
                                </span>
                                <span className="font-bold text-text">{actionMeta.label}</span>
                                <span className="text-text-secondary">by</span>
                                <span className="font-medium text-text">{step.actorName}</span>
                                <span className="text-text-secondary/40">·</span>
                                <span className="text-text-secondary">
                                  {formatRelativeTime(timeStr)}
                                </span>
                              </div>
                              {step.notes && (
                                <div className="pl-5 text-text-secondary">
                                  <AuditNoteDisplay action={step.action} note={step.notes} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
