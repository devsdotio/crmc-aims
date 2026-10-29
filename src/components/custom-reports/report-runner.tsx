"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Edit,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";

import { useToast } from "@/components/providers/toast-context";
import { CustomReportFilterFields } from "@/components/custom-reports/filter-fields";
import {
  downloadCustomReportCsv,
  logCustomReportPrintIntent,
  useCustomReportDatasetsQuery,
  useCustomReportTemplateQuery,
  useRunCustomReportMutation,
} from "@/features/custom-reports/client";
import { CustomReportPrintPreviewDialog } from "@/components/custom-reports/print/CustomReportPrintPreviewDialog";
import {
  buildCustomPrintPayload,
  buildCustomReportPrintUrl,
  storeCustomPrintPayload,
  type CustomPrintPayload,
} from "@/lib/custom-reports/print-payload";
import {
  summarizeCustomReportFilters,
  type CustomReportColumnDef,
  type CustomReportFilters,
  type CustomReportRunResult,
} from "@/types/custom-reports";

interface ReportRunnerProps {
  templateId: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function CustomReportRunner({ templateId }: ReportRunnerProps) {
  const toast = useToast();
  const { data: template, isLoading } = useCustomReportTemplateQuery(templateId);
  const { data: datasets } = useCustomReportDatasetsQuery();
  const runMutation = useRunCustomReportMutation();

  const [filters, setFilters] = useState<CustomReportFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<CustomReportFilters>({});
  const [result, setResult] = useState<CustomReportRunResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPayload, setPrintPayload] = useState<CustomPrintPayload | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  useEffect(() => {
    if (!template || hydrated) return;
    const defaults = template.defaultFilters ?? {};
    setFilters(defaults);
    setAppliedFilters(defaults);
    setHydrated(true);
  }, [template, hydrated]);

  const datasetMeta = useMemo(
    () => datasets?.find((d) => d.key === template?.dataset),
    [datasets, template?.dataset]
  );

