"use client";

import React, { useState, useMemo } from "react";
import { History, ExternalLink, Code2, FileText, Layers, User } from "lucide-react";
import { useAuditLogsQuery } from "@/features/audit-logs/client/use-audit-logs";
import {
  AuditLogFilters,
  type AuditLogFilterValues,
} from "./audit-log-filters";
import {
  AuditLogDetailPanel,
  type AuditDetailItem,
  type GroupedGeneralAuditRecord,
} from "./audit-log-detail-panel";
import {
  getActionStyle,
  getActionIcon,
  formatDateTime,
  formatRelativeTime,
  formatEntityDisplayCode,
  exportToCSV,
} from "./audit-log-utils";
import type { AuditLogRecord } from "@/features/audit-logs/client/audit-logs-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-context";
import { LoadingState } from "@/components/providers/loading-context";

export function GeneralAuditList() {
  const { data: logs = [], isLoading, error } = useAuditLogsQuery();
  const toast = useToast();

  const [filters, setFilters] = useState<AuditLogFilterValues>({
    search: "",
    action: "",
    categoryOrDept: "",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedItem, setSelectedItem] = useState<AuditDetailItem | null>(null);

  // Group raw audit logs purely by unique Entity Code / ID (asset code, inventory code, request code)
  const groupedRecords: GroupedGeneralAuditRecord[] = useMemo(() => {
    const map = new Map<string, AuditLogRecord[]>();

    logs.forEach((log) => {
      const code = formatEntityDisplayCode(
        log.entityType,
        log.entityId.trim(),
        log.metadata as Record<string, unknown> | null
      );
      const list = map.get(code) || [];
      list.push(log);
      map.set(code, list);
    });

    const groups: GroupedGeneralAuditRecord[] = [];

    map.forEach((items, resolvedCode) => {
      // Sort history chronologically newest first
      items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latest = items[0];
      groups.push({
        entityId: resolvedCode,
        entityType: latest.entityType,
        latestAction: latest.action,
        latestActorName: latest.actorName,
        latestActorUserId: latest.actorUserId,
        latestTimestamp: new Date(latest.timestamp).toISOString(),
        latestNotes: latest.notes,
        latestMetadata: latest.metadata as Record<string, unknown> | null,
        history: items,
      });
    });

    // Sort all groups by latest activity timestamp descending
    groups.sort(
      (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );

    return groups;
  }, [logs]);

  // Extract unique actions and entity types for dropdown filters
  const { actionOptions, entityOptions } = useMemo(() => {
    const actions = new Set<string>();
    const entities = new Set<string>();

    groupedRecords.forEach((g) => {
      if (g.latestAction) actions.add(g.latestAction);
      if (g.entityType) entities.add(g.entityType);
    });

    return {
      actionOptions: Array.from(actions)
        .sort()
        .map((a) => ({
          value: a,
          label: a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
      entityOptions: Array.from(entities)
        .sort()
        .map((e) => ({
          value: e,
          label: e.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
    };
  }, [groupedRecords]);

  // Filter grouped records (1 row per entity code)
  const filteredRecords = useMemo(() => {
    return groupedRecords.filter((rec) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchEntity = rec.entityId.toLowerCase().includes(q);
        const matchType = rec.entityType.toLowerCase().includes(q);
        const matchActor = rec.latestActorName.toLowerCase().includes(q);
        const matchAction = rec.latestAction.toLowerCase().includes(q);
        const matchNotes = rec.latestNotes?.toLowerCase().includes(q);
        const matchHistoryNotes = rec.history.some((h) =>
          h.notes?.toLowerCase().includes(q) || h.actorName.toLowerCase().includes(q)
        );
        if (!matchEntity && !matchType && !matchActor && !matchAction && !matchNotes && !matchHistoryNotes) {
          return false;
        }
      }

      // 2. Action Filter
      if (filters.action && rec.latestAction.toLowerCase() !== filters.action.toLowerCase()) {
        return false;
      }

      // 3. Entity Type Filter
      if (filters.categoryOrDept && rec.entityType !== filters.categoryOrDept) {
        return false;
      }

      // 4. Date Range
      if (filters.startDate) {
        const recDate = new Date(rec.latestTimestamp).toISOString().split("T")[0];
        if (recDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const recDate = new Date(rec.latestTimestamp).toISOString().split("T")[0];
        if (recDate > filters.endDate) return false;
      }

      return true;
    });
  }, [groupedRecords, filters]);

  const handleFilterChange = (updated: Partial<AuditLogFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: "",
      action: "",
      categoryOrDept: "",
      startDate: "",
      endDate: "",
    }));
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const exportable = filteredRecords.map((r) => ({
      entityId: r.entityId,
      entityType: r.entityType,
      latestAction: r.latestAction,
      latestActorName: r.latestActorName,
      latestTimestamp: r.latestTimestamp,
      totalEvents: r.history.length,
      latestNotes: r.latestNotes || "",
    }));
    exportToCSV("general-audit-ledger", exportable);
    toast.success(`Exported ${filteredRecords.length} general audit records.`);
  };

  if (isLoading) {
    return (
      <LoadingState
        icon="history"
        message="Loading system audit ledger..."
        subtitle="Compiling immutable system-wide activity logs and user operations"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <History className="h-12 w-12 text-status-outofservice-text mb-3 opacity-30" />
        <h3 className="text-sm font-bold text-text">Failed to load general logs</h3>
        <p className="text-xs text-text-secondary mt-1">
          {error.message || "An unexpected error occurred while fetching audit trail."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg">
      {/* Top Filter Bar */}
      <AuditLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onExport={handleExportCSV}
        actionOptions={actionOptions}
        categoryOptions={entityOptions}
        categoryLabel="Entity Type"
        totalCount={groupedRecords.length}
        filteredCount={filteredRecords.length}
      />

      {/* Content Area: 1 row per unique entity code */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredRecords.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <History className="h-12 w-12 text-text-secondary mb-4 opacity-20" />
            <h3 className="text-base font-bold text-text">No General Logs Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              No audit entries matched your search and filter criteria.
            </p>
          </div>
        ) : filters.viewMode === "timeline" ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto pl-2">
            <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {filteredRecords.map((rec) => {
                  const style = getActionStyle(rec.latestAction);
                  const icon = getActionIcon(rec.latestAction);
                  const hasMeta = Boolean(rec.latestMetadata && Object.keys(rec.latestMetadata).length > 0);
                  const isRejected =
                    rec.latestAction.toLowerCase() === "rejected" ||
                    rec.latestAction.toLowerCase() === "cancelled" ||
                    rec.latestAction.toLowerCase() === "deleted";

                  return (
                    <li
                      key={rec.entityId}
                      onClick={() => setSelectedItem({ type: "grouped-general", data: rec })}
                      className="pl-6 relative group transition-all cursor-pointer"
                    >
                      {/* Node Circle */}
                      <span
                        className={cn(
                          "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10 transition-transform group-hover:scale-110",
                          style.bg,
                          style.iconText || style.text
                        )}
                      >
                        {icon}
                      </span>

                      <div className="flex flex-col gap-0.5 pt-1.5 group-hover:bg-bg-subtle/50 rounded-lg p-1.5 -ml-1.5 transition-colors">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold capitalize text-xs", style.text)}>
                              {style.label}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                              {rec.entityId}
                            </span>
                            <span className="text-[10px] font-semibold text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded border border-border capitalize">
                              {rec.entityType.replace(/_/g, " ")}
                            </span>
                            {rec.history.length > 1 && (
                              <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                                {rec.history.length} events
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-right">
                            <time className="text-[11px] text-text-secondary font-medium">
                              {formatDateTime(rec.latestTimestamp)}
                            </time>
                            <span className="text-[10px] text-text-secondary/80">
                              ({formatRelativeTime(rec.latestTimestamp)})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                          <p>
                            Latest Actor: <span className="font-semibold text-text">{rec.latestActorName}</span>
                          </p>

                          <div className="flex items-center gap-2">
                            {hasMeta && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                                <Code2 className="h-2.5 w-2.5" />
                                JSON Payload
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              Inspect History ({rec.history.length}) <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        </div>

                        {rec.latestNotes && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full",
                                style.bg,
                                isRejected ? "text-white" : "text-text"
                              )}
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate whitespace-normal leading-tight">{rec.latestNotes}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">Code / Identifier</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Latest Action</th>
                      <th className="px-4 py-3.5">Latest Actor</th>
                      <th className="px-4 py-3.5">Latest Activity</th>
                      <th className="px-4 py-3.5 text-center">Action History</th>
                      <th className="px-4 py-3.5">Remarks / Notes</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRecords.map((rec) => {
                      const style = getActionStyle(rec.latestAction);
                      const icon = getActionIcon(rec.latestAction);
                      return (
                        <tr
                          key={rec.entityId}
                          onClick={() => setSelectedItem({ type: "grouped-general", data: rec })}
                          className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-text">
                            {rec.entityId}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-subtle text-text border border-border capitalize">
                              {rec.entityType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                style.bg,
                                style.text
                              )}
                            >
                              {icon}
                              {style.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-text">
                            {rec.latestActorName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-text block">
                              {formatDateTime(rec.latestTimestamp)}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {formatRelativeTime(rec.latestTimestamp)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-subtle text-text border border-border">
                              <History className="h-3 w-3 text-text-secondary" />
                              {rec.history.length} {rec.history.length === 1 ? "event" : "events"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                            {rec.latestNotes || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:underline">
                              Inspect
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-Over Inspector (Opens full action history timeline for this entity!) */}
      <AuditLogDetailPanel
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
