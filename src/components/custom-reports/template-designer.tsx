"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

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
      toast.error("Name is required.");
      return;
    }
    if (!columns.length) {
      toast.error("Select at least one column.");
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
        toast.success("Report template created.");
        router.replace(`/custom-reports/${created.id}`);
      } else if (templateId) {
        await updateMutation.mutateAsync(payload);
        toast.success("Report template saved.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template.");
    }
  };

  if (mode === "edit" && isLoading && !hydrated) {
    return <p className="text-sm text-text-secondary p-4">Loading template…</p>;
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href="/custom-reports"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-text">
            {mode === "create" ? "New custom report" : "Edit custom report"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && templateId && (
            <Link
              href={`/custom-reports/${templateId}/run`}
              className="h-9 px-3 rounded-md border border-border text-sm font-medium text-text hover:bg-bg-subtle inline-flex items-center"
            >
              Run
            </Link>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-bg p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Basics</h2>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Name
          <input
            className="h-9 rounded-md border border-border bg-bg px-2.5 text-sm text-text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Active assets by department"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Description
          <textarea
            className="min-h-[64px] rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes for other admins"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Dataset
          <select
            className="h-9 rounded-md border border-border bg-bg px-2.5 text-sm text-text"
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
        {datasetMeta && (
          <p className="text-xs text-text-secondary">{datasetMeta.description}</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Columns</h2>
          <span className="text-xs text-text-secondary">{columns.length} selected</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {(datasetMeta?.columns ?? []).map((col) => {
            const checked = columns.includes(col.key);
            return (
              <label
                key={col.key}
                className="flex items-center gap-2 text-sm text-text rounded-md px-2 py-1.5 hover:bg-bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleColumn(col.key)}
                />
                <span>
                  {col.label}
                  {col.sensitive ? (
                    <span className="ml-1 text-[10px] uppercase text-text-secondary">cost</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {columns.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-text-secondary mb-1">Column order</p>
            <ol className="flex flex-col gap-1">
              {columns.map((key) => {
                const label =
                  datasetMeta?.columns.find((c) => c.key === key)?.label ?? key;
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <span>{label}</span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className="text-xs px-1.5 py-0.5 border border-border rounded"
                        onClick={() => moveColumn(key, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="text-xs px-1.5 py-0.5 border border-border rounded"
                        onClick={() => moveColumn(key, 1)}
                      >
                        Down
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Default filters</h2>
        <CustomReportFilterFields
          meta={datasetMeta}
          filters={defaultFilters}
          onChange={setDefaultFilters}
        />
      </section>

      <section className="rounded-lg border border-border bg-bg p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Layout</h2>
        <p className="text-xs text-text-secondary">
          Design how the printed / PDF report is structured. Logo and org name default from
          tenant branding when header fields are left blank.
        </p>
        <LayoutBlockEditor blocks={layout} onChange={setLayout} />
      </section>
    </div>
  );
}
