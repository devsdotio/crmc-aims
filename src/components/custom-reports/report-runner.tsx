"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";

import { useToast } from "@/components/providers/toast-context";
import { CustomReportFilterFields } from "@/components/custom-reports/filter-fields";
import {
  getCustomReportExportUrl,
  logCustomReportPrintIntent,
  useCustomReportDatasetsQuery,
  useCustomReportTemplateQuery,
  useRunCustomReportMutation,
} from "@/features/custom-reports/client";
import type { CustomReportFilters, CustomReportRunResult } from "@/types/custom-reports";

interface ReportRunnerProps {
  templateId: string;
}

function filtersSummary(filters: CustomReportFilters): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") parts.push(`${k}: ${v}`);
  }
  return parts.length ? parts.join(" · ") : "None";
}

export function CustomReportRunner({ templateId }: ReportRunnerProps) {
  const toast = useToast();
  const { data: template, isLoading } = useCustomReportTemplateQuery(templateId);
  const { data: datasets } = useCustomReportDatasetsQuery();
  const runMutation = useRunCustomReportMutation();
  const [filters, setFilters] = useState<CustomReportFilters>({});
  const [result, setResult] = useState<CustomReportRunResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!template || hydrated) return;
    setFilters(template.defaultFilters ?? {});
    setHydrated(true);
  }, [template, hydrated]);

  const datasetMeta = useMemo(
    () => datasets?.find((d) => d.key === template?.dataset),
    [datasets, template?.dataset]
  );

  const handleRun = async () => {
    try {
      const data = await runMutation.mutateAsync({
        templateId,
        filters,
        page: 1,
        pageSize: 100,
      });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run report.");
    }
  };

  useEffect(() => {
    if (hydrated && template && !result && !runMutation.isPending) {
      void handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial run once hydrated
  }, [hydrated, template?.id]);

  const handleCsv = () => {
    window.location.href = getCustomReportExportUrl(templateId, filters);
  };

  const handlePrint = async () => {
    try {
      await logCustomReportPrintIntent(templateId, filters);
      const payload = await runMutation.mutateAsync({
        templateId,
        filters,
        page: 1,
        pageSize: 2000,
      });
      sessionStorage.setItem(
        "custom-report-print",
        JSON.stringify({
          ...payload,
          filters: payload.filters,
          templateName: template?.name,
        })
      );
      window.open("/custom-reports/print", "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open print view.");
    }
  };

  if (isLoading || !template) {
    return <p className="text-sm text-text-secondary p-4">Loading report…</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/custom-reports"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-text truncate">
              {template.name}
            </h1>
            <p className="text-xs text-text-secondary">
              Dataset: {template.dataset} · {template.columns.length} columns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/custom-reports/${templateId}`}
            className="h-9 px-3 rounded-md border border-border text-sm font-medium text-text hover:bg-bg-subtle inline-flex items-center"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={runMutation.isPending}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-sm font-medium text-text hover:bg-bg-subtle disabled:opacity-60"
          >
            <RefreshCw className="size-4" />
            {runMutation.isPending ? "Running…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-sm font-medium text-text hover:bg-bg-subtle"
          >
            <Download className="size-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            <Printer className="size-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-bg p-4 flex flex-col gap-3 print:hidden">
        <h2 className="text-sm font-semibold text-text">Filters</h2>
        <CustomReportFilterFields
          meta={datasetMeta}
          filters={filters}
          onChange={setFilters}
        />
      </section>

      <section className="rounded-lg border border-border bg-bg overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold text-text">Preview</h2>
          <span className="text-xs text-text-secondary">
            {result
              ? `Showing ${result.rows.length} of ${result.total} (max 100 preview)`
              : "—"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle">
              <tr>
                {(result?.columns ?? []).map((c) => (
                  <th
                    key={c.key}
                    className="text-left font-medium text-text-secondary px-3 py-2 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(result?.rows ?? []).map((row, idx) => (
                <tr key={idx} className="border-t border-border">
                  {(result?.columns ?? []).map((c) => (
                    <td key={c.key} className="px-3 py-2 text-text whitespace-nowrap">
                      {row[c.key] === null || row[c.key] === undefined
                        ? "—"
                        : String(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {result && result.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(result.columns.length, 1)}
                    className="px-3 py-8 text-center text-text-secondary"
                  >
                    No rows match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {result && (
          <p className="px-4 py-2 text-xs text-text-secondary border-t border-border print:hidden">
            Applied filters: {filtersSummary(result.filters)}
          </p>
        )}
      </section>
    </div>
  );
}
