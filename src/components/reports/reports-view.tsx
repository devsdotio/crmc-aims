"use client";

import { FileText, BarChart3, Clock } from "lucide-react";

export function ReportsView() {
  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden bg-bg-subtle p-6">
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-bg p-8 text-center shadow-xs">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary">
          <FileText className="h-8 w-8" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xs">
            <Clock className="h-3.5 w-3.5" />
          </span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-text">
          Reports &amp; Analytics
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">
          Comprehensive operational reports, inventory audits, and export tools are currently being prepared.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3.5 py-1.5 text-xs font-medium text-text-secondary">
          <BarChart3 className="h-3.5 w-3.5 text-text-secondary" />
          <span>Module in development</span>
        </div>
      </div>
    </div>
  );
}
