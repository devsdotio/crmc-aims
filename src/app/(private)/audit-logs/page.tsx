"use client";

import { useMemo, useState } from "react";
import { History, Filter, Search, User, Clock3, X } from "lucide-react";
import { useAuditLogsQuery } from "@/features/audit-logs/client/use-audit-logs";
import { useMeQuery } from "@/features/users/client";
import { formatDateTime, formatRelativeTime } from "@/components/audit-logs/audit-log-utils";
import { CRITICAL_AUDIT_ACTIONS } from "@/server/modules/audit-logs/audit-events";
import { cn } from "@/lib/utils";

export type AuditLogTab =
  | "assets"
  | "consumables"
  | "requests"
  | "requisitions"
  | "purchaseOrders"
  | "general";

const GROUP_LABELS = [
  { id: "critical", label: "Critical" },
  { id: "reports", label: "Reports" },
  { id: "procurement", label: "Procurement" },
  { id: "requests", label: "Requests" },
  { id: "inventory", label: "Inventory" },
  { id: "finance", label: "Finance" },
  { id: "users", label: "Users" },
  { id: "custody", label: "Custody" },
] as const;

type GroupId = (typeof GROUP_LABELS)[number]["id"];

function inGroup(action: string, group: GroupId): boolean {
  const value = action.toLowerCase();
  if (group === "reports") return value.includes("report_");
  if (group === "procurement") return value.includes("purchase_order");
  if (group === "requests") return value.includes("request");
  if (group === "inventory")
    return value.includes("consumable") || value.includes("stock") || value.includes("asset");
  if (group === "finance") return value.includes("voucher") || value.includes("petty");
  if (group === "users") return value.includes("user");
  if (group === "custody")
    return value.includes("released") || value.includes("returned") || value.includes("voided");
  return false;
}

function actionBadgeClass(action: string): string {
  const value = action.toLowerCase();

  if (value.includes("approved")) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (value.includes("rejected")) {
    return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/30 dark:text-rose-300";
  }
  if (value.includes("cancelled")) {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300";
  }
  if (value.includes("deleted")) {
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-300";
  }
  if (value.includes("created")) {
    return "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-300";
  }
  if (value.includes("updated")) {
    return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-300";
  }
  if (value.includes("released")) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (value.includes("returned")) {
    return "border-lime-300 bg-lime-50 text-lime-700 dark:border-lime-700/50 dark:bg-lime-950/30 dark:text-lime-300";
  }
  if (value.includes("voided")) {
    return "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700/50 dark:bg-orange-950/30 dark:text-orange-300";
  }
  if (value.includes("status_changed") || value.includes("retired")) {
    return "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/50 dark:bg-violet-950/30 dark:text-violet-300";
  }
  if (value.includes("report_")) {
    return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/50 dark:bg-sky-950/30 dark:text-sky-300";
  }
  if (CRITICAL_AUDIT_ACTIONS.has(action)) {
    return "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300";
  }

  return "border-border bg-bg-subtle text-text-secondary";
}

function entityBadgeClass(entityType: string): string {
  const value = entityType.toLowerCase();
  if (value.includes("purchase_order")) {
    return "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-950/30 dark:text-indigo-300";
  }
  if (value.includes("request")) {
    return "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/50 dark:bg-violet-950/30 dark:text-violet-300";
  }
  if (value.includes("report")) {
    return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/50 dark:bg-sky-950/30 dark:text-sky-300";
  }
  if (value.includes("user")) {
    return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-300";
  }
  if (value.includes("asset")) {
    return "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700/50 dark:bg-teal-950/30 dark:text-teal-300";
  }
  if (value.includes("consumable")) {
    return "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-300";
  }
  if (value.includes("voucher") || value.includes("petty")) {
    return "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300";
  }
  if (value.includes("borrow_transaction")) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  return "border-border bg-bg-subtle text-text-secondary";
}