  const isFiltersDirty = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  const handleRun = async (targetPage = currentPage, targetPageSize = pageSize, targetFilters = filters) => {
    try {
      const data = await runMutation.mutateAsync({
        templateId,
        filters: targetFilters,
        page: targetPage,
        pageSize: targetPageSize,
      });
      setResult(data);
      setAppliedFilters(targetFilters);
      setCurrentPage(targetPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run report.");
    }
  };

  useEffect(() => {
    if (hydrated && template && !result && !runMutation.isPending) {
      void handleRun(1, pageSize, template.defaultFilters ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [hydrated, template?.id]);

  const handleApplyFilters = () => {
    void handleRun(1, pageSize, filters);
  };

  const handleResetFilters = () => {
    const defaults = template?.defaultFilters ?? {};
    setFilters(defaults);
    void handleRun(1, pageSize, defaults);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    void handleRun(newPage, pageSize, appliedFilters);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    void handleRun(1, newSize, appliedFilters);
  };

  const handleCsv = async () => {
    try {
      setIsExportingCsv(true);
      await downloadCustomReportCsv(templateId, appliedFilters);
      toast.success("CSV download started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      toast.info("Assembling print view… Compiling records and tenant branding.");
      await logCustomReportPrintIntent(templateId, appliedFilters);
      const run = await runMutation.mutateAsync({
        templateId,
        filters: appliedFilters,
        page: 1,
        pageSize: 2000,
      });
      const payload = buildCustomPrintPayload(run, template?.name);
      storeCustomPrintPayload(payload);
      setPrintPayload(payload);
      setIsPrintPreviewOpen(true);
      toast.success("Print preview generated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open print preview.");
    } finally {
      setIsPrinting(false);
    }
  };

  const formatCellValue = (
    col: CustomReportColumnDef,
    rawVal: string | number | boolean | null | undefined
  ) => {
    if (rawVal === null || rawVal === undefined || rawVal === "") {
      return <span className="text-text-secondary/50">—</span>;
    }

    const isFinancial =
      col.sensitive ||
      col.key.toLowerCase().includes("cost") ||
      col.key.toLowerCase().includes("amount") ||
      col.key.toLowerCase().includes("price") ||
      col.key.toLowerCase().includes("spend") ||
      col.key.toLowerCase().includes("value");

    if (isFinancial) {
      const num = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
      if (!isNaN(num)) {
        return (
          <span className="font-mono font-medium text-text">
            ₱{num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
    }

    if (typeof rawVal === "boolean") {
      return rawVal ? (
        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-bg-subtle text-text-secondary border border-border">
          No
        </span>
      );
    }

    const valStr = String(rawVal);

    // Format ISO Dates
    if (
      col.type === "date" ||
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(valStr)
    ) {
      const parsed = new Date(valStr);
      if (!isNaN(parsed.getTime())) {
        return (
          <span className="font-mono text-xs text-text">
            {parsed.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      }
    }

    // Status Badges
    const lower = valStr.toLowerCase();
    if (["active", "operational", "approved", "fulfilled"].includes(lower)) {
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          {valStr}
        </span>
      );
    }
    if (["in_repair", "low_stock", "pending", "for_review"].includes(lower)) {
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          {valStr}
        </span>
      );
    }
    if (["disposed", "rejected", "damaged", "cancelled"].includes(lower)) {
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          {valStr}
        </span>
      );
    }

    return <span>{valStr}</span>;
  };

  if (isLoading || !template) {
    return (
      <div className="flex flex-col gap-5 pb-12 min-w-0 w-full animate-pulse">
        {/* Skeleton Breadcrumb Toolbar */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border bg-card/60 backdrop-blur-xs p-4 rounded-xl border min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Link
              href="/custom-reports"
              className="font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FileSpreadsheet className="size-3.5 text-primary" />
              Custom Reports
            </Link>
            <ChevronRight className="size-3 text-text-secondary/60 shrink-0" />
            <span className="h-4 w-28 bg-border/60 rounded-md inline-block" />
            <ChevronRight className="size-3 text-text-secondary/60 shrink-0" />
            <span className="text-text-secondary">Run Report</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/custom-reports"
                className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-bg text-text hover:bg-bg-subtle transition-all shrink-0"
              >
                <ArrowLeft className="size-4 text-text-secondary" />
              </Link>
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-border/70 rounded-md" />
                <div className="h-3.5 w-64 bg-border/40 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Body Card */}
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-center shadow-2xs">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-text">Loading report template…</p>
          <p className="text-xs text-text-secondary max-w-sm">
            Fetching dataset fields, runtime filters, and table configurations.
          </p>
        </div>
      </div>
    );
  }

  const totalRows = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="flex flex-col gap-5 pb-12 min-w-0 w-full">
      {/* High-Visibility Breadcrumb & Action Toolbar */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border bg-card/60 backdrop-blur-xs p-4 rounded-xl border min-w-0">
        {/* Breadcrumb Navigation Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
          <Link
            href="/custom-reports"
            className="font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="size-3.5 text-primary" />
            Custom Reports
          </Link>
          <ChevronRight className="size-3 text-text-secondary/60 shrink-0" />
          <span className="font-semibold text-text px-2 py-0.5 rounded-md bg-bg-subtle border border-border/80 truncate max-w-50 sm:max-w-xs md:max-w-sm">
            {template.name}
          </span>
          <ChevronRight className="size-3 text-text-secondary/60 shrink-0" />
          <span className="text-text-secondary shrink-0">Run Report</span>
        </nav>

        {/* Main Header Row with Prominent Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/custom-reports"
              className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-bg text-text hover:bg-bg-subtle hover:border-primary/40 transition-all shadow-2xs group shrink-0"
              title="Return to Custom Reports"
              aria-label="Back to Custom Reports"
            >
              <ArrowLeft className="size-4 text-text-secondary group-hover:text-text transition-colors" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-text truncate max-w-full">
                  {template.name}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-bg-subtle text-text-secondary border border-border shrink-0">
                  {template.dataset} · {template.columns.length} columns
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Execute query with live institutional filters, view preview ledger, or generate print exports.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/custom-reports/${templateId}`}
              className="h-9 px-3.5 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle inline-flex items-center gap-1.5 transition-colors"
            >
              <Edit className="size-3.5" />
              Edit Template
            </Link>
            <button
              type="button"
              onClick={() => void handleRun(currentPage, pageSize, appliedFilters)}
              disabled={runMutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle disabled:opacity-60 transition-colors"
            >
              <RefreshCw
                className={`size-3.5 ${runMutation.isPending ? "animate-spin text-primary" : ""}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleCsv()}
              disabled={isExportingCsv}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle disabled:opacity-60 transition-colors"
            >
              {isExportingCsv ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              CSV
            </button>
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60 shadow-xs transition-opacity"
            >
              {isPrinting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Runtime Filters Section with Apply Controls */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3 shadow-2xs min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border min-w-0">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-text">Runtime Filters</h2>
          </div>
          {isFiltersDirty && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
              ● Unapplied filter modifications
            </span>
          )}
        </div>

        <CustomReportFilterFields
          meta={datasetMeta}
          filters={filters}
          onChange={setFilters}
        />

        {/* Filter Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border mt-1 min-w-0">
          <p className="text-xs text-text-secondary min-w-0 flex-1 wrap-break-word">
            Applied: <span className="text-text font-medium">{summarizeCustomReportFilters(appliedFilters)}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {isFiltersDirty && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={runMutation.isPending}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                isFiltersDirty
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              }`}
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3" />
                  Apply Filters
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Live Table Preview & Pagination */}
      <section className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col min-w-0 w-full">
        {/* Table Summary Bar */}
        <div className="px-4 py-3 border-b border-border bg-bg-subtle/40 flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text">Dataset Ledger Preview</h2>
            {runMutation.isPending && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Loader2 className="size-3 animate-spin" />
                Updating rows…
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>
              Total records: <strong className="text-text">{totalRows.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              Page <strong className="text-text">{currentPage}</strong> of{" "}
              <strong className="text-text">{totalPages}</strong>
            </span>
          </div>
        </div>

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto min-w-0 w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-subtle/60 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                {(result?.columns ?? []).map((c) => (
                  <th
                    key={c.key}
                    className="py-2.5 px-3 whitespace-nowrap font-semibold"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              {(result?.rows ?? []).map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-bg-subtle/40 transition-colors"
                >
                  {(result?.columns ?? []).map((c) => (
                    <td
                      key={c.key}
                      className="py-2.5 px-3 whitespace-nowrap text-text"
                    >
                      {formatCellValue(c, row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {result && result.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(result.columns.length, 1)}
                    className="py-12 text-center text-text-secondary"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FileSpreadsheet className="size-6 text-text-secondary/60 mb-1" />
                      <p className="font-semibold text-text">No records found</p>
                      <p className="text-xs text-text-secondary max-w-sm">
                        No rows match your current runtime filter criteria. Try broadening your filter selections or date range.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="px-4 py-3 border-t border-border bg-bg-subtle/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-7 px-2 rounded-md border border-border bg-bg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1 || runMutation.isPending}
              onClick={() => handlePageChange(currentPage - 1)}
              className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>
            <span className="text-xs px-2 text-text font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || runMutation.isPending}
              onClick={() => handlePageChange(currentPage + 1)}
              className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Floating Animated Progress Toast during Document Assembly */}
      {isPrinting && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="relative flex items-center justify-center">
            <Loader2 className="size-5 text-primary animate-spin" />
            <span className="absolute size-2 rounded-full bg-primary/40 animate-ping" />
          </div>
          <div>
            <p className="text-xs font-bold text-text">Assembling Print Preview…</p>
            <p className="text-[11px] text-text-secondary">
              Compiling report records, layout, and tenant branding
            </p>
          </div>
        </div>
      )}

      {/* Dedicated In-App Print & PDF Preview Dialog */}
      <CustomReportPrintPreviewDialog
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        payload={printPayload}
        templateName={template?.name}
      />
    </div>
  );
}
