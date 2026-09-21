"use client";

import React, { useState, useMemo } from "react";
import { FileSpreadsheet, ExternalLink, User, Building, FileText } from "lucide-react";
import { useConsumableRequestsAuditQuery } from "@/features/audit-logs/client/use-audit-logs";
import {
  AuditLogFilters,
  type AuditLogFilterValues,
} from "./audit-log-filters";
import { RequisitionDetailPanel } from "./requisition-detail-panel";
import {
  getActionStyle,
  getActionIcon,
  formatDateTime,
  formatRelativeTime,
  parseAuditNote,
  exportToCSV,
} from "./audit-log-utils";
import type { ConsumableRequestDTO } from "@/server/modules/consumable-requests/consumable-request.types";
import { cn } from "@/lib/utils";
import { formatItemDescription } from "@/lib/sanitize-display";
import { useToast } from "@/components/providers/toast-context";
import { LoadingState } from "@/components/providers/loading-context";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "released", label: "Released" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function RequisitionsList() {
  const { data: requests = [], isLoading, error } = useConsumableRequestsAuditQuery();
  const toast = useToast();

  const [filters, setFilters] = useState<AuditLogFilterValues>({
    search: "",
    action: "",
    categoryOrDept: "",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedRequest, setSelectedRequest] = useState<ConsumableRequestDTO | null>(null);

  // Guarantee 1 unique record per Requisition / Request Code (e.g. REQ-2026-xxxx)
  const uniqueRequests = useMemo(() => {
    const map = new Map<string, ConsumableRequestDTO>();
    requests.forEach((r) => {
      const code = (r.requestCode || r.id).trim();
      if (!map.has(code)) {
        map.set(code, r);
      }
    });
    return Array.from(map.values());
  }, [requests]);

  // Extract unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    uniqueRequests.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts)
      .sort()
      .map((d) => ({ value: d, label: d }));
  }, [uniqueRequests]);

  // Filter requests (strictly 1 entry per unique requisition code)
  const filteredRequests = useMemo(() => {
    return uniqueRequests.filter((req) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchCode = req.requestCode.toLowerCase().includes(q);
        const matchRequester = req.requesterName.toLowerCase().includes(q);
        const matchDept = req.department?.toLowerCase().includes(q);
        const matchPurpose = req.purpose?.toLowerCase().includes(q);
        const matchNotes = req.notes?.toLowerCase().includes(q);
        const matchLine = req.lines?.some((l) =>
          l.itemName.toLowerCase().includes(q) || l.itemCode?.toLowerCase().includes(q)
        );
        if (!matchCode && !matchRequester && !matchDept && !matchPurpose && !matchNotes && !matchLine) {
          return false;
        }
      }

      // 2. Status / Action Filter
      if (filters.action && req.status.toLowerCase() !== filters.action.toLowerCase()) {
        return false;
      }

      // 3. Department Filter
      if (filters.categoryOrDept && req.department !== filters.categoryOrDept) {
        return false;
      }

      // 4. Date Range
      if (filters.startDate) {
        const reqDate = new Date(req.requestedAt).toISOString().split("T")[0];
        if (reqDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const reqDate = new Date(req.requestedAt).toISOString().split("T")[0];
        if (reqDate > filters.endDate) return false;
      }

      return true;
    });
  }, [uniqueRequests, filters]);

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
    if (filteredRequests.length === 0) return;
    const exportable = filteredRequests.map((r) => ({
      requestCode: r.requestCode,
      status: r.status,
      requestedAt: r.requestedAt,
      requesterName: r.requesterName,
      department: r.department,
      linesCount: r.lines.length,
      lines: r.lines.map((l) => `${l.quantityRequested}x ${l.itemName}`).join("; "),
      totalValuation: r.totalCost,
      purpose: r.purpose,
      historyTransitions: r.history.length,
    }));
    exportToCSV("requisitions-audit-ledger", exportable);
    toast.success(`Exported ${filteredRequests.length} requisition audit records.`);
  };

  if (isLoading) {
    return (
      <LoadingState
        icon="clipboard"
        message="Loading requisitions audit ledger..."
        subtitle="Retrieving staff requisition slips, item allocations, and status histories"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <FileSpreadsheet className="h-12 w-12 text-status-outofservice-text mb-3 opacity-30" />
        <h3 className="text-sm font-bold text-text">Failed to load requisitions</h3>
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
        actionOptions={STATUS_OPTIONS}
        categoryOptions={departmentOptions}
        categoryLabel="Department"
        totalCount={uniqueRequests.length}
        filteredCount={filteredRequests.length}
      />

      {/* Content Area: 1 row per requisition */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredRequests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-text-secondary mb-4 opacity-20" />
            <h3 className="text-base font-bold text-text">No Requisition Records Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              No requisition records match your search and filter criteria.
            </p>
          </div>
        ) : filters.viewMode === "timeline" ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto pl-2">
            <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {filteredRequests.map((req) => {
                  const style = getActionStyle(req.status);
                  const icon = getActionIcon(req.status);
                  const lastHistory = req.history && req.history.length > 0 ? req.history[req.history.length - 1] : null;
                  const { picker, description } = parseAuditNote(req.status, lastHistory?.note || req.notes);

                  return (
                    <li
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="pl-6 relative group transition-all cursor-pointer"
                    >
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
                              {req.requestCode}
                            </span>
                            <span className="text-[10px] font-semibold text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                              {req.lines.length} line{req.lines.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-right">
                            <time className="text-[11px] text-text-secondary font-medium">
                              {formatDateTime(req.requestedAt)}
                            </time>
                            <span className="text-[10px] text-text-secondary/80">
                              ({formatRelativeTime(req.requestedAt)})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                          <p>
                            Requester: <span className="font-semibold text-text">{req.requesterName}</span>
                            {req.department && <span> • {req.department}</span>}
                          </p>

                          <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Inspect Details ({req.history.length} events) <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>

                        {/* Note & Item Preview */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {picker && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text-secondary border border-border shadow-xs">
                              <User className="h-3 w-3" />
                              Received by: {picker}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full bg-bg-subtle text-text border-border">
                            <FileText className="h-3 w-3 shrink-0 text-text-secondary" />
                            <span className="truncate whitespace-normal leading-tight">
                              {req.purpose || req.lines.map((l) => `${l.quantityRequested}x ${formatItemDescription(l.itemName, l.category, "consumable")}`).join(", ")}
                            </span>
                          </span>
                        </div>
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
                      <th className="px-4 py-3.5">Date Requested</th>
                      <th className="px-4 py-3.5">Requisition Code</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Requester</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Items</th>
                      <th className="px-4 py-3.5">Purpose / Notes</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRequests.map((req) => {
                      const style = getActionStyle(req.status);
                      const icon = getActionIcon(req.status);
                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-text block">
                              {formatDateTime(req.requestedAt)}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {formatRelativeTime(req.requestedAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-text">
                            {req.requestCode}
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
                            {req.requesterName}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {req.department || "-"}
                          </td>
                          <td className="px-4 py-3 text-text">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-subtle border border-border">
                              {req.lines.length} line{req.lines.length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                            {req.purpose || req.notes || "-"}
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

      {/* Detail Slide-Over Sheet (Opens full requisition details & action history logs timeline!) */}
      <RequisitionDetailPanel
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
