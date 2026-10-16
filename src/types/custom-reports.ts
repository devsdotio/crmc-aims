export const CUSTOM_REPORT_DATASETS = [
  "assets",
  "consumables",
  "stock-movements",
  "purchase-orders",
  "requests",
  "maintenance",
  "projects",
] as const;

export type CustomReportDataset = (typeof CUSTOM_REPORT_DATASETS)[number];

export type CustomReportColumnKey = string;

export type CustomReportColumnType = "string" | "number" | "date" | "boolean";

export interface CustomReportColumnDef {
  key: CustomReportColumnKey;
  label: string;
  type: CustomReportColumnType;
  /** When true, field holds valuation/cost data. */
  sensitive?: boolean;
}

/** Multi-select / picker friendly filter bag. */
export interface CustomReportFilters {
  search?: string;
  /** Department UUIDs (preferred). */
  departmentIds?: string[];
  /** Department display names (for text columns / legacy). */
  departmentNames?: string[];
  projectIds?: string[];
  categories?: string[];
  classifications?: string[];
  statuses?: string[];
  assignmentTypes?: string[];
  itemTypes?: string[];
  requestTypes?: string[];
  assetIds?: string[];
  consumableIds?: string[];
  conditions?: string[];
  reasons?: string[];
  directions?: string[];
  startDate?: string;
  endDate?: string;

  /** @deprecated prefer departmentIds */
  departmentId?: string;
  /** @deprecated prefer departmentNames */
  department?: string;
  /** @deprecated prefer categories */
  category?: string;
  /** @deprecated prefer classifications */
  classification?: string;
  /** @deprecated prefer statuses */
  status?: string;
}

export type CustomReportFilterControl = "search" | "multi" | "dateRange";

export type CustomReportFilterOptionsSource =
  | "departments"
  | "projects"
  | "assetCategories"
  | "consumableCategories"
  | "assetClasses"
  | "consumableClasses"
  | "assets"
  | "consumables"
  | "static";

export type CustomReportFilterFieldKey =
  | "search"
  | "departments"
  | "projects"
  | "categories"
  | "classifications"
  | "statuses"
  | "assignmentTypes"
  | "itemTypes"
  | "requestTypes"
  | "assets"
  | "consumables"
  | "conditions"
  | "reasons"
  | "directions"
  | "dateRange";

export interface CustomReportFilterOption {
  id: string;
  label: string;
}

export interface CustomReportFilterFieldDef {
  key: CustomReportFilterFieldKey;
  label: string;
  control: CustomReportFilterControl;
  /** Which filter bag property this field writes (for multi/search). */
  filterKey?: keyof CustomReportFilters;
  optionsSource?: CustomReportFilterOptionsSource;
  staticOptions?: CustomReportFilterOption[];
  searchable?: boolean;
}

export type CustomReportLayoutBlockType =
  | "header"
  | "title"
  | "text"
  | "filters_summary"
  | "table"
  | "footer"
  | "signatories"
  | "page_break";

export interface CustomReportLayoutBlock {
  id: string;
  type: CustomReportLayoutBlockType;
  props?: {
    logoUrl?: string;
    orgName?: string;
    orgSubtitle?: string;
    title?: string;
    periodLabel?: string;
    text?: string;
    footerText?: string;
    signatories?: Array<{ name: string; role: string; title?: string }>;
  };
}

export interface CustomReportTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  dataset: CustomReportDataset;
  columns: CustomReportColumnKey[];
  defaultFilters: CustomReportFilters;
  layout: CustomReportLayoutBlock[];
  createdByUserId: string | null;
  createdByName: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomReportDatasetMeta {
  key: CustomReportDataset;
  label: string;
  description: string;
  columns: CustomReportColumnDef[];
  filterFields: CustomReportFilterFieldDef[];
}

export interface CustomReportFilterOptions {
  departments: CustomReportFilterOption[];
  projects: CustomReportFilterOption[];
  assetCategories: CustomReportFilterOption[];
  consumableCategories: CustomReportFilterOption[];
  assetClasses: CustomReportFilterOption[];
  consumableClasses: CustomReportFilterOption[];
  assets: CustomReportFilterOption[];
  consumables: CustomReportFilterOption[];
}

