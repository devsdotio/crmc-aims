"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Play,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Search,
  Package,
  Layers,
  ArrowLeftRight,
  ShoppingCart,
  ClipboardList,
  Wrench,
  FolderKanban,
  AlertCircle,
  X,
  Loader2,
  Calendar,
} from "lucide-react";

import { useToast } from "@/components/providers/toast-context";
import {
  useCreateCustomReportTemplateMutation,
  useCustomReportTemplatesQuery,
  useDeleteCustomReportTemplateMutation,
} from "@/features/custom-reports/client";
import type { CustomReportDataset, CustomReportTemplate } from "@/types/custom-reports";

interface DatasetBadgeConfig {
  label: string;
  icon: typeof Package;
  classes: string;
}

const DATASET_CONFIGS: Record<CustomReportDataset, DatasetBadgeConfig> = {
  assets: {
    label: "Assets",
    icon: Package,
    classes: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  consumables: {
    label: "Consumables",
    icon: Layers,
    classes: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  "stock-movements": {
    label: "Stock Movements",
    icon: ArrowLeftRight,
    classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  "purchase-orders": {
    label: "Purchase Orders",
    icon: ShoppingCart,
    classes: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  requests: {
    label: "Requests",
    icon: ClipboardList,
    classes: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    classes: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  projects: {
    label: "Projects",
    icon: FolderKanban,
    classes: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
};

interface DeleteModalState {
  isOpen: boolean;
  template: CustomReportTemplate | null;
}

export function CustomReportTemplateList() {
  const { data, isLoading, isError, error, refetch } = useCustomReportTemplatesQuery();
  const deleteMutation = useDeleteCustomReportTemplateMutation();
  const createMutation = useCreateCustomReportTemplateMutation();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<string>("all");
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    template: null,
  });

  const confirmDelete = async () => {
    if (!deleteModal.template) return;
    try {
      await deleteMutation.mutateAsync(deleteModal.template.id);
      toast.success(`Template "${deleteModal.template.name}" deleted.`);
      setDeleteModal({ isOpen: false, template: null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template.");
    }
  };

  const handleClone = async (tpl: CustomReportTemplate) => {
    try {
      await createMutation.mutateAsync({
        name: `${tpl.name} (Copy)`,
        description: tpl.description,
        dataset: tpl.dataset,
        columns: tpl.columns,
        defaultFilters: tpl.defaultFilters,
        layout: tpl.layout,
      });
      toast.success("Template cloned successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone template.");
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!data) return [];
    return data.filter((tpl) => {
      const matchesDataset =
        selectedDataset === "all" || tpl.dataset === selectedDataset;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        (tpl.description && tpl.description.toLowerCase().includes(q)) ||
        tpl.dataset.toLowerCase().includes(q);
      return matchesDataset && matchesSearch;
    });
  }, [data, selectedDataset, searchQuery]);

  return (
    <div className="flex flex-col gap-5 min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-text">Custom Reports</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              Admin Suite
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Build, save, and print tenant-scoped report templates with customized columns, default filters, and formal layouts.
          </p>
        </div>
        <Link
          href="/custom-reports/new"
          className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-xs transition-opacity shrink-0"
        >
          <Plus className="size-4" />
          New Report
        </Link>
      </div>

      {/* Search & Dataset Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by title, dataset, or notes…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text p-0.5 rounded"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Dataset Tabs Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs min-w-0">
          <button
            type="button"
            onClick={() => setSelectedDataset("all")}
            className={`h-8 px-3 rounded-lg font-medium whitespace-nowrap transition-colors border ${
              selectedDataset === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-bg text-text-secondary border-border hover:bg-bg-subtle hover:text-text"
            }`}
          >
            All Datasets
          </button>
          {Object.entries(DATASET_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDataset(key)}
              className={`h-8 px-2.5 rounded-lg font-medium whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
                selectedDataset === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-bg text-text-secondary border-border hover:bg-bg-subtle hover:text-text"
              }`}
            >
              <config.icon className="size-3" />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl border border-border bg-bg-subtle/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{(error as Error)?.message ?? "Failed to load report templates."}</span>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-destructive/40 text-xs font-semibold hover:bg-destructive/10 transition-colors"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTemplates.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-bg/50 p-10 text-center flex flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-subtle text-text-secondary mb-3">
            <FileSpreadsheet className="size-6" />
          </div>
          <p className="text-sm font-semibold text-text">
            {searchQuery || selectedDataset !== "all"
              ? "No matching report templates"
              : "No custom reports created yet"}
          </p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            {searchQuery || selectedDataset !== "all"
              ? "Try adjusting your search criteria or switching to all datasets."
              : "Create custom report templates to extract assets, consumables, purchase orders, and logs with tailored fields."}
          </p>
          {!searchQuery && selectedDataset === "all" && (
            <Link
              href="/custom-reports/new"
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 shadow-xs"
            >
              <Plus className="size-3.5" />
              Create First Report
            </Link>
          )}
        </div>
      )}

      {/* Templates List */}
      {!isLoading && !isError && filteredTemplates.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {filteredTemplates.map((tpl) => {
            const badge = DATASET_CONFIGS[tpl.dataset] ?? {
              label: tpl.dataset,
              icon: FileSpreadsheet,
              classes: "bg-bg-subtle text-text-secondary border-border",
            };
            const BadgeIcon = badge.icon;
            const updatedDate = tpl.updatedAt
              ? new Date(tpl.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;

            return (
              <li
                key={tpl.id}
                className="group rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-xs transition-all p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 justify-between min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.classes}`}
                    >
                      <BadgeIcon className="size-3" />
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-medium text-text-secondary px-2 py-0.5 rounded-md bg-bg-subtle border border-border">
                      {tpl.columns.length} {tpl.columns.length === 1 ? "column" : "columns"}
                    </span>
                    {updatedDate && (
                      <span className="text-[11px] text-text-secondary inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {updatedDate}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/custom-reports/${tpl.id}/run`}
                    onClick={() =>
                      toast.loading(`Loading report template "${tpl.name}"…`, {
                        duration: 3500,
                      })
                    }
                    className="font-bold text-base text-text hover:text-primary transition-colors truncate block"
                  >
                    {tpl.name}
                  </Link>
                  {tpl.description && (
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                      {tpl.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                  <Link
                    href={`/custom-reports/${tpl.id}/run`}
                    onClick={() =>
                      toast.loading(`Loading report template "${tpl.name}"…`, {
                        duration: 3500,
                      })
                    }
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-xs transition-opacity"
                  >
                    <Play className="size-3.5" />
                    Run
                  </Link>
                  <Link
                    href={`/custom-reports/${tpl.id}`}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle transition-colors"
                  >
                    <Edit3 className="size-3" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleClone(tpl)}
                    disabled={createMutation.isPending}
                    title="Clone template"
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle disabled:opacity-60 transition-colors"
                  >
                    <Copy className="size-3" />
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ isOpen: true, template: tpl })}
                    title="Delete template"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-bg text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Accessible Confirmation Modal for Deletion */}
      {deleteModal.isOpen && deleteModal.template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
          <div
            className="absolute inset-0"
            onClick={() =>
              !deleteMutation.isPending &&
              setDeleteModal({ isOpen: false, template: null })
            }
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="delete-dialog-title"
                    className="text-base font-bold text-text leading-tight"
                  >
                    Delete Report Template
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, template: null })}
                disabled={deleteMutation.isPending}
                className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-bg-subtle text-xs space-y-2">
              <p className="text-text font-semibold">
                Are you sure you want to delete{" "}
                <span className="font-bold underline">
                  &ldquo;{deleteModal.template.name}&rdquo;
                </span>
                ?
              </p>
              <p className="text-text-secondary">
                Admins will no longer be able to run, export, or print reports using this layout and filter configuration.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, template: null })}
                disabled={deleteMutation.isPending}
                className="h-8.5 px-3 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Delete Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
