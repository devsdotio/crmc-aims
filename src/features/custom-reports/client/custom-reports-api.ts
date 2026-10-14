import type {
  CustomReportDatasetMeta,
  CustomReportFilters,
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

export function getCustomReportExportUrl(
  templateId: string,
  filters: CustomReportFilters = {}
): string {
  const sp = new URLSearchParams({ templateId });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  }
  return `/api/custom-reports/export?${sp.toString()}`;
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
