import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  projectProgressIndicators,
  type NewProjectProgressIndicatorRow,
  type ProjectProgressIndicatorRow,
} from "@/server/db/schema";

export type ProjectProgressCountRow = {
  projectId: string;
  totalIndicators: number;
  completedIndicators: number;
};

export class ProjectProgressRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectProgressIndicatorRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectProgressIndicators.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(projectProgressIndicators.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(projectProgressIndicators)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async listByProject(
    projectId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectProgressIndicatorRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectProgressIndicators.projectId, projectId)];
    if (resolvedTenantId) {
      conditions.push(eq(projectProgressIndicators.tenantId, resolvedTenantId));
    }

    return db
      .select()
      .from(projectProgressIndicators)
      .where(and(...conditions))
      .orderBy(
        asc(projectProgressIndicators.orderIndex),
        asc(projectProgressIndicators.createdAt)
      );
  }

  /** Aggregate indicator counts for many projects in one query (table list). */
  async countByProjectIds(
    projectIds: string[],
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectProgressCountRow[]> {
    if (projectIds.length === 0) return [];
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      inArray(projectProgressIndicators.projectId, projectIds),
    ];
    if (resolvedTenantId) {
      conditions.push(eq(projectProgressIndicators.tenantId, resolvedTenantId));
    }

    const rows = await db
      .select({
        projectId: projectProgressIndicators.projectId,
        totalIndicators: count(),
        completedIndicators: sql<number>`cast(sum(case when ${projectProgressIndicators.isCompleted} then 1 else 0 end) as int)`,
      })
      .from(projectProgressIndicators)
      .where(and(...conditions))
      .groupBy(projectProgressIndicators.projectId);

    return rows.map((r) => ({
      projectId: r.projectId,
      totalIndicators: Number(r.totalIndicators),
      completedIndicators: Number(r.completedIndicators),
    }));
  }

  async create(
    data: NewProjectProgressIndicatorRow,
    session?: DbSession
  ): Promise<ProjectProgressIndicatorRow> {
    const db = this.db(session);
    const [row] = await db
      .insert(projectProgressIndicators)
      .values(data)
      .returning();
    return row;
  }

  async update(
    id: string,
    data: Partial<NewProjectProgressIndicatorRow>,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectProgressIndicatorRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectProgressIndicators.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(projectProgressIndicators.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .update(projectProgressIndicators)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectProgressIndicators.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(projectProgressIndicators.tenantId, resolvedTenantId));
    }

    const deleted = await db
      .delete(projectProgressIndicators)
      .where(and(...conditions))
      .returning({ id: projectProgressIndicators.id });
    return deleted.length > 0;
  }
}
