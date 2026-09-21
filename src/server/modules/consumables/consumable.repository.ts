import { and, count, desc, asc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  consumables,
  type ConsumableRow,
  type NewConsumableRow,
} from "@/server/db/schema";

import type {
  IConsumableRepository,
  ListConsumableFilters,
} from "./consumable.types";

/**
 * List projection: skips bulky stock `history` JSONB (loaded on GET by id).
 */
const consumableListColumns = {
  id: consumables.id,
  tenantId: consumables.tenantId,
  itemCode: consumables.itemCode,
  name: consumables.name,
  category: consumables.category,
  classification: consumables.classification,
  unit: consumables.unit,
  currentQty: consumables.currentQty,
  reservedQty: consumables.reservedQty,
  minThreshold: consumables.minThreshold,
  location: consumables.location,
  supplier: consumables.supplier,
  lastRestocked: consumables.lastRestocked,
  notes: consumables.notes,
  isSandbox: consumables.isSandbox,
  createdAt: consumables.createdAt,
  updatedAt: consumables.updatedAt,
} as const;

function withEmptyHistory(
  row: Omit<ConsumableRow, "history">
): ConsumableRow {
  return { ...row, history: [] };
}

export class ConsumableRepository implements IConsumableRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<ConsumableRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumables.id, id)];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(consumables)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByIdForUpdate(
    id: string,
    session: DbSession,
    tenantId?: string
  ): Promise<ConsumableRow | null> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumables.id, id)];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await session
      .select()
      .from(consumables)
      .where(and(...conditions))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  async findByCode(
    itemCode: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<ConsumableRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumables.itemCode, itemCode)];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(consumables)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListConsumableFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<import("@/types/filters").PaginatedResponse<ConsumableRow>> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(consumables.tenantId, resolvedTenantId));
    }

    if (filters.category) {
      conditions.push(eq(consumables.category, filters.category));
    }
    if (filters.classification) {
      conditions.push(eq(consumables.classification, filters.classification));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(consumables.name, q),
          ilike(consumables.itemCode, q),
          ilike(consumables.location, q)
        )!
      );
    }
    if (filters.stockLevel === "critical") {
      conditions.push(
        sql`${consumables.currentQty} <= ${consumables.minThreshold}`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Count total rows matching filters
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(consumables)
      .where(whereClause);

    const total = Number(totalCount ?? 0);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const rows = await db
      .select(consumableListColumns)
      .from(consumables)
      .where(whereClause)
      .orderBy(asc(consumables.currentQty), asc(consumables.name))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(withEmptyHistory),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async countYear(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [sql`extract(year from ${consumables.createdAt}) = extract(year from now())`];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await db
      .select({ value: count() })
      .from(consumables)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async countLowStock(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      sql`${consumables.currentQty} <= ceil(${consumables.minThreshold} * 1.2)`
    ];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await db
      .select({ value: count() })
      .from(consumables)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async getLowStockItems(limit: number, session?: DbSession, tenantId?: string): Promise<ConsumableRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      sql`${consumables.currentQty} <= ceil(${consumables.minThreshold} * 1.2)`
    ];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const rows = await db
      .select(consumableListColumns)
      .from(consumables)
      .where(and(...conditions))
      .orderBy(asc(consumables.currentQty))
      .limit(limit);
    return rows.map(withEmptyHistory);
  }

  async getCategoryDistribution(
    session?: DbSession,
    tenantId?: string
  ): Promise<{ category: string; count: number }[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const rows = await db
      .select({
        category: consumables.category,
        value: sql<number>`coalesce(sum(${consumables.currentQty}), 0)`,
      })
      .from(consumables)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(consumables.category);

    return rows.map((r) => ({
      category: r.category,
      count: Number(r.value),
    }));
  }

  async create(
    data: Omit<NewConsumableRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<ConsumableRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(consumables)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();
    if (!row) throw new Error("Failed to create consumable.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<ConsumableRow, "id" | "createdAt" | "itemCode">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<ConsumableRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumables.id, id)];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const [row] = await db
      .update(consumables)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(consumables.id, id)];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));

    const deleted = await db
      .delete(consumables)
      .where(and(...conditions))
      .returning({ id: consumables.id });
    return deleted.length > 0;
  }
}
