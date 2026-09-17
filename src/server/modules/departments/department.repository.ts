import { and, asc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  departments,
  profiles,
  type Department,
} from "@/server/db/schema";

import type {
  DepartmentListRow,
  IDepartmentRepository,
  ListDepartmentFilters,
} from "./department.types";

export class DepartmentRepository implements IDepartmentRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<Department | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(departments.id, id)];
    if (resolvedTenantId) conditions.push(eq(departments.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(departments)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByCode(
    code: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<Department | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [sql`upper(${departments.code}) = upper(${code.trim()})`];
    if (resolvedTenantId) conditions.push(eq(departments.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(departments)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByNameLower(
    name: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<Department | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [sql`lower(${departments.name}) = lower(${name.trim()})`];
    if (resolvedTenantId) conditions.push(eq(departments.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(departments)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListDepartmentFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<DepartmentListRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(departments.tenantId, resolvedTenantId));
    }

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(ilike(departments.name, q), ilike(departments.code, q))!
      );
    }
    if (!filters.includeSandbox) {
      conditions.push(eq(departments.isSandbox, false));
    }

    const borrowerJoin = and(
      eq(profiles.departmentId, departments.id),
      eq(profiles.role, "borrower")
    );

    const query = db
      .select({
        id: departments.id,
        tenantId: departments.tenantId,
        code: departments.code,
        name: departments.name,
        isSandbox: departments.isSandbox,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
        accountUserId: profiles.userId,
        accountEmail: profiles.email,
        accountStatus: profiles.status,
      })
      .from(departments)
      .leftJoin(profiles, borrowerJoin)
      .orderBy(asc(departments.name));

    if (conditions.length === 0) return query;
    return query.where(and(...conditions));
  }

  async create(
    data: Omit<Department, "id" | "createdAt" | "updatedAt" | "tenantId">,
    session?: DbSession
  ): Promise<Department> {
    const db = this.db(session);
    const [row] = await db.insert(departments).values(data).returning();
    if (!row) throw new Error("Failed to create department.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Pick<Department, "code" | "name" | "isSandbox">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<Department | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(departments.id, id)];
    if (resolvedTenantId) conditions.push(eq(departments.tenantId, resolvedTenantId));

    const [row] = await db
      .update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(departments.id, id)];
    if (resolvedTenantId) conditions.push(eq(departments.tenantId, resolvedTenantId));

    const deleted = await db
      .delete(departments)
      .where(and(...conditions))
      .returning({ id: departments.id });
    return deleted.length > 0;
  }

  async countLinkedProfiles(
    id: string,
    session?: DbSession
  ): Promise<number> {
    const db = this.db(session);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .where(eq(profiles.departmentId, id));
    return row?.count ?? 0;
  }

  async syncLinkedProfileDepartmentName(
    departmentId: string,
    name: string,
    session?: DbSession
  ): Promise<void> {
    const db = this.db(session);
    await db
      .update(profiles)
      .set({ department: name, updatedAt: new Date() })
      .where(eq(profiles.departmentId, departmentId));
  }
}
