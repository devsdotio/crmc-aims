import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  consumables,
  stockMovements,
  type NewStockMovementRow,
  type StockMovementRow,
} from "@/server/db/schema";

export type StockMovementListRow = StockMovementRow & {
  itemCode: string;
  itemName: string;
  unit: string;
};

/** Notes marker linking a compensating restock back to the original issue. */
export function reversesMarker(movementId: string): string {
  return `[REVERSES:${movementId}]`;
}

export function voidedMarker(): string {
  return "[VOIDED]";
}

export function isVoidedNotes(notes?: string | null): boolean {
  return Boolean(notes?.includes("[VOIDED]"));
}

export function extractReversedId(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[REVERSES:([0-9a-f-]{36})\]/i);
  return match?.[1] ?? null;
}

export class StockMovementRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async create(
    data: Omit<NewStockMovementRow, "id" | "createdAt">,
    session?: DbSession
  ): Promise<StockMovementRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const insertPayload = resolvedTenantId
      ? { ...data, tenantId: resolvedTenantId }
      : data;

    const [row] = await db.insert(stockMovements).values(insertPayload).returning();
    if (!row) throw new Error("Failed to create stock movement.");
    return row;
  }

  async createMany(
    rows: Omit<NewStockMovementRow, "id" | "createdAt">[],
    session?: DbSession
  ): Promise<StockMovementRow[]> {
    if (rows.length === 0) return [];
    const db = this.db(session);
    const defaultTenantId = getTenantContext()?.tenantId;
    const payload = rows.map((r) => {
      const resolvedTenantId = (r as { tenantId?: string }).tenantId ?? defaultTenantId;
      return resolvedTenantId ? { ...r, tenantId: resolvedTenantId } : r;
    });

    return db.insert(stockMovements).values(payload).returning();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(stockMovements.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByIdForUpdate(
    id: string,
    session: DbSession,
    tenantId?: string
  ): Promise<StockMovementRow | null> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(stockMovements.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    const [row] = await session
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  /** Compensating restock that undoes a given issue movement, if any. */
  async findReversalOf(
    movementId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const marker = reversesMarker(movementId);
    const conditions = [ilike(stockMovements.notes, `%${marker}%`)];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(1);
    return row ?? null;
  }

  async findReversalsForIds(
    movementIds: string[],
    session?: DbSession,
    tenantId?: string
  ): Promise<Map<string, StockMovementRow>> {
    const out = new Map<string, StockMovementRow>();
    if (movementIds.length === 0) return out;

    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const markerConditions = movementIds.map((id) =>
      ilike(stockMovements.notes, `%${reversesMarker(id)}%`)
    );
    const conditions = [or(...markerConditions)!];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    const rows = await db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));

    for (const row of rows) {
      const originalId = extractReversedId(row.notes);
      if (originalId && !out.has(originalId)) {
        out.set(originalId, row);
      }
    }
    return out;
  }

  async updateNotes(
    id: string,
    notes: string | null,
    session?: DbSession,
    tenantId?: string
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(stockMovements.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .update(stockMovements)
      .set({ notes })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async listByConsumableId(
    consumableId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<StockMovementRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(stockMovements.consumableId, consumableId)];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }

    return db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));
  }

  async listRecent(filters: {
    reason?: StockMovementRow["reason"];
    limit?: number;
    includeSandbox?: boolean;
    tenantId?: string;
  }): Promise<StockMovementListRow[]> {
    const db = this.db();
    const resolvedTenantId = filters.tenantId ?? getTenantContext()?.tenantId;
    const columns = {
      id: stockMovements.id,
      tenantId: stockMovements.tenantId,
      movementCode: stockMovements.movementCode,
      consumableId: stockMovements.consumableId,
      qty: stockMovements.qty,
      direction: stockMovements.direction,
      reason: stockMovements.reason,
      departmentId: stockMovements.departmentId,
      projectId: stockMovements.projectId,
      purchaseLotId: stockMovements.purchaseLotId,
      lotCode: stockMovements.lotCode,
      unitCost: stockMovements.unitCost,
      lineTotal: stockMovements.lineTotal,
      requestId: stockMovements.requestId,
      notes: stockMovements.notes,
      actorUserId: stockMovements.actorUserId,
      actorName: stockMovements.actorName,
      createdAt: stockMovements.createdAt,
      itemCode: consumables.itemCode,
      itemName: consumables.name,
      unit: consumables.unit,
    };

    const conditions = [];
    if (resolvedTenantId) {
      conditions.push(eq(stockMovements.tenantId, resolvedTenantId));
    }
    if (filters.reason) {
      conditions.push(eq(stockMovements.reason, filters.reason));
    }
    if (!filters.includeSandbox) {
      conditions.push(eq(consumables.isSandbox, false));
      conditions.push(
        sql`(${stockMovements.departmentId} is null OR not exists (
          select 1 from departments d where d.id = ${stockMovements.departmentId} and d.is_sandbox = true
        ))`
      );
    }

    const base = db
      .select(columns)
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id));

    const filtered =
      conditions.length > 0 ? base.where(and(...conditions)) : base;

    return filtered
      .orderBy(desc(stockMovements.createdAt))
      .limit(filters.limit ?? 100);
  }
}
