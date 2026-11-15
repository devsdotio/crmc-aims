import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  assets,
  categories,
  consumables,
  departments,
  projects,
  reportTemplates,
  tenants,
  type NewReportTemplateRow,
  type ReportTemplateRow,
} from "@/server/db/schema";
import { NotFoundError } from "@/server/shared/errors";

export class CustomReportRepository {
  async list(tenantId: string): Promise<ReportTemplateRow[]> {
    const db = getDb();
    return db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.tenantId, tenantId))
      .orderBy(desc(reportTemplates.updatedAt));
  }

  async findById(id: string, tenantId: string): Promise<ReportTemplateRow | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(reportTemplates)
      .where(and(eq(reportTemplates.id, id), eq(reportTemplates.tenantId, tenantId)))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewReportTemplateRow): Promise<ReportTemplateRow> {
    const db = getDb();
    const [row] = await db.insert(reportTemplates).values(data).returning();
    if (!row) throw new Error("Failed to create report template");
    return row;
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<NewReportTemplateRow>
  ): Promise<ReportTemplateRow> {
    const db = getDb();
    const [row] = await db
      .update(reportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(reportTemplates.id, id), eq(reportTemplates.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundError("Report template", id);
    return row;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const db = getDb();
    const deleted = await db
      .delete(reportTemplates)
      .where(and(eq(reportTemplates.id, id), eq(reportTemplates.tenantId, tenantId)))
      .returning({ id: reportTemplates.id });
    if (!deleted.length) throw new NotFoundError("Report template", id);
  }

  async getTenantBranding(tenantId: string): Promise<{
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
    const branding = (tenant.branding ?? {}) as {
      logoUrl?: string;
      organizationName?: string;
      organizationSubtitle?: string;
      name?: string;
    };
    return {
      organizationName: branding.organizationName || branding.name || tenant.name,
      organizationSubtitle: branding.organizationSubtitle,
      logoUrl: branding.logoUrl,
    };
  }

  async getFilterOptionRows(tenantId: string) {
    const db = getDb();
    const [departmentRows, projectRows, categoryRows, assetRows, consumableRows] =
      await Promise.all([
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

    return {
      departmentRows,
      projectRows,
      categoryRows,
      assetRows,
      consumableRows,
    };
  }
}
