"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  Calendar,
  Tag,
  User,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OverdueBadge } from "@/components/ui/overdue-badge";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useBorrowLogQuery } from "@/features/borrow-log/client/use-borrow-log";
import type { BorrowLogRecord } from "@/features/borrow-log/client/borrow-log-api";
import { useMeQuery } from "@/features/users/client";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { calendarDaysUntil } from "@/lib/format-relative-time";

type CustodyTab = "borrowed" | "assigned";

const TABS: {
  key: CustodyTab;
  label: string;
  description: string;
}[] = [
  {
    key: "borrowed",
    label: "Borrowed",
    description: "Temporary loans with a return due date",
  },
  {
    key: "assigned",
    label: "Assigned",
    description: "Long-term department equipment (no due date)",
  },
];

function formatDisplayDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueHint(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const days = calendarDaysUntil(dueDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days}d`;
  return null;
}

function InventoryRowSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg p-4 flex gap-3 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-border shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3.5 w-28 rounded bg-border" />
        <div className="h-3 w-48 rounded bg-border" />
        <div className="h-3 w-40 rounded bg-border" />
      </div>
      <div className="h-6 w-16 rounded-full bg-border shrink-0" />
    </div>
  );
}

function InventoryAssetCard({
  record,
  categoryMeta,
}: {
  record: BorrowLogRecord;
  categoryMeta: { bg: string; text: string; label: string };
}) {
  const isAssignment = record.custodyKind === "assignment";
  const isOverdue = record.status === "overdue";
  const hint = !isAssignment ? dueHint(record.dueDate) : null;

  return (
    <article
      className={cn(
        "rounded-xl border bg-bg p-4 transition-colors",
        isOverdue
          ? "border-status-outofservice-bg/40 bg-status-outofservice-bg/5"
          : isAssignment
            ? "border-amber-500/25 hover:border-amber-500/40"
            : "border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border shadow-2xs",
            isAssignment
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
              : isOverdue
                ? "bg-status-outofservice-bg/15 text-status-outofservice-text border-status-outofservice-bg/30"
                : "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30"
          )}
        >
          {isAssignment ? (
            <ClipboardCheck className="h-4 w-4" strokeWidth={2.2} />
          ) : isOverdue ? (
            <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <Clock className="h-4 w-4" strokeWidth={2.2} />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm font-bold text-text tracking-tight">
              {record.assetCode}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                categoryMeta.bg,
                categoryMeta.text
              )}
            >
              <Tag className="h-2.5 w-2.5" />
              {categoryMeta.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                isAssignment
                  ? "bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25"
              )}
            >
              {isAssignment ? "Assigned" : "Borrowed"}
            </span>
            {isOverdue && record.daysOverdue != null && (
              <OverdueBadge daysOverdue={record.daysOverdue} />
            )}
          </div>

          <p className="text-sm font-semibold text-text truncate">
            {record.assetName}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              Issued {formatDisplayDate(record.releasedAt)}
            </span>
            {isAssignment ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700/90 dark:text-amber-400/90">
                <Layers className="h-3 w-3 shrink-0" />
                Long-term · no due date
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  isOverdue && "font-semibold text-status-outofservice-text"
                )}
              >
                <Clock className="h-3 w-3 shrink-0" />
                Due {formatDisplayDate(record.dueDate)}
                {hint && !isOverdue ? ` · ${hint}` : null}
              </span>
            )}
            {(record.requestedByName || record.borrowerName) && (
              <span className="inline-flex items-center gap-1 truncate max-w-50">
                <User className="h-3 w-3 shrink-0" />
                {record.requestedByName
                  ? `Requested by ${record.requestedByName}`
                  : record.borrowerName}
              </span>
            )}
          </div>

          {isOverdue && (
            <p className="text-[11px] text-status-outofservice-text flex items-start gap-1.5 pt-0.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Coordinate return with Property Custodian — this loan is past due.
            </p>
          )}
        </div>

        <span className="hidden sm:inline font-mono text-[10px] text-text-secondary/70 shrink-0 pt-0.5">
          {record.logCode}
        </span>
      </div>
    </article>
  );
}

function SectionEmpty({
  kind,
  searching,
}: {
  kind: CustodyTab;
  searching: boolean;
}) {
  const copy =
    kind === "borrowed"
      ? {
          title: "No borrowed equipment",
          body: searching
            ? "No temporary loans match your search."
            : "Due-dated loans released to your department will show up here.",
        }
      : {
          title: "No assigned equipment",
          body: searching
            ? "No long-term assignments match your search."
            : "Assignable units issued to your department (without a due date) will show up here.",
        };

  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-subtle text-text-secondary shadow-xs mb-3">
        <Package className="h-7 w-7" strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="text-base font-bold text-text">{copy.title}</h3>
      <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
        {copy.body}
      </p>
    </div>
  );
}

export function DepartmentInventoryView() {
  const { getCategoryStyle } = useCategoryStyleMap();
  const { data: me, isLoading: meLoading } = useMeQuery();
  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBorrowLogQuery({
    scope: "department",
    enabled: Boolean(me?.departmentId),
  });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CustodyTab>("borrowed");

  const filtered = useMemo(() => {
    let list = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        return (
          r.assetCode.toLowerCase().includes(q) ||
          r.assetName.toLowerCase().includes(q) ||
          r.logCode.toLowerCase().includes(q) ||
          (r.requestedByName ?? "").toLowerCase().includes(q) ||
          r.borrowerName.toLowerCase().includes(q)
        );
      });
    }
    if (tab === "assigned") {
      return list.filter((r) => r.custodyKind === "assignment");
    }
    return list.filter((r) => r.custodyKind !== "assignment");
  }, [records, search, tab]);

  const borrowedAll = useMemo(
    () => records.filter((r) => r.custodyKind !== "assignment"),
    [records]
  );
  const assignedAll = useMemo(
    () => records.filter((r) => r.custodyKind === "assignment"),
    [records]
  );
  const overdueCount = useMemo(
    () => borrowedAll.filter((r) => r.status === "overdue").length,
    [borrowedAll]
  );

  const tabCounts: Record<CustodyTab, number> = {
    borrowed: borrowedAll.length,
    assigned: assignedAll.length,
  };

  const deptLabel =
    me?.department?.trim() ||
    me?.departmentCode?.trim() ||
    "Your department";

  const loading = isLoading || meLoading;

  if (!meLoading && me && !me.departmentId) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
        <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs">
          <h1 className="text-xl font-bold tracking-tight text-text">
            My Inventory
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Assets currently held by your department (view only).
          </p>
        </div>
        <div className="rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/10 px-4 py-3 text-xs text-status-repair-text">
          This login is not linked to a department yet. Ask Property Custodian
          to assign a department before viewing department inventory.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              My Inventory
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 max-w-xl leading-relaxed">
              Equipment currently held by{" "}
              <span className="font-semibold text-text">{deptLabel}</span>.
              View only — return or reassign through Property Custodian. Project
              holds are not listed here.
            </p>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setTab("borrowed")}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer",
              tab === "borrowed"
                ? "border-sky-500/40 bg-sky-500/5"
                : "border-border bg-bg hover:bg-bg-subtle"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Borrowed
            </p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {loading ? "—" : borrowedAll.length}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setTab("assigned")}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer",
              tab === "assigned"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border bg-bg hover:bg-bg-subtle"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Assigned
            </p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {loading ? "—" : assignedAll.length}
            </p>
          </button>
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5",
              overdueCount > 0
                ? "border-status-outofservice-bg/40 bg-status-outofservice-bg/5"
                : "border-border bg-bg"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-status-outofservice-text">
              Overdue loans
            </p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {loading ? "—" : overdueCount}
            </p>
          </div>
        </div>
      </div>

      {isError && (
        <QueryErrorBanner
          message={
            error instanceof Error
              ? error.message
              : "Failed to load department inventory."
          }
          onRetry={() => void refetch()}
        />
      )}

      {/* List shell */}
      <div className="rounded-xl border border-border overflow-hidden bg-bg shadow-xs flex flex-col min-h-0 flex-1">
        <div className="px-4 md:px-6 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 bg-bg">
          <div className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle overflow-x-auto scrollbar-none relative">
            {TABS.map((t) => {
              const isSelected = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap select-none",
                    isSelected ? "text-text" : "text-text-secondary hover:text-text"
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="inventory-custody-tab"
                      className="absolute inset-0 rounded-lg bg-bg shadow-xs border border-border/80"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                  <span
                    className={cn(
                      "relative z-10 tabular-nums px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
                      isSelected
                        ? "bg-bg-subtle text-text border-border"
                        : "bg-bg text-text-secondary border-border/60"
                    )}
                  >
                    {loading ? "…" : tabCounts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, code, or requester…"
              className="w-full h-9 pl-8 pr-3 text-xs bg-bg-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <p className="px-4 md:px-6 py-2 text-[11px] text-text-secondary border-b border-border bg-bg-subtle/40 shrink-0">
          {TABS.find((t) => t.key === tab)?.description}
        </p>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <InventoryRowSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <SectionEmpty kind={tab} searching={Boolean(search.trim())} />
          ) : (
            <div className="space-y-2.5">
              {filtered.map((record) => (
                <InventoryAssetCard
                  key={record.id}
                  record={record}
                  categoryMeta={getCategoryStyle(record.category)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
