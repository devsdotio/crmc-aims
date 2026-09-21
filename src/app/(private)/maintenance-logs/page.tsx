"use client";

import { Suspense } from "react";
import { MaintenanceLogsView } from "@/components/maintenance-logs/maintenance-logs-view";

export default function MaintenanceLogsPage() {
  return (
    <Suspense fallback={null}>
      <MaintenanceLogsView />
    </Suspense>
  );
}
