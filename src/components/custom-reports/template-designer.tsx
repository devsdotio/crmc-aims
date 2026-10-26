"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Save,
  Play,
  Search,
  Check,
  CheckSquare,
  Square,
  X,
  FileSpreadsheet,
  Sliders,
  Layout,
  DollarSign,
  Loader2,
  ChevronRight,
} from "lucide-react";

import { useToast } from "@/components/providers/toast-context";
import { CustomReportFilterFields } from "@/components/custom-reports/filter-fields";
import { LayoutBlockEditor } from "@/components/custom-reports/layout-block-editor";
import {
  useCreateCustomReportTemplateMutation,
  useCustomReportDatasetsQuery,
  useCustomReportTemplateQuery,
  useUpdateCustomReportTemplateMutation,
} from "@/features/custom-reports/client";
import {
  defaultCustomReportLayout,
  type CustomReportColumnKey,
  type CustomReportDataset,
  type CustomReportFilters,
  type CustomReportLayoutBlock,
} from "@/types/custom-reports";

interface TemplateDesignerProps {
  mode: "create" | "edit";
  templateId?: string;
}

export function CustomReportTemplateDesigner({ mode, templateId }: TemplateDesignerProps) {
  const router = useRouter();
  const toast = useToast();
  const { data: datasets } = useCustomReportDatasetsQuery();
  const { data: existing, isLoading } = useCustomReportTemplateQuery(
    mode === "edit" ? templateId : undefined
  );
  const createMutation = useCreateCustomReportTemplateMutation();
  const updateMutation = useUpdateCustomReportTemplateMutation(templateId ?? "");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataset, setDataset] = useState<CustomReportDataset>("assets");
  const [columns, setColumns] = useState<CustomReportColumnKey[]>([]);
  const [defaultFilters, setDefaultFilters] = useState<CustomReportFilters>({});
  const [layout, setLayout] = useState<CustomReportLayoutBlock[]>(
    defaultCustomReportLayout("Custom report")
  );
  const [hydrated, setHydrated] = useState(mode === "create");
  const [columnSearch, setColumnSearch] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setDataset(existing.dataset);
    setColumns(existing.columns);
    setDefaultFilters(existing.defaultFilters ?? {});
    setLayout(
      existing.layout?.length ? existing.layout : defaultCustomReportLayout(existing.name)
    );
    setHydrated(true);
  }, [existing, hydrated, mode]);

  const datasetMeta = useMemo(
    () => datasets?.find((d) => d.key === dataset),
    [datasets, dataset]
  );

  useEffect(() => {
    if (mode !== "create" || !datasetMeta || columns.length > 0) return;
    setColumns(datasetMeta.columns.slice(0, 8).map((c) => c.key));
  }, [datasetMeta, mode, columns.length]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const removeColumn = (key: string) => {
    setColumns((prev) => prev.filter((k) => k !== key));
  };

  const selectAllColumns = () => {
    if (!datasetMeta) return;
    setColumns(datasetMeta.columns.map((c) => c.key));
  };

  const clearAllColumns = () => {
    setColumns([]);
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    setColumns((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx]!;
      next[idx] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  const handleDatasetChange = (next: CustomReportDataset) => {
    if (columns.length > 0) {
      const confirmSwitch = window.confirm(
        "Changing the dataset will reset your selected columns and filters. Continue?"
      );
      if (!confirmSwitch) return;
    }
    setDataset(next);
    const meta = datasets?.find((d) => d.key === next);
    if (meta) {
      setColumns(meta.columns.slice(0, 8).map((c) => c.key));
    } else {
      setColumns([]);
    }
    setDefaultFilters({});
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Report name is required.");
      return;
    }
    if (!columns.length) {
      toast.error("Please select at least one column for the report.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      dataset,
      columns,
      defaultFilters,
      layout: layout.length ? layout : defaultCustomReportLayout(name.trim()),
    };

    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Report template created successfully.");
        router.replace(`/custom-reports/${created.id}`);
      } else if (templateId) {
        await updateMutation.mutateAsync(payload);
        toast.success("Report template saved.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template.");
    }
  };

  const filteredDatasetColumns = useMemo(() => {
    if (!datasetMeta?.columns) return [];
    const q = columnSearch.toLowerCase().trim();
    if (!q) return datasetMeta.columns;
    return datasetMeta.columns.filter(
      (c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
    );
  }, [datasetMeta, columnSearch]);

  if (mode === "edit" && isLoading && !hydrated) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-text-secondary gap-2">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading template configuration…
      </div>
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6 pb-12 min-w-0 w-full">
      {/* High-Visibility Breadcrumb & Action Bar */}
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
          <span className="font-semibold text-text px-2 py-0.5 rounded-md bg-bg-subtle border border-border/80 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {mode === "create" ? "New Report Template" : name || "Edit Template"}
          </span>
        </nav>

        {/* Main Title Row with Prominent Back Button */}
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
                  {mode === "create" ? "New Custom Report Template" : `Edit: ${name || "Untitled"}`}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {mode === "create" ? "Draft" : "Designer"}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {mode === "create"
                  ? "Define columns, default filters, and formal printable layout for your report."
                  : `Configuring dataset attributes and printable layout for: ${dataset}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/custom-reports"
              className="h-9 px-3.5 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle inline-flex items-center gap-1.5 transition-colors"
            >
              Cancel
            </Link>
            {mode === "edit" && templateId && (
              <Link
                href={`/custom-reports/${templateId}/run`}
                onClick={() =>
                  toast.loading(`Loading report template "${name || "Custom Report"}"…`, {
                    duration: 3500,
                  })
                }
                className="h-9 px-3.5 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle inline-flex items-center gap-1.5 transition-colors"
              >
                <Play className="size-3.5" />
                Run Report
              </Link>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60 shadow-xs hover:opacity-90 transition-opacity"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Template Basics */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <FileSpreadsheet className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-text">General Information</h2>
            <p className="text-xs text-text-secondary">
              Specify the report title, audit notes, and underlying institutional data source.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text">
            <span className="inline-flex items-center gap-1">
              Report Name <span className="text-destructive font-bold">*</span>
            </span>
            <input
              className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deployed IT Assets by Academic Unit"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-text">
            <span className="inline-flex items-center gap-1">
              Data Source <span className="text-destructive font-bold">*</span>
            </span>
            <select
              className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={dataset}
              onChange={(e) => handleDatasetChange(e.target.value as CustomReportDataset)}
            >
              {(datasets ?? []).map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-text">
          <span>Description / Auditor Notes (Optional)</span>
          <textarea
            className="min-h-[64px] rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Document the purpose, retention period, or compliance guidelines for this report..."
          />
        </label>
        {datasetMeta && (
          <p className="text-xs text-text-secondary bg-bg-subtle/50 p-2.5 rounded-lg border border-border/60">
            <strong>Dataset Scope:</strong> {datasetMeta.description}
          </p>
        )}
      </section>

      {/* Section 2: Columns Selection & Sequencing */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-text">Columns &amp; Data Fields</h2>
              <p className="text-xs text-text-secondary">
                Select and sequence the data attributes to include in this report.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {columns.length} columns active
            </span>
            <button
              type="button"
              onClick={selectAllColumns}
              className="text-xs text-text-secondary hover:text-text font-medium underline"
            >
              Select All
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={clearAllColumns}
              className="text-xs text-text-secondary hover:text-text font-medium underline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Column Search Filter */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            placeholder="Search available fields…"
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-bg text-xs text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Column Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredDatasetColumns.map((col) => {
            const checked = columns.includes(col.key);
            return (
              <label
                key={col.key}
                className={`flex items-center gap-2.5 text-xs rounded-lg px-3 py-2 border cursor-pointer select-none transition-all ${
                  checked
                    ? "bg-primary/5 border-primary/40 text-text font-medium shadow-2xs"
                    : "bg-bg border-border text-text hover:bg-bg-subtle"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleColumn(col.key)}
                  className="sr-only"
                />
                <span
                  className={`size-4 rounded flex items-center justify-center border transition-colors ${
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border bg-bg"
                  }`}
                >
                  {checked && <Check className="size-3 stroke-[3]" />}
                </span>
                <span className="flex-1 truncate">{col.label}</span>
                {col.sensitive && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <DollarSign className="size-2.5" />
                    Cost
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Column Order Drag & Reorder List */}
        {columns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">
                Output Column Sequence (Left to Right):
              </span>
              <span className="text-[11px] text-text-secondary">
                Use arrows to adjust order
              </span>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {columns.map((key, index) => {
                const colDef = datasetMeta?.columns.find((c) => c.key === key);
                const label = colDef?.label ?? key;
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-text-secondary w-4 shrink-0 text-center">
                        {index + 1}
                      </span>
                      <span className="font-medium text-text truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveColumn(key, -1)}
                        className="p-1 rounded text-text-secondary hover:text-text hover:bg-bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Move left"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === columns.length - 1}
                        onClick={() => moveColumn(key, 1)}
                        className="p-1 rounded text-text-secondary hover:text-text hover:bg-bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Move right"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeColumn(key)}
                        className="p-1 rounded text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove column"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      {/* Section 3: Default Preset Filters */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
        <div className="pb-2 border-b border-border">
          <h2 className="text-sm font-bold text-text">Default Preset Filters</h2>
          <p className="text-xs text-text-secondary">
            These filters are preloaded when anyone runs this report. Operators can still adjust filters at runtime.
          </p>
        </div>
        <CustomReportFilterFields
          meta={datasetMeta}
          filters={defaultFilters}
          onChange={setDefaultFilters}
        />
      </section>

      {/* Section 4: Printable / PDF Document Layout */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Layout className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-text">Print &amp; PDF Document Layout</h2>
            <p className="text-xs text-text-secondary">
              Organize document sections, institutional headers, descriptive disclaimers, data grids, and official signatories.
            </p>
          </div>
        </div>
        <LayoutBlockEditor blocks={layout} onChange={setLayout} />
      </section>
    </div>
  );
}
