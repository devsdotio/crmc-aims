import type {
  CustomReportDatasetMeta,
  CustomReportFilters,
  CustomReportFilterOptions,
  CustomReportLayoutBlock,
  CustomReportRunResult,
  CustomReportTemplate,
  CustomReportDataset,
  CustomReportColumnKey,
} from "@/types/custom-reports";

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: string | { message?: string }; message?: string }).error;
    const message =
      (typeof err === "string" ? err : err?.message) ||
      (json as { message?: string })?.message ||
      "Request failed";
    throw new Error(message);
  }
  return (json as { data: T }).data;
}

export async function fetchCustomReportDatasets(): Promise<CustomReportDatasetMeta[]> {
  const res = await fetch("/api/custom-reports/datasets");
  return parseJson(res);
}

export async function fetchCustomReportFilterOptions(): Promise<CustomReportFilterOptions> {
  const res = await fetch("/api/custom-reports/filter-options");
  return parseJson(res);
}

export async function fetchCustomReportTemplates(): Promise<CustomReportTemplate[]> {
  const res = await fetch("/api/custom-reports/templates");
  return parseJson(res);
}

export async function fetchCustomReportTemplate(id: string): Promise<CustomReportTemplate> {
  const res = await fetch(`/api/custom-reports/templates/${id}`);
  return parseJson(res);
}

export async function createCustomReportTemplate(body: {
  name: string;
  description?: string | null;
  dataset: CustomReportDataset;
  columns: CustomReportColumnKey[];
  defaultFilters?: CustomReportFilters;
  layout?: CustomReportLayoutBlock[];
}): Promise<CustomReportTemplate> {
  const res = await fetch("/api/custom-reports/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function updateCustomReportTemplate(
  id: string,
  body: Partial<{
    name: string;
    description: string | null;
    dataset: CustomReportDataset;
    columns: CustomReportColumnKey[];
    defaultFilters: CustomReportFilters;
    layout: CustomReportLayoutBlock[];
  }>
): Promise<CustomReportTemplate> {
  const res = await fetch(`/api/custom-reports/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function deleteCustomReportTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/custom-reports/templates/${id}`, { method: "DELETE" });
  await parseJson(res);
}

export async function runCustomReport(body: {
  templateId?: string;
  dataset?: CustomReportDataset;
  columns?: CustomReportColumnKey[];
  filters?: CustomReportFilters;
  layout?: CustomReportLayoutBlock[];
  page?: number;
  pageSize?: number;
}): Promise<CustomReportRunResult> {
  const res = await fetch("/api/custom-reports/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function downloadCustomReportCsv(
  templateId: string,
  filters: CustomReportFilters = {}
): Promise<void> {
  const res = await fetch("/api/custom-reports/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, filters }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const err = (json as { error?: string }).error;
    throw new Error(typeof err === "string" ? err : "Failed to export CSV");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "custom-report.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function logCustomReportPrintIntent(
  templateId: string,
  filters?: CustomReportFilters
): Promise<void> {
  await fetch("/api/custom-reports/print-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, filters }),
  });
}
