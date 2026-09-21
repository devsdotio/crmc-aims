"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, User, ExternalLink } from "lucide-react";
import type { FlattenedLog } from "@/features/audit-logs/client/audit-logs-api";
import {
  getActionStyle,
  getActionIcon,
  formatDateTime,
  formatRelativeTime,
  parseAuditNote,
} from "./audit-log-utils";

interface AuditTimelineListProps {
  logs: FlattenedLog[];
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyMessage: string;
  emptyDescription: string;
  onSelect?: (log: FlattenedLog) => void;
}

export function AuditTimelineList({
  logs,
  emptyIcon: EmptyIcon,
  emptyMessage,
  emptyDescription,
  onSelect,
}: AuditTimelineListProps) {
  if (logs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <EmptyIcon className="h-12 w-12 text-text-secondary mb-4 opacity-20" />
        <h3 className="text-base font-bold text-text">{emptyMessage}</h3>
        <p className="text-xs text-text-secondary max-w-sm mt-1">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 w-full">
      <div className="max-w-4xl mx-auto pl-2">
        <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
          <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
            {logs.map((log) => {
              const style = getActionStyle(log.action);
              const icon = getActionIcon(log.action);
              const { picker, description } = parseAuditNote(log.action, log.note);
              const isRejected = log.action.toLowerCase() === "rejected" || log.action.toLowerCase() === "cancelled" || log.action.toLowerCase() === "deleted";

              return (
                <li
                  key={log.id}
                  onClick={() => onSelect?.(log)}
                  className={cn(
                    "pl-6 relative group transition-all",
                    onSelect && "cursor-pointer"
                  )}
                >
                  {/* Timeline circular node */}
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
                    {/* Header: Action + Request Code + Timestamp */}
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold capitalize text-xs", style.text)}>
                          {style.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                          {log.requestCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-right">
                        <time className="text-[11px] text-text-secondary font-medium">
                          {formatDateTime(log.timestamp)}
                        </time>
                        <span className="text-[10px] text-text-secondary/80">
                          ({formatRelativeTime(log.timestamp)})
                        </span>
                      </div>
                    </div>

                    {/* Actor & Department Meta */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                      <p>
                        By <span className="font-semibold text-text">{log.actor}</span>
                        {log.department && <span> • {log.department}</span>}
                      </p>

                      {onSelect && (
                        <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          Inspect <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Action Note / Picker Chips (matches request action history) */}
                    {(picker || description) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {picker && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text-secondary border border-border shadow-xs">
                            <User className="h-3 w-3" />
                            {log.action === "returned" ? "Returned by: " : "Picked up by: "} {picker}
                          </span>
                        )}
                        {description && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full",
                              style.bg,
                              isRejected ? "text-white" : "text-text"
                            )}
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate whitespace-normal leading-tight">{description}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
