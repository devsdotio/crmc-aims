"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  FilePenLine,
  Loader2,
  Wrench,
} from "lucide-react";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { useOpenMaintenanceLogForAssetQuery } from "@/features/maintenance-logs/client";
import { DocumentMaintenanceDialog } from "@/components/maintenance-logs/document-maintenance-dialog";

function formatPhp(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface AssetOpenRepairPanelProps {
  assetId: string;
  assetCode: string;
  canOperate: boolean;
  onMarkServiceable: (log: MaintenanceLogRecord) => void;
  onSaved?: (message: string) => void;
}

export function AssetOpenRepairPanel({
  assetId,
  assetCode,
  canOperate,
  onMarkServiceable,
  onSaved,
}: AssetOpenRepairPanelProps) {
  const { data: openLog, isLoading, isError, refetch } =
    useOpenMaintenanceLogForAssetQuery(assetId);
  const [documentOpen, setDocumentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-b border-status-repair-bg/25 bg-status-repair-bg/10 flex items-center gap-2 text-xs text-status-repair-text">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading open repair log…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-3 border-b border-status-repair-bg/25 bg-status-repair-bg/10 flex items-center justify-between gap-2 text-xs text-status-repair-text">
        <span>Could not load the open maintenance log.</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-bold underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!openLog) {
    return (
      <div className="px-4 py-3 border-b border-status-repair-bg/25 bg-status-repair-bg/10 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-status-repair-text">
          Needs repair — no open maintenance log found yet.
        </p>
        <Link
          href={`/maintenance-logs?assetCode=${encodeURIComponent(assetCode)}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-status-repair-text hover:underline shrink-0"
        >
          View in logs
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const record = openLog as MaintenanceLogRecord;
  const parts = openLog.repairParts ?? [];
  const hasDocs =
    Boolean(openLog.workNotes?.trim()) ||
    parts.length > 0 ||
    (openLog.repairCost != null && openLog.repairCost !== "") ||
    Boolean(openLog.scheduledDate);

  return (
    <>
      <div className="border-b border-status-repair-bg/30 bg-linear-to-b from-status-repair-bg/15 to-status-repair-bg/5">
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-status-repair-bg/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-repair-bg text-white shadow-xs shrink-0">
              <Wrench className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-status-repair-text truncate">
                Repair in progress
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-status-repair-bg/20 text-status-repair-text border border-status-repair-bg/30">
                  Logged {openLog.dateLogged}
                </span>
                {openLog.scheduledDate && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-accent/15 text-accent border border-accent/25">
                    Target {openLog.scheduledDate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href={`/maintenance-logs?assetCode=${encodeURIComponent(assetCode)}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-status-repair-text hover:underline shrink-0"
          >
            View in logs
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="rounded-xl border border-status-repair-bg/35 bg-bg p-3 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-status-repair-text mb-1">
              Issue
            </p>
            <p className="text-sm font-bold text-text leading-snug whitespace-pre-wrap">
              {openLog.notes?.trim() || "No issue notes recorded."}
            </p>
          </div>

          {hasDocs ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5 text-xs">
              {openLog.workNotes?.trim() && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
                    Work performed
                  </p>
                  <p className="text-text font-medium whitespace-pre-wrap leading-relaxed">
                    {openLog.workNotes}
                  </p>
                </div>
              )}
              {parts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    Parts &amp; materials
                  </p>
                  <ul className="space-y-1.5">
                    {parts.map((part, idx) => (
                      <li
                        key={`${part.name}-${idx}`}
                        className="flex justify-between gap-2 rounded-lg bg-bg border border-border/60 px-2.5 py-1.5"
                      >
                        <span className="truncate font-semibold text-text">
                          {part.name}
                        </span>
                        <span className="font-mono font-bold text-accent shrink-0">
                          {formatPhp(part.cost)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openLog.repairCost != null && openLog.repairCost !== "" && (
                <p className="pt-2 border-t border-primary/20 flex justify-between gap-2 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Overall cost
                  </span>
                  <span className="text-base font-extrabold font-mono text-accent">
                    {formatPhp(openLog.repairCost)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-status-repair-text/80 font-medium rounded-lg border border-dashed border-status-repair-bg/40 bg-status-repair-bg/10 px-3 py-2">
              No repair documentation recorded yet — use Document repair to log
              work and costs.
            </p>
          )}

          {canOperate && (
            <div className="flex flex-nowrap items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setDocumentOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/15 text-status-repair-text hover:bg-status-repair-bg/25 cursor-pointer whitespace-nowrap"
              >
                <FilePenLine className="h-3.5 w-3.5" />
                {hasDocs ? "Update documentation" : "Document repair"}
              </button>
              <button
                type="button"
                onClick={() => onMarkServiceable(record)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-status-active-bg text-white hover:opacity-90 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark serviceable
              </button>
            </div>
          )}
        </div>
      </div>

      {canOperate && (
        <DocumentMaintenanceDialog
          record={record}
          isOpen={documentOpen}
          onClose={() => setDocumentOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
