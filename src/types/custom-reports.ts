export const CUSTOM_REPORT_DATASETS = [
  "assets",
  "consumables",
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

export interface CustomReportFilters {
  search?: string;
  departmentId?: string;
  department?: string;
  category?: string;
  classification?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
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
  /** Block-specific payload */
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
  filterKeys: Array<keyof CustomReportFilters>;
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

export function defaultCustomReportLayout(reportTitle: string): CustomReportLayoutBlock[] {
  return [
    {
      id: "header",
      type: "header",
      props: {},
    },
    {
      id: "title",
      type: "title",
      props: { title: reportTitle },
    },
    {
      id: "filters_summary",
      type: "filters_summary",
      props: {},
    },
    {
      id: "table",
      type: "table",
      props: {},
    },
    {
      id: "footer",
      type: "footer",
      props: { footerText: "Generated from CRMC AIMS Custom Reports" },
    },
  ];
}
