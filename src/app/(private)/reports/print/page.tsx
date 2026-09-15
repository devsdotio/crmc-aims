"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useExecutiveReportQuery } from "@/features/reports/client/use-reports";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";
import { PrintTriggerButton } from "@/components/reports/print/PrintTriggerButton";

export default function PrintableReportPage() {
  const searchParams = useSearchParams();
  const reportType = searchParams.get("type") || "executive";

  const { data: executiveData, isLoading, error } = useExecutiveReportQuery();

  return (
    <div className="min-h-full w-full bg-[#E5E7EB] py-3 sm:py-5 px-2 sm:px-4 print:bg-white print:p-0 print:m-0">
      {/* ─── Top Control Toolbar (Screen Only) ──────────────────────────── */}
      <div className="no-print mx-auto mb-3 flex max-w-[7.6in] flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-300 bg-white p-2.5 sm:p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-neutral-600" />
            <span>Back to Reports</span>
          </Link>

          <div>
            <div className="text-xs font-bold text-neutral-900">
              Print Preview: {reportType === "executive" ? "Executive Overview" : "Operational Audit"}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Standard Letter (8.5&quot; × 11&quot;) · Live Institutional Data
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PrintTriggerButton />
        </div>
      </div>

      {/* ─── Printable Document Sheet Container ─────────────────────────── */}
      <div className="mx-auto max-w-[7.6in] rounded-xs border border-neutral-300 bg-white p-5 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-solid border-[#2A3260] border-r-transparent align-[-0.125em]" />
            <p className="text-xs font-semibold text-neutral-600">Generating live institutional audit rollup...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-xs text-red-600 space-y-1">
            <p className="font-bold">Error loading live report summary</p>
            <p className="text-neutral-500">{(error as Error)?.message || "Failed to fetch executive data"}</p>
          </div>
        ) : executiveData ? (
          <ExecutivePrintableReport
            data={executiveData}
            generatedAt={new Date()}
            filtersSummary="Scope: Institutional Rollup · Academic & Administrative Departments · All Categories"
          />
        ) : (
          <div className="py-20 text-center text-xs text-neutral-500">
            No report data available.
          </div>
        )}
      </div>
    </div>
  );
}
