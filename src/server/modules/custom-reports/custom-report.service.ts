import { getDb } from "@/server/db";
import { tenants } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import {
  CUSTOM_REPORT_EXPORT_MAX_ROWS,
  CUSTOM_REPORT_PREVIEW_PAGE_SIZE,
  defaultCustomReportLayout,
  type CustomReportFilters,
  type CustomReportRunResult,
  type CustomReportTemplate,
} from "@/types/custom-reports";

import {
  executeDatasetQuery,
  listDatasetMetadata,
  resolveDatasetColumns,
} from "./dataset-registry";
import { CustomReportRepository } from "./custom-report.repository";
import type {
  CreateTemplateInput,
  ExportReportQuery,
  RunReportInput,
  UpdateTemplateInput,
} from "./custom-report.validation";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((r) => r.map(escapeCsvField).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.toISOString();
}

function mapTemplate(row: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  dataset: CustomReportTemplate["dataset"];
  columns: CustomReportTemplate["columns"];
  defaultFilters: CustomReportFilters;
  layout: CustomReportTemplate["layout"];
  createdByUserId: string | null;
  createdByName: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomReportTemplate {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    dataset: row.dataset,
    columns: row.columns ?? [],
    defaultFilters: row.defaultFilters ?? {},
    layout: row.layout ?? [],
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    updatedByUserId: row.updatedByUserId,
    updatedByName: row.updatedByName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

type TenantBranding = {
  logoUrl?: string;
  organizationName?: string;
  organizationSubtitle?: string;
  name?: string;
};

async function loadTenantBranding(tenantId: string): Promise<{
  organizationName?: string;
  organizationSubtitle?: string;
  logoUrl?: string;
}> {
  const db = getDb();
  const [tenant] = await db
    .select({ name: tenants.name, branding: tenants.branding })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) return {};
  const branding = (tenant.branding ?? {}) as TenantBranding;
  return {
    organizationName: branding.organizationName || branding.name || tenant.name,
    organizationSubtitle: branding.organizationSubtitle,
    logoUrl: branding.logoUrl,
  };
}

export class CustomReportService {
  constructor(private readonly repo = new CustomReportRepository()) {}

  listDatasets() {
    return listDatasetMetadata();
  }

  async listTemplates(tenantId: string): Promise<CustomReportTemplate[]> {
    const rows = await this.repo.list(tenantId);
    return rows.map(mapTemplate);
  }

  async getTemplate(id: string, tenantId: string): Promise<CustomReportTemplate> {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError("Report template", id);
    return mapTemplate(row);
  }

  async createTemplate(
    input: CreateTemplateInput,
    tenantId: string,
    actor: { userId: string; displayName: string }
  ): Promise<CustomReportTemplate> {
    resolveDatasetColumns(input.dataset, input.columns);
    const layout =
      input.layout && input.layout.length > 0
        ? input.layout
        : defaultCustomReportLayout(input.name);

    const row = await this.repo.create({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      dataset: input.dataset,
      columns: input.columns,
      defaultFilters: input.defaultFilters ?? {},
      layout,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
      updatedByUserId: actor.userId,
      updatedByName: actor.displayName,
    });
    return mapTemplate(row);
  }

  async updateTemplate(
    id: string,
    input: UpdateTemplateInput,
    tenantId: string,
    actor: { userId: string; displayName: string }
  ): Promise<CustomReportTemplate> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError("Report template", id);

    const dataset = input.dataset ?? existing.dataset;
    const columns = input.columns ?? existing.columns;
    resolveDatasetColumns(dataset, columns);

    const row = await this.repo.update(id, tenantId, {
      name: input.name,
      description: input.description === undefined ? undefined : input.description,
      dataset: input.dataset,
      columns: input.columns,
      defaultFilters: input.defaultFilters,
      layout: input.layout,
      updatedByUserId: actor.userId,
      updatedByName: actor.displayName,
    });
    return mapTemplate(row);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    await this.repo.delete(id, tenantId);
  }

  async run(
    input: RunReportInput,
    tenantId: string
  ): Promise<CustomReportRunResult> {
    let dataset = input.dataset;
    let columns = input.columns;
    let layout = input.layout;
    let templateId: string | null = input.templateId ?? null;
    let filters: CustomReportFilters = { ...(input.filters ?? {}) };

    if (input.templateId) {
      const template = await this.getTemplate(input.templateId, tenantId);
      dataset = dataset ?? template.dataset;
      columns = columns ?? template.columns;
      layout = layout ?? template.layout;
      filters = { ...template.defaultFilters, ...filters };
      templateId = template.id;
    }

    if (!dataset || !columns?.length) {
      throw new ValidationError("dataset and columns are required to run a report.");
    }

    const page = input.page ?? 1;
    const pageSize = Math.min(
      input.pageSize ?? CUSTOM_REPORT_PREVIEW_PAGE_SIZE,
      CUSTOM_REPORT_EXPORT_MAX_ROWS
    );
    const offset = (page - 1) * pageSize;

    const { columns: colDefs, result } = await executeDatasetQuery(
      dataset,
      tenantId,
      filters,
      columns,
      pageSize,
      offset
    );

    const branding = await loadTenantBranding(tenantId);

    return {
      templateId,
      dataset,
      columns: colDefs,
      rows: result.rows,
      total: result.total,
      page,
      pageSize,
      filters,
      layout: layout && layout.length > 0 ? layout : defaultCustomReportLayout("Custom report"),
      ...branding,
    };
  }

  async exportCsv(
    query: ExportReportQuery,
    tenantId: string
  ): Promise<{ filename: string; csv: string; templateName: string }> {
    const template = await this.getTemplate(query.templateId, tenantId);
    const filters: CustomReportFilters = {
      ...template.defaultFilters,
      search: query.search,
      departmentId: query.departmentId,
      department: query.department,
      category: query.category,
      classification: query.classification,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const { columns: colDefs, result } = await executeDatasetQuery(
      template.dataset,
      tenantId,
      filters,
      template.columns,
      CUSTOM_REPORT_EXPORT_MAX_ROWS,
      0
    );

    const headers = colDefs.map((c) => c.label);
    const keys = colDefs.map((c) => c.key);
    const csvRows = result.rows.map((row) => keys.map((k) => row[k]));
    const safeName = template.name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
    const filename = `custom-report_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      filename,
      csv: toCsv(headers, csvRows),
      templateName: template.name,
    };
  }
}