export interface CustomReportRunResult {
  templateId: string | null;
  dataset: CustomReportDataset;
  columns: CustomReportColumnDef[];
  rows: Record<string, string | number | boolean | null>[];
  total: number;
  page: number;
  pageSize: number;
  filters: CustomReportFilters;
  layout: CustomReportLayoutBlock[];
  organizationName?: string;
  organizationSubtitle?: string;
  logoUrl?: string;
}

export const CUSTOM_REPORT_PREVIEW_PAGE_SIZE = 100;
export const CUSTOM_REPORT_EXPORT_MAX_ROWS = 2000;

function asStringArray(value: unknown): string[] | undefined {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) {
    const out = value.map(String).map((s) => s.trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof value === "string") {
    const out = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

/** Normalize legacy single-value filters into multi-select arrays. */
export function normalizeCustomReportFilters(
  raw?: CustomReportFilters | Record<string, unknown> | null
): CustomReportFilters {
  if (!raw || typeof raw !== "object") return {};
  const f = raw as Record<string, unknown>;

  const departmentIds =
    asStringArray(f.departmentIds) ?? asStringArray(f.departmentId);
  const departmentNames =
    asStringArray(f.departmentNames) ?? asStringArray(f.department);
  const categories = asStringArray(f.categories) ?? asStringArray(f.category);
  const classifications =
    asStringArray(f.classifications) ?? asStringArray(f.classification);
  const statuses = asStringArray(f.statuses) ?? asStringArray(f.status);

  return {
    search: typeof f.search === "string" && f.search.trim() ? f.search.trim() : undefined,
    departmentIds,
    departmentNames,
    projectIds: asStringArray(f.projectIds),
    categories,
    classifications,
    statuses,
    assignmentTypes: asStringArray(f.assignmentTypes),
    itemTypes: asStringArray(f.itemTypes),
    requestTypes: asStringArray(f.requestTypes),
    assetIds: asStringArray(f.assetIds),
    consumableIds: asStringArray(f.consumableIds),
    conditions: asStringArray(f.conditions),
    reasons: asStringArray(f.reasons),
    directions: asStringArray(f.directions),
    startDate: typeof f.startDate === "string" && f.startDate ? f.startDate : undefined,
    endDate: typeof f.endDate === "string" && f.endDate ? f.endDate : undefined,
  };
}

export function summarizeCustomReportFilters(filters: CustomReportFilters): string {
  const parts: string[] = [];
  const push = (label: string, values?: string[]) => {
    if (values?.length) parts.push(`${label}: ${values.join(", ")}`);
  };
  if (filters.search) parts.push(`search: ${filters.search}`);
  push("departments", filters.departmentNames ?? filters.departmentIds);
  push("projects", filters.projectIds);
  push("categories", filters.categories);
  push("classes", filters.classifications);
  push("statuses", filters.statuses);
  push("assignment types", filters.assignmentTypes);
  push("item types", filters.itemTypes);
  push("request types", filters.requestTypes);
  push("assets", filters.assetIds);
  push("consumables", filters.consumableIds);
  push("conditions", filters.conditions);
  push("reasons", filters.reasons);
  push("directions", filters.directions);
  if (filters.startDate || filters.endDate) {
    parts.push(`dates: ${filters.startDate ?? "…"} → ${filters.endDate ?? "…"}`);
  }
  return parts.length ? parts.join(" · ") : "None";
}

export function defaultCustomReportLayout(reportTitle: string): CustomReportLayoutBlock[] {
  return [
    { id: "header", type: "header", props: {} },
    { id: "title", type: "title", props: { title: reportTitle } },
    { id: "filters_summary", type: "filters_summary", props: {} },
    { id: "table", type: "table", props: {} },
    {
      id: "footer",
      type: "footer",
      props: { footerText: "Generated from CRMC AIMS Custom Reports" },
    },
  ];
}