export default function AuditLogsPage() {
  const { data: me, isLoading: meLoading } = useMeQuery();
  const { data: logs = [], isLoading, error } = useAuditLogsQuery();
  const [mode, setMode] = useState<"critical" | "all">("critical");
  const [group, setGroup] = useState<GroupId | "all">("all");
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const hasActiveFilters = Boolean(
    search || actorFilter || entityFilter || entityTypeFilter || startDate || endDate || group !== "all"
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (mode === "critical" && !CRITICAL_AUDIT_ACTIONS.has(log.action)) return false;
      if (group !== "all" && !inGroup(log.action, group)) return false;
      if (actorFilter && log.actorName !== actorFilter) return false;
      if (entityTypeFilter && log.entityType !== entityTypeFilter) return false;
      if (entityFilter && log.entityId !== entityFilter) return false;

      if (startDate) {
        const stamp = new Date(log.timestamp).getTime();
        const start = new Date(`${startDate}T00:00:00`).getTime();
        if (stamp < start) return false;
      }
      if (endDate) {
        const stamp = new Date(log.timestamp).getTime();
        const end = new Date(`${endDate}T23:59:59`).getTime();
        if (stamp > end) return false;
      }

      if (!normalizedSearch) return true;
      const haystack = `${log.actorName} ${log.action} ${log.entityType} ${log.entityId} ${log.notes ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [
    actorFilter,
    endDate,
    entityFilter,
    entityTypeFilter,
    group,
    logs,
    mode,
    search,
    startDate,
  ]);

  const actorOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.actorName))).sort((a, b) => a.localeCompare(b)),
    [logs]
  );
  const entityTypeOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entityType))).sort((a, b) => a.localeCompare(b)),
    [logs]
  );

  if (meLoading) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md">
        <div className="px-4 md:px-6 pt-5 pb-4 bg-bg shrink-0 border-b border-border space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-text">Audit Trails</h1>
                <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                  Beta
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Immutable administrative activity log for critical and high-impact actions.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-bg text-text-secondary">
              <History className="h-3.5 w-3.5" />
              Loading records...
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-accent bg-accent/10 text-accent px-3 py-1.5 text-xs font-semibold">
                Critical Activity
              </button>
              <button className="rounded-lg border border-border bg-bg text-text-secondary px-3 py-1.5 text-xs font-semibold">
                All Activity
              </button>
            </div>
            <div className="relative flex-1 max-w-sm min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              <input
                value=""
                readOnly
                placeholder="Search actor, action, entity, notes…"
                className="w-full h-9 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary"
              />
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
          <div className="p-5 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-card border border-border flex items-center justify-between px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-32 bg-border/70 rounded" />
                  <div className="h-4 w-44 bg-border/50 rounded" />
                </div>
                <div className="h-4 w-28 bg-border/50 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const canView = me?.role === "admin" || me?.role === "staff" || me?.role === "superadmin";
  if (!canView) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-base font-semibold text-text">Audit Trail is restricted</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Only admin and staff roles can view administrative audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md">
      <div className="px-4 md:px-6 pt-5 pb-4 bg-bg shrink-0 border-b border-border space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">Audit Trails</h1>
              <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                Beta
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Immutable administrative activity log for critical and high-impact actions.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-bg text-text-secondary">
            <History className="h-3.5 w-3.5" />
            {filtered.length} visible entries
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                mode === "critical"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle"
              )}
              onClick={() => setMode("critical")}
            >
              Critical Activity
            </button>
            <button
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                mode === "all"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle"
              )}
              onClick={() => setMode("all")}
            >
              All Activity
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-72 justify-end flex-wrap">
            <div className="relative flex-1 max-w-sm min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, action, entity, notes…"
                className="w-full h-9 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-text-secondary" />
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="">All actors</option>
                {actorOptions.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <option value="">All entities</option>
              {entityTypeOptions.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-2.5 text-xs bg-bg border border-border rounded-lg text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
              group === "all"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle"
            )}
            onClick={() => setGroup("all")}
          >
            All Groups
          </button>
          {GROUP_LABELS.map((chip) => (
            <button
              key={chip.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                group === chip.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle"
              )}
              onClick={() => setGroup(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="text-text-secondary">
            <span className="font-semibold text-text">{filtered.length}</span> matching record
            {filtered.length === 1 ? "" : "s"}
            {mode === "critical" ? " in critical view" : " in all activity"}
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1 font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              onClick={() => {
                setSearch("");
                setActorFilter("");
                setEntityFilter("");
                setEntityTypeFilter("");
                setStartDate("");
                setEndDate("");
                setGroup("all");
              }}
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          ) : null}
        </div>

        {(entityFilter || actorFilter) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {entityFilter ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <span className="uppercase tracking-wide">Entity timeline</span>
                <span className="font-mono text-[10px] opacity-90">{entityFilter}</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-accent/15 cursor-pointer"
                  onClick={() => setEntityFilter("")}
                  title="Clear entity timeline filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {actorFilter ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                onClick={() => setActorFilter("")}
                title="Clear actor filter"
              >
                <span>Actor: {actorFilter}</span>
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {isLoading ? (
        <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
          <div className="p-5 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-card border border-border flex items-center justify-between px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-32 bg-border/70 rounded" />
                  <div className="h-4 w-44 bg-border/50 rounded" />
                </div>
                <div className="h-4 w-28 bg-border/50 rounded" />
              </div>
            ))}
          </div>
        </main>
      ) : error ? (
        <div className="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load audit logs.
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto min-h-0 bg-bg flex flex-col">
          <div className="flex flex-col min-h-full">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-bg-subtle/95 backdrop-blur-xs border-b border-border z-10 select-none">
              <tr className="text-[11px] uppercase tracking-wide text-text-secondary">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">When</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Actor</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Action</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Entity</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Notes</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">Drill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-text-secondary">
                    <div className="space-y-2">
                      <p>No logs match the current filters.</p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                          onClick={() => {
                            setSearch("");
                            setActorFilter("");
                            setEntityFilter("");
                            setEntityTypeFilter("");
                            setStartDate("");
                            setEndDate("");
                            setGroup("all");
                          }}
                        >
                          Reset filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log, index) => (
                  <tr key={`${log.id}-${index}`} className="hover:bg-bg-subtle/70 transition-colors group">
                    <td className="px-5 py-3.5 align-middle">
                      {(() => {
                        const stamp =
                          typeof log.timestamp === "string"
                            ? log.timestamp
                            : log.timestamp.toISOString();
                        return (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-text font-medium">
                              <span className="p-1.5 rounded-lg shrink-0 bg-bg-subtle border border-border text-text-secondary">
                                <Clock3 className="h-3.5 w-3.5" />
                              </span>
                              <span>{formatDateTime(stamp)}</span>
                            </div>
                            <div className="text-[11px] text-text-secondary pl-7">
                              {formatRelativeTime(stamp)}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5 text-text font-semibold">
                        <User className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                        <span className="truncate max-w-48">{log.actorName}</span>
                      </div>
                      {log.actorUserId ? (
                        <div className="text-[11px] font-mono text-text-secondary mt-0.5 truncate max-w-48">
                          {log.actorUserId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
                          actionBadgeClass(log.action)
                        )}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-text">
                      <div className="mb-1">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
                            entityBadgeClass(log.entityType)
                          )}
                        >
                          {log.entityType}
                        </span>
                      </div>
                      <div className="inline-flex rounded-md border border-border bg-bg-subtle px-2 py-0.5 font-mono text-[11px] text-text-secondary max-w-60 truncate">
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-text-secondary">
                      <div className="max-w-80 truncate">
                        {log.notes || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                          onClick={() => setActorFilter(log.actorName)}
                          title="Show only this actor's actions"
                        >
                          Actor history
                        </button>
                        <button
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                          onClick={() => {
                            setEntityFilter(log.entityId);
                            setEntityTypeFilter(log.entityType);
                          }}
                          title="Focus timeline for this entity"
                        >
                          Entity timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </main>
      )}
    </div>
  );
}
