import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  assets,
  categories,
  consumables,
  departments,
  projects,
  tenants,
} from "@/server/db/schema";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import {
  CUSTOM_REPORT_EXPORT_MAX_ROWS,
  CUSTOM_REPORT_PREVIEW_PAGE_SIZE,
  defaultCustomReportLayout,
  normalizeCustomReportFilters,
  type CustomReportFilterOptions,
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
  ExportReportBody,
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
    defaultFilters: normalizeCustomReportFilters(row.defaultFilters ?? {}),
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

  async getFilterOptions(tenantId: string): Promise<CustomReportFilterOptions> {
    const db = getDb();
    const [
      departmentRows,
      projectRows,
      categoryRows,
      assetRows,
      consumableRows,
    ] = await Promise.all([
      db
        .select({ id: departments.id, name: departments.name, code: departments.code })
        .from(departments)
        .where(and(eq(departments.tenantId, tenantId), eq(departments.isSandbox, false)))
        .orderBy(asc(departments.name)),
      db
        .select({ id: projects.id, name: projects.name, code: projects.projectCode })
        .from(projects)
        .where(eq(projects.tenantId, tenantId))
        .orderBy(asc(projects.name)),
      db
        .select({
          id: categories.id,
          name: categories.name,
          type: categories.type,
        })
        .from(categories)
        .where(eq(categories.tenantId, tenantId))
        .orderBy(asc(categories.name)),
      db
        .select({
          id: assets.id,
          code: assets.assetCode,
          name: assets.name,
        })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.isSandbox, false)))
        .orderBy(asc(assets.assetCode))
        .limit(3000),
      db
        .select({
          id: consumables.id,
          code: consumables.itemCode,
          name: consumables.name,
        })
        .from(consumables)
        .where(and(eq(consumables.tenantId, tenantId), eq(consumables.isSandbox, false)))
        .orderBy(asc(consumables.itemCode))
        .limit(3000),
    ]);

    const assetCategories = categoryRows
      .filter((c) => c.type === "asset")
      .map((c) => ({ id: c.name, label: c.name }));
    const consumableCategories = categoryRows
      .filter((c) => c.type === "consumable")
      .map((c) => ({ id: c.name, label: c.name }));
    const assetClasses = categoryRows
      .filter((c) => c.type === "asset_class")
      .map((c) => ({ id: c.name, label: c.name }));
    const consumableClasses = categoryRows
      .filter((c) => c.type === "consumable_class")
      .map((c) => ({ id: c.name, label: c.name }));

    return {
      departments: departmentRows.map((d) => ({
        id: d.id,
        label: d.code ? `${d.name} (${d.code})` : d.name,
      })),
      projects: projectRows.map((p) => ({
        id: p.id,
        label: `${p.code} — ${p.name}`,
      })),
      assetCategories,
      consumableCategories,
      assetClasses,
      consumableClasses,
      assets: assetRows.map((a) => ({
        id: a.id,
        label: `${a.code} — ${a.name}`,
      })),
      consumables: consumableRows.map((c) => ({
        id: c.id,
        label: `${c.code} — ${c.name}`,
      })),
    };
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
    const defaultFilters = normalizeCustomReportFilters(input.defaultFilters ?? {});

    const row = await this.repo.create({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      dataset: input.dataset,
      columns: input.columns,
      defaultFilters,
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
      defaultFilters:
        input.defaultFilters !== undefined
          ? normalizeCustomReportFilters(input.defaultFilters)
          : undefined,
      layout: input.layout,
      updatedByUserId: actor.userId,
      updatedByName: actor.displayName,
    });
    return mapTemplate(row);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    await this.repo.delete(id, tenantId);
  }

  async run(input: RunReportInput, tenantId: string): Promise<CustomReportRunResult> {
    let dataset = input.dataset;
    let columns = input.columns;
    let layout = input.layout;
    let templateId: string | null = input.templateId ?? null;
    let filters = normalizeCustomReportFilters(input.filters ?? {});

    if (input.templateId) {
      const template = await this.getTemplate(input.templateId, tenantId);
      dataset = dataset ?? template.dataset;
      columns = columns ?? template.columns;
      layout = layout ?? template.layout;
      const runner = normalizeCustomReportFilters(input.filters ?? {});
      filters = { ...normalizeCustomReportFilters(template.defaultFilters) };
      for (const [key, value] of Object.entries(runner) as Array<
        [keyof CustomReportFilters, CustomReportFilters[keyof CustomReportFilters]]
      >) {
        if (value !== undefined) {
          (filters as Record<string, unknown>)[key] = value;
        }
      }
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
    body: ExportReportBody,
    tenantId: string
  ): Promise<{ filename: string; csv: string; templateName: string }> {
    const template = await this.getTemplate(body.templateId, tenantId);
    const runner = normalizeCustomReportFilters(body.filters ?? {});
    const filters: CustomReportFilters = {
      ...normalizeCustomReportFilters(template.defaultFilters),
    };
    for (const [key, value] of Object.entries(runner) as Array<
      [keyof CustomReportFilters, CustomReportFilters[keyof CustomReportFilters]]
    >) {
      if (value !== undefined) {
        (filters as Record<string, unknown>)[key] = value;
      }
    }

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
