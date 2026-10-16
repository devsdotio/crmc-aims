"use client";

import Link from "next/link";
import { FileSpreadsheet, Play, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-context";
import {
  useCreateCustomReportTemplateMutation,
  useCustomReportTemplatesQuery,
  useDeleteCustomReportTemplateMutation,
} from "@/features/custom-reports/client";
import type { CustomReportTemplate } from "@/types/custom-reports";

export function CustomReportTemplateList() {
  const { data, isLoading, isError, error, refetch } = useCustomReportTemplatesQuery();
  const deleteMutation = useDeleteCustomReportTemplateMutation();
  const createMutation = useCreateCustomReportTemplateMutation();
  const toast = useToast();

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete report template “${name}”? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template.");
    }
  };

  const handleClone = async (tpl: CustomReportTemplate) => {
    try {
      await createMutation.mutateAsync({
        name: `${tpl.name} (copy)`,
        description: tpl.description,
        dataset: tpl.dataset,
        columns: tpl.columns,
        defaultFilters: tpl.defaultFilters,
        layout: tpl.layout,
      });
      toast.success("Template cloned.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone template.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Custom Reports</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Build tenant-scoped report templates with your own columns, filters, and layout.
          </p>
        </div>
        <Link
          href="/custom-reports/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="size-4" />
          New report
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-text-secondary">Loading templates…</p>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {(error as Error)?.message ?? "Failed to load templates."}{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <FileSpreadsheet className="size-8 mx-auto text-text-secondary mb-2" />
          <p className="text-sm text-text">No custom reports yet.</p>
          <p className="text-xs text-text-secondary mt-1">
            Create a template to extract assets, consumables, POs, and more.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {data?.map((tpl) => (
          <li
            key={tpl.id}
            className="rounded-lg border border-border bg-bg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
          >
            <div className="min-w-0">
              <Link
                href={`/custom-reports/${tpl.id}`}
                className="font-medium text-text hover:underline truncate block"
              >
                {tpl.name}
              </Link>
              <p className="text-xs text-text-secondary mt-0.5">
                {tpl.dataset}
                {tpl.description ? ` · ${tpl.description}` : ""}
                {` · ${tpl.columns.length} columns`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/custom-reports/${tpl.id}/run`}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text hover:bg-bg-subtle"
              >
                <Play className="size-3.5" />
                Run
              </Link>
              <Link
                href={`/custom-reports/${tpl.id}`}
                className="inline-flex items-center h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text hover:bg-bg-subtle"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void handleClone(tpl)}
                disabled={createMutation.isPending}
                className="inline-flex items-center h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text hover:bg-bg-subtle disabled:opacity-60"
              >
                Clone
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(tpl.id, tpl.name)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-xs text-destructive hover:bg-bg-subtle"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
