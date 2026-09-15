"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Printer, ChevronDown } from "lucide-react";
import { getExportUrl } from "@/features/reports/client/reports-api";
import type { BaseReportFilters } from "@/types/reports";

interface ReportExportButtonProps {
  reportType: string;
  filters?: BaseReportFilters;
  onPrint?: () => void;
}

export function ReportExportButton({
  reportType,
  filters = {},
  onPrint,
}: ReportExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadCsv = () => {
    setIsOpen(false);
    const url = getExportUrl(reportType, filters, "csv");
    window.location.href = url;
  };

  const handlePrint = () => {
    setIsOpen(false);
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-text shadow-2xs hover:bg-bg-subtle hover:border-border transition-all cursor-pointer"
        aria-expanded={isOpen}
      >
        <Download className="h-3.5 w-3.5 text-accent" />
        <span>Export</span>
        <ChevronDown className="h-3 w-3 text-text-secondary ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
            <button
              onClick={handleDownloadCsv}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download CSV Sheet</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4 text-blue-600" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
