import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  borrowRequests,
  departments,
  type BorrowRequestRow,
  type NewBorrowRequestRow,
} from "@/server/db/schema";

import type {
  IBorrowRequestRepository,
  ListBorrowRequestFilters,
} from "./borrow-request.types";

export class BorrowRequestRepository implements IBorrowRequestRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<BorrowRequestRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(borrowRequests.id, id)];
    if (resolvedTenantId) conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(borrowRequests)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  private buildConditions(filters: ListBorrowRequestFilters, tenantId?: string) {
    const conditions = [];
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    if (resolvedTenantId) {
      conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));
    }
    if (filters.status) {
      conditions.push(eq(borrowRequests.status, filters.status));
    }
    if (filters.department?.trim()) {
      conditions.push(eq(borrowRequests.department, filters.department.trim()));
    }
    if (filters.requesterUserId) {
      conditions.push(eq(borrowRequests.requesterUserId, filters.requesterUserId));
    }
    if (filters.requestType === "assignable") {
      conditions.push(eq(borrowRequests.requestType, "assignable"));
    } else if (filters.requestType === "borrowable") {
      conditions.push(
        or(
          eq(borrowRequests.requestType, "borrowable"),
          sql`${borrowRequests.requestType} is null`
        )!
      );
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(borrowRequests.requesterName, q),
          ilike(borrowRequests.requesterEmail, q),
          ilike(borrowRequests.requestCode, q),
          sql`${borrowRequests.items}::text ILIKE ${q}`
        )!
      );
    }
    if (filters.startDate) {
      conditions.push(sql`date(${borrowRequests.requestedAt}) >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`date(${borrowRequests.requestedAt}) <= ${filters.endDate}`);
    }
    if (filters.assetId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${borrowRequests.items}) AS item
          WHERE item->>'assetId' = ${filters.assetId}
        )`
      );
    }
    if (!filters.includeSandbox) {
      conditions.push(
        sql`(${borrowRequests.departmentId} is null OR not exists (
          select 1 from ${departments}
          where ${departments.id} = ${borrowRequests.departmentId}
            and ${departments.isSandbox} = true
        ))`
      );
      conditions.push(
        sql`not exists (
          select 1 from jsonb_array_elements(${borrowRequests.items}) AS item
          inner join assets a on a.id::text = item->>'assetId'
          where a.is_sandbox = true
        )`
      );
    }
    return conditions;
  }

  async list(
    filters: ListBorrowRequestFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<BorrowRequestRow[]> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);

    let base = db
      .select()
      .from(borrowRequests)
      .orderBy(desc(borrowRequests.requestedAt))
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
    filters: Omit<ListBorrowRequestFilters, "page" | "limit"> = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);
    
    let base = db.select({ value: count() }).from(borrowRequests).$dynamic();
    
    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }
    
    const [row] = await base;
    return Number(row?.value ?? 0);
  }

  async countByStatus(
    filters: Omit<ListBorrowRequestFilters, "status" | "page" | "limit"> = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<Record<string, number>> {
    const db = this.db(session);
    const conditions = this.buildConditions(filters, tenantId);
    
    let base = db
      .select({ status: borrowRequests.status, count: count() })
      .from(borrowRequests)
      .$dynamic();
      
    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }
    
    const rows = await base.groupBy(borrowRequests.status);
    const result: Record<string, number> = {};
    for (const row of rows) {
      if (row.status) {
        result[row.status] = Number(row.count);
      }
    }
    return result;
  }

  async countAll(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];
    if (resolvedTenantId) conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));
    let base = db.select({ value: count() }).from(borrowRequests).$dynamic();
    if (conditions.length > 0) {
      base = base.where(and(...conditions));
    }
    const [row] = await base;
    return Number(row?.value ?? 0);
  }

  async countPending(session?: DbSession, userId?: string, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(borrowRequests.status, "pending")];
    if (resolvedTenantId) conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));
    if (userId) conditions.push(eq(borrowRequests.requesterUserId, userId));
    const [row] = await db
      .select({ value: count() })
      .from(borrowRequests)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async create(
    data: Omit<NewBorrowRequestRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<BorrowRequestRow> {
    const db = this.db(session);
    const [row] = await db.insert(borrowRequests).values(data).returning();
    if (!row) throw new Error("Failed to create borrow request.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<BorrowRequestRow, "id" | "createdAt" | "updatedAt">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<BorrowRequestRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(borrowRequests.id, id)];
    if (resolvedTenantId) conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));

    const [row] = await db
      .update(borrowRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }
}

export async function nextBorrowRequestSequence(tenantId?: string): Promise<number> {
  const db = getDb();
  const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
  const conditions = [
    sql`extract(year from ${borrowRequests.createdAt}) = extract(year from now())`
  ];
  if (resolvedTenantId) {
    conditions.push(eq(borrowRequests.tenantId, resolvedTenantId));
  }

  const [row] = await db
    .select({ value: count() })
    .from(borrowRequests)
    .where(and(...conditions));
  return Number(row?.value ?? 0) + 1;
}
