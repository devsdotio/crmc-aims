import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  projectAssetAssignments,
  projects,
  type NewProjectAssetAssignmentRow,
  type ProjectAssetAssignmentRow,
} from "@/server/db/schema";
import { projectHolderLabel } from "@/server/shared/custody-labels";

import type {
  IProjectAssetAssignmentRepository,
  ProjectAssetAssignmentStatus,
} from "./project-asset.types";

export class ProjectAssetAssignmentRepository
  implements IProjectAssetAssignmentRepository
{
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectAssetAssignmentRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectAssetAssignments.id, id)];
    if (resolvedTenantId) conditions.push(eq(projectAssetAssignments.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(projectAssetAssignments)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async listByProject(
    projectId: string,
    status?: ProjectAssetAssignmentStatus,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectAssetAssignmentRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectAssetAssignments.projectId, projectId)];
    if (resolvedTenantId) conditions.push(eq(projectAssetAssignments.tenantId, resolvedTenantId));
    if (status) {
      conditions.push(eq(projectAssetAssignments.status, status));
    }
    return db
      .select()
      .from(projectAssetAssignments)
      .where(and(...conditions))
      .orderBy(desc(projectAssetAssignments.assignedAt));
  }

  async findOpenByAssetId(
    assetId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectAssetAssignmentRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(projectAssetAssignments.assetId, assetId),
      eq(projectAssetAssignments.status, "assigned")
    ];
    if (resolvedTenantId) conditions.push(eq(projectAssetAssignments.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(projectAssetAssignments)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  /**
   * Holder labels for open project custody, keyed by asset id.
   * Used to keep asset list/detail UI honest when currentHolder was cleared
   * but the assignment row is still open.
   */
  async findOpenHolderLabelsByAssetIds(
    assetIds: string[],
    session?: DbSession,
    tenantId?: string
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (assetIds.length === 0) return out;

    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      inArray(projectAssetAssignments.assetId, assetIds),
      eq(projectAssetAssignments.status, "assigned")
    ];
    if (resolvedTenantId) conditions.push(eq(projectAssetAssignments.tenantId, resolvedTenantId));

    const rows = await db
      .select({
        assetId: projectAssetAssignments.assetId,
        projectCode: projects.projectCode,
        projectName: projects.name,
      })
      .from(projectAssetAssignments)
      .innerJoin(projects, eq(projects.id, projectAssetAssignments.projectId))
      .where(and(...conditions));

    for (const row of rows) {
      out.set(
        row.assetId,
        projectHolderLabel(row.projectCode, row.projectName)
      );
    }
    return out;
  }

  async create(
    data: Omit<NewProjectAssetAssignmentRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<ProjectAssetAssignmentRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(projectAssetAssignments)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();
    if (!row) throw new Error("Failed to create project asset assignment.");
    return row;
  }

  async update(
    id: string,
    data: Partial<
      Omit<ProjectAssetAssignmentRow, "id" | "createdAt" | "projectId">
    >,
    session?: DbSession,
    tenantId?: string
  ): Promise<ProjectAssetAssignmentRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(projectAssetAssignments.id, id)];
    if (resolvedTenantId) conditions.push(eq(projectAssetAssignments.tenantId, resolvedTenantId));

    const [row] = await db
      .update(projectAssetAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }
}
