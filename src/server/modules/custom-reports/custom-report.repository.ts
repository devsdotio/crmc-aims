import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  reportTemplates,
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
}
