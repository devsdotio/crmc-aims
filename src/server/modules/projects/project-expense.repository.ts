import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  projectExpenseLines,
  type NewProjectExpenseLineRow,
  type ProjectExpenseLineRow,
} from "@/server/db/schema";

import type {
  IProjectExpenseRepository,
} from "./project-expense.types";

export class ProjectExpenseRepository implements IProjectExpenseRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectExpenseLines.id, id)];
    if (resolvedTenantId) conditions.push(eq(projectExpenseLines.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(projectExpenseLines)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async listByProject(
    projectId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectExpenseLines.projectId, projectId)];
    if (resolvedTenantId) conditions.push(eq(projectExpenseLines.tenantId, resolvedTenantId));

    return db
      .select()
      .from(projectExpenseLines)
      .where(and(...conditions))
      .orderBy(
        desc(projectExpenseLines.incurredOn),
        desc(projectExpenseLines.createdAt)
      );
  }

  async sumAmountsByProjectIds(
    projectIds: string[],
    session?: DbSession,
    tenantId?: string
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (projectIds.length === 0) return map;

    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [inArray(projectExpenseLines.projectId, projectIds)];
    if (resolvedTenantId) conditions.push(eq(projectExpenseLines.tenantId, resolvedTenantId));

    const rows = await db
      .select({
        projectId: projectExpenseLines.projectId,
        total: sql<string>`coalesce(sum(${projectExpenseLines.amount}), 0)`,
      })
      .from(projectExpenseLines)
      .where(and(...conditions))
      .groupBy(projectExpenseLines.projectId);

    for (const row of rows) {
      const n = Number(row.total);
      map.set(row.projectId, Number.isFinite(n) ? n.toFixed(2) : "0.00");
    }
    return map;
  }

  async create(
    data: Omit<NewProjectExpenseLineRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<ProjectExpenseLineRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(projectExpenseLines)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();
    if (!row) throw new Error("Failed to create project expense line.");
    return row;
  }

  async update(
    id: string,
    data: Partial<
      Omit<ProjectExpenseLineRow, "id" | "createdAt" | "projectId">
    >,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectExpenseLines.id, id)];
    if (resolvedTenantId) conditions.push(eq(projectExpenseLines.tenantId, resolvedTenantId));

    const [row] = await db
      .update(projectExpenseLines)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectExpenseLines.id, id)];
    if (resolvedTenantId) conditions.push(eq(projectExpenseLines.tenantId, resolvedTenantId));

    const deleted = await db
      .delete(projectExpenseLines)
      .where(and(...conditions))
      .returning({ id: projectExpenseLines.id });
    return deleted.length > 0;
  }
}
