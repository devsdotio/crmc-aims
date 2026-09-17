import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  consumableRequestLines,
  consumableRequestReleaseAllocations,
  consumableRequests,
  consumables,
  departments,
  type ConsumableRequestLineRow,
  type ConsumableRequestReleaseAllocationRow,
  type ConsumableRequestRow,
  type NewConsumableRequestLineRow,
  type NewConsumableRequestReleaseAllocationRow,
  type NewConsumableRequestRow,
} from "@/server/db/schema";

import type {
  IConsumableRequestRepository,
  ListConsumableRequestFilters,
} from "./consumable-request.types";

export class ConsumableRequestRepository
  implements IConsumableRequestRepository
{
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ConsumableRequestRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumableRequests.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(consumableRequests)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  private buildConditions(filters: ListConsumableRequestFilters, tenantId?: string) {
    const conditions = [];
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    if (resolvedTenantId) {
      conditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
    }
    if (filters.status) {
      conditions.push(eq(consumableRequests.status, filters.status));
    }
    if (filters.department?.trim()) {
      conditions.push(
        eq(consumableRequests.department, filters.department.trim())
      );
    }
    if (filters.requesterUserId) {
      conditions.push(
        eq(consumableRequests.requesterUserId, filters.requesterUserId)
      );
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(consumableRequests.requesterName, q),
          ilike(consumableRequests.requesterEmail, q),
          ilike(consumableRequests.requestCode, q),
          ilike(consumableRequests.department, q),
          ilike(consumableRequests.purpose, q)
        )!
      );
    }
    if (filters.startDate) {
      conditions.push(
        sql`date(${consumableRequests.requestedAt}) >= ${filters.startDate}`
      );
    }
    if (filters.endDate) {
      conditions.push(
        sql`date(${consumableRequests.requestedAt}) <= ${filters.endDate}`
      );
    }
    if (!filters.includeSandbox) {
      conditions.push(
        sql`(${consumableRequests.departmentId} is null OR not exists (
          select 1 from ${departments}
          where ${departments.id} = ${consumableRequests.departmentId}
            and ${departments.isSandbox} = true
        ))`
      );
      conditions.push(
        sql`not exists (
          select 1 from ${consumableRequestLines}
          inner join ${consumables}
            on ${consumables.id} = ${consumableRequestLines.consumableId}
          where ${consumableRequestLines.requestId} = ${consumableRequests.id}
            and ${consumables.isSandbox} = true
        )`
      );
    }
    return conditions;
  }

  async list(
    filters: ListConsumableRequestFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<ConsumableRequestRow[]> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);

    let base = db
      .select()
      .from(consumableRequests)
      .orderBy(desc(consumableRequests.requestedAt))
      .$dynamic();

    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }

    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      base = base.limit(filters.limit).offset(offset);
    } else if (filters.limit) {
      base = base.limit(filters.limit);
    }

    return base;
  }

  async count(
    filters: Omit<ListConsumableRequestFilters, "page" | "limit"> = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);
    let base = db
      .select({ value: count() })
      .from(consumableRequests)
      .$dynamic();
    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }
    const [row] = await base;
    return Number(row?.value ?? 0);
  }

  async countByStatus(
    filters: Omit<
      ListConsumableRequestFilters,
      "status" | "page" | "limit"
    > = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<Record<string, number>> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);
    let base = db
      .select({ status: consumableRequests.status, count: count() })
      .from(consumableRequests)
      .$dynamic();
    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }
    const rows = await base.groupBy(consumableRequests.status);
    const result: Record<string, number> = {};
    for (const row of rows) {
      if (row.status) result[row.status] = Number(row.count);
    }
    return result;
  }

  async countPending(session?: DbSession, userId?: string, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumableRequests.status, "pending")];
    if (resolvedTenantId) {
      conditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
    }
    if (userId) {
      conditions.push(eq(consumableRequests.requesterUserId, userId));
    }
    const [row] = await db
      .select({ value: count() })
      .from(consumableRequests)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async create(
    data: Omit<NewConsumableRequestRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<ConsumableRequestRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const insertPayload = resolvedTenantId
      ? { ...data, tenantId: resolvedTenantId }
      : data;

    const [row] = await db.insert(consumableRequests).values(insertPayload).returning();
    if (!row) throw new Error("Failed to create consumable request.");
    return row;
  }

  async update(
    id: string,
    data: Partial<
      Omit<ConsumableRequestRow, "id" | "createdAt" | "requestCode">
    >,
    session?: DbSession,
    tenantId?: string
  ): Promise<ConsumableRequestRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumableRequests.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .update(consumableRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async createLines(
    rows: Omit<
      NewConsumableRequestLineRow,
      "id" | "createdAt" | "updatedAt"
    >[],
    session?: DbSession
  ): Promise<ConsumableRequestLineRow[]> {
    if (rows.length === 0) return [];
    const db = this.db(session);
    return db.insert(consumableRequestLines).values(rows).returning();
  }

  async deleteLinesByRequestId(
    requestId: string,
    session?: DbSession
  ): Promise<void> {
    const db = this.db(session);
    await db
      .delete(consumableRequestLines)
      .where(eq(consumableRequestLines.requestId, requestId));
  }

  async listLinesByRequestId(
    requestId: string,
    session?: DbSession
  ): Promise<ConsumableRequestLineRow[]> {
    const db = this.db(session);
    return db
      .select()
      .from(consumableRequestLines)
      .where(eq(consumableRequestLines.requestId, requestId))
      .orderBy(asc(consumableRequestLines.lineNo));
  }

  async updateLine(
    id: string,
    data: Partial<
      Omit<ConsumableRequestLineRow, "id" | "createdAt" | "requestId">
    >,
    session?: DbSession
  ): Promise<ConsumableRequestLineRow | null> {
    const db = this.db(session);
    const [row] = await db
      .update(consumableRequestLines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(consumableRequestLines.id, id))
      .returning();
    return row ?? null;
  }

  async listLinesByRequestIds(
    requestIds: string[],
    session?: DbSession
  ): Promise<ConsumableRequestLineRow[]> {
    if (requestIds.length === 0) return [];
    const db = this.db(session);
    return db
      .select()
      .from(consumableRequestLines)
      .where(inArray(consumableRequestLines.requestId, requestIds))
      .orderBy(
        asc(consumableRequestLines.requestId),
        asc(consumableRequestLines.lineNo)
      );
  }

  async createAllocations(
    rows: Omit<NewConsumableRequestReleaseAllocationRow, "id" | "createdAt">[],
    session?: DbSession
  ): Promise<ConsumableRequestReleaseAllocationRow[]> {
    if (rows.length === 0) return [];
    const db = this.db(session);
    return db
      .insert(consumableRequestReleaseAllocations)
      .values(rows)
      .returning();
  }

  async listAllocationsByRequestId(
    requestId: string,
    session?: DbSession
  ): Promise<ConsumableRequestReleaseAllocationRow[]> {
    const db = this.db(session);
    return db
      .select()
      .from(consumableRequestReleaseAllocations)
      .where(eq(consumableRequestReleaseAllocations.requestId, requestId))
      .orderBy(asc(consumableRequestReleaseAllocations.createdAt));
  }
}
