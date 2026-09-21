"use client";

import type { SystemBackupStatus } from "@/types/settings";
import { DataExportCard } from "./data-export-card";
import { BackupStatusCard } from "./backup-status-card";

export interface SystemSectionProps {
  backupStatus: SystemBackupStatus;
}

export function SystemSection({ backupStatus }: SystemSectionProps) {
  return (
    <div className="w-full space-y-6">
      <DataExportCard />
      <BackupStatusCard backupStatus={backupStatus} />
    </div>
  );
}
