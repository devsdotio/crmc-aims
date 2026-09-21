"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ExportFormat = "csv" | "json";

export function DataExportCard() {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);

    // Simulate async export
    setTimeout(() => {
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 2200);
  };

  return (
    <div className="p-6 rounded-2xl border border-border bg-bg space-y-5">
      <div className="border-b border-border pb-4">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <Download className="h-4 w-4 text-text-secondary" />
          Full Institutional Data Export
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Download a complete export of all system records for archiving or external reporting
        </p>
      </div>

      {/* What's included */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          "All Asset Records",
          "Consumable Inventory",
          "Borrow & Return Logs",
          "Condition & Maintenance Logs",
        ].map((item) => (
          <div
            key={item}
            className="p-3 rounded-xl border border-border bg-bg-subtle text-center text-[11px] text-text font-semibold leading-snug"
          >
            {item}
          </div>
        ))}
      </div>

      {/* Format Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-text">
          Export File Format
        </label>
        <div className="flex gap-3">
          {[
            { id: "csv" as ExportFormat, label: "CSV Spreadsheet", icon: FileSpreadsheet },
            { id: "json" as ExportFormat, label: "JSON Full Backup", icon: FileJson },
          ].map(({ id, label, icon: Icon }) => {
            const isSelected = format === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFormat(id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                  isSelected
                    ? "bg-bg-subtle border-primary ring-1 ring-primary shadow-2xs text-text"
                    : "bg-bg border-border text-text-secondary hover:bg-bg-subtle/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Export CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {exportSuccess ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-active-text bg-status-active-bg/15 px-3 py-1.5 rounded-md">
            <Check className="h-4 w-4" />
            Export ready — check your downloads
          </span>
        ) : (
          <span className="text-xs text-text-secondary">
            {isExporting
              ? "Compiling institutional records…"
              : `Exports all CRMC-AIMS system data as a ${format.toUpperCase()} file`}
          </span>
        )}

        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition-all duration-150",
            isExporting
              ? "bg-bg-subtle text-text-secondary border border-border cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Export {format.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
