"use client";

import { HardDrive, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemBackupStatus } from "@/types/settings";

export interface BackupStatusCardProps {
  backupStatus: SystemBackupStatus;
}

export function BackupStatusCard({ backupStatus }: BackupStatusCardProps) {
  const statusConfig = {
    success: {
      label: "Last Backup Successful",
      icon: CheckCircle2,
      bg: "bg-status-active-bg/20",
      text: "text-status-active-text",
      border: "border-status-active-bg/30",
    },
    failed: {
      label: "Last Backup Failed",
      icon: XCircle,
      bg: "bg-status-outofservice-bg/20",
      text: "text-status-outofservice-text",
      border: "border-status-outofservice-bg/30",
    },
    in_progress: {
      label: "Backup In Progress",
      icon: Clock,
      bg: "bg-status-repair-bg/20",
      text: "text-status-repair-text",
      border: "border-status-repair-bg/30",
    },
  }[backupStatus.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 rounded-2xl border border-border bg-bg space-y-5">
      <div className="border-b border-border pb-4">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-text-secondary" />
          Automated Backup Status
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Automated institutional data backups are currently disabled in this demo environment.
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={cn(
          "flex items-center gap-3 p-3.5 rounded-xl border opacity-60",
          statusConfig.bg,
          statusConfig.border
        )}
      >
        <StatusIcon className={cn("h-5 w-5 shrink-0", statusConfig.text)} />
        <div>
          <p className={cn("text-xs font-bold", statusConfig.text)}>
            {statusConfig.label} (Disabled)
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Automated backups are turned off by the system administrator.
          </p>
        </div>
      </div>

      {/* Backup Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-border bg-bg-subtle text-xs space-y-0.5 opacity-60">
          <span className="text-text-secondary block text-[11px] font-semibold uppercase tracking-wider">
            Schedule
          </span>
          <span className="text-text font-bold">Disabled</span>
        </div>
        <div className="p-3 rounded-xl border border-border bg-bg-subtle text-xs space-y-0.5">
          <span className="text-text-secondary block text-[11px] font-semibold uppercase tracking-wider">
            Total Records Backed Up
          </span>
          <span className="text-text font-bold">
            {backupStatus.totalRecordsCount.toLocaleString()} records
          </span>
        </div>
        <div className="col-span-2 p-3 rounded-xl border border-border bg-bg-subtle text-xs space-y-0.5">
          <span className="text-text-secondary block text-[11px] font-semibold uppercase tracking-wider">
            Backup Storage
          </span>
          <span className="text-text font-medium">
            Managed centrally by school IT infrastructure — contact IT Operations for backup retrieval and retention policy details.
          </span>
        </div>
      </div>
    </div>
  );
}
