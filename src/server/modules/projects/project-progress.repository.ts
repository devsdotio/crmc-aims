import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  projectProgressIndicators,
  type NewProjectProgressIndicatorRow,
  type ProjectProgressIndicatorRow,
} from "@/server/db/schema";

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
