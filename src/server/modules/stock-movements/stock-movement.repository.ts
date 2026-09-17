import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
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
    const [row] = await db.insert(stockMovements).values(data).returning();
    if (!row) throw new Error("Failed to create stock movement.");
    return row;
  }

  async createMany(
    rows: Omit<NewStockMovementRow, "id" | "createdAt">[],
    session?: DbSession
  ): Promise<StockMovementRow[]> {
    if (rows.length === 0) return [];
    const db = this.db(session);
    return db.insert(stockMovements).values(rows).returning();
  }

  async findById(
    id: string,
    session?: DbSession
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const [row] = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByIdForUpdate(
    id: string,
    session: DbSession
  ): Promise<StockMovementRow | null> {
    const [row] = await session
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.id, id))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  /** Compensating restock that undoes a given issue movement, if any. */
  async findReversalOf(
    movementId: string,
    session?: DbSession
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const marker = reversesMarker(movementId);
    const [row] = await db
      .select()
      .from(stockMovements)
      .where(ilike(stockMovements.notes, `%${marker}%`))
      .orderBy(desc(stockMovements.createdAt))
      .limit(1);
    return row ?? null;
  }

  async findReversalsForIds(
    movementIds: string[],
    session?: DbSession
  ): Promise<Map<string, StockMovementRow>> {
    const out = new Map<string, StockMovementRow>();
    if (movementIds.length === 0) return out;

    const db = this.db(session);
    const conditions = movementIds.map((id) =>
      ilike(stockMovements.notes, `%${reversesMarker(id)}%`)
    );
    const rows = await db
      .select()
      .from(stockMovements)
      .where(or(...conditions)!)
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
    session?: DbSession
  ): Promise<StockMovementRow | null> {
    const db = this.db(session);
    const [row] = await db
      .update(stockMovements)
      .set({ notes })
      .where(eq(stockMovements.id, id))
      .returning();
    return row ?? null;
  }

  async listByConsumableId(
    consumableId: string,
    session?: DbSession
  ): Promise<StockMovementRow[]> {
    const db = this.db(session);
    return db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, consumableId))
      .orderBy(desc(stockMovements.createdAt));
  }

  async listRecent(filters: {
    reason?: StockMovementRow["reason"];
    limit?: number;
    includeSandbox?: boolean;
  }): Promise<StockMovementListRow[]> {
    const db = this.db();
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
