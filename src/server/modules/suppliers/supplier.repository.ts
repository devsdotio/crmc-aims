import { and, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  suppliers,
  type NewSupplierRow,
  type SupplierRow,
} from "@/server/db/schema";

import type { ISupplierRepository, ListSupplierFilters } from "./supplier.types";

export class SupplierRepository implements ISupplierRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<SupplierRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(suppliers.id, id)];
    if (resolvedTenantId) conditions.push(eq(suppliers.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListSupplierFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<SupplierRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(suppliers.tenantId, resolvedTenantId));
    }

    if (filters.activeOnly) {
      conditions.push(eq(suppliers.status, "active"));
    } else if (filters.status) {
      conditions.push(eq(suppliers.status, filters.status));
    }

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(suppliers.name, q),
          ilike(suppliers.supplierCode, q),
          ilike(suppliers.contactName, q),
          ilike(suppliers.contactEmail, q)
        )!
      );
    }

    const base = db.select().from(suppliers).orderBy(desc(suppliers.updatedAt));
    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
  }

  async create(
    data: Omit<NewSupplierRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<SupplierRow> {
    const db = this.db(session);
    const [row] = await db.insert(suppliers).values(data).returning();
    if (!row) throw new Error("Failed to create supplier.");
    return row;
  }

  async delete(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(suppliers.id, id)];
    if (resolvedTenantId) conditions.push(eq(suppliers.tenantId, resolvedTenantId));

    const deleted = await db
      .delete(suppliers)
      .where(and(...conditions))
      .returning({ id: suppliers.id });
    return deleted.length > 0;
  }

  async update(
    id: string,
    data: Partial<Omit<SupplierRow, "id" | "createdAt" | "supplierCode">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<SupplierRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(suppliers.id, id)];
    if (resolvedTenantId) conditions.push(eq(suppliers.tenantId, resolvedTenantId));

    const [row] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }
}
