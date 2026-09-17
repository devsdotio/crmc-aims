import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  assets,
  consumables,
  purchaseLots,
  type NewPurchaseLotRow,
  type PurchaseLotRow,
} from "@/server/db/schema";

import type {
  IPurchaseLotRepository,
  ListPurchaseLotFilters,
} from "./purchase-lot.types";

export class PurchaseLotRepository implements IPurchaseLotRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(purchaseLots)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByIdForUpdate(
    id: string,
    session: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await session
      .select()
      .from(purchaseLots)
      .where(and(...conditions))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  async findByLotCode(
    lotCode: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const altCode = lotCode.startsWith("PO-")
      ? lotCode.replace(/^PO-/, "LOT-")
      : lotCode.startsWith("LOT-")
      ? lotCode.replace(/^LOT-/, "PO-")
      : lotCode;
    const conditions = [or(eq(purchaseLots.lotCode, lotCode), eq(purchaseLots.lotCode, altCode), eq(purchaseLots.reference, lotCode))!];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(purchaseLots)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByLotCodeForUpdate(
    lotCode: string,
    session: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const altCode = lotCode.startsWith("PO-")
      ? lotCode.replace(/^PO-/, "LOT-")
      : lotCode.startsWith("LOT-")
      ? lotCode.replace(/^LOT-/, "PO-")
      : lotCode;
    const conditions = [or(eq(purchaseLots.lotCode, lotCode), eq(purchaseLots.lotCode, altCode), eq(purchaseLots.reference, lotCode))!];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await session
      .select()
      .from(purchaseLots)
      .where(and(...conditions))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListPurchaseLotFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));
    }

    if (filters.consumableId) {
      conditions.push(eq(purchaseLots.consumableId, filters.consumableId));
    }
    if (filters.assetId) {
      conditions.push(eq(purchaseLots.assetId, filters.assetId));
    }
    if (filters.supplierId) {
      conditions.push(eq(purchaseLots.supplierId, filters.supplierId));
    }
    if (filters.itemType) {
      conditions.push(eq(purchaseLots.itemType, filters.itemType));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(purchaseLots.lotCode, q),
          ilike(purchaseLots.itemCode, q),
          ilike(purchaseLots.itemName, q),
          ilike(purchaseLots.supplierName, q),
          ilike(purchaseLots.reference, q),
          ilike(purchaseLots.notes, q)
        )!
      );
    }
    if (!filters.includeSandbox) {
      conditions.push(
        sql`(
          (${purchaseLots.assetId} is null OR not exists (
            select 1 from ${assets}
            where ${assets.id} = ${purchaseLots.assetId} and ${assets.isSandbox} = true
          ))
          AND
          (${purchaseLots.consumableId} is null OR not exists (
            select 1 from ${consumables}
            where ${consumables.id} = ${purchaseLots.consumableId} and ${consumables.isSandbox} = true
          ))
        )`
      );
    }

    const base = db
      .select()
      .from(purchaseLots)
      .orderBy(desc(purchaseLots.purchasedOn), desc(purchaseLots.createdAt));

    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
  }

  /**
   * Oldest-first lots with remaining qty (FIFO), row locks for concurrent draws.
   */
  async listAvailableForConsumableFifo(
    consumableId: string,
    session: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow[]> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(purchaseLots.consumableId, consumableId),
      eq(purchaseLots.itemType, "consumable"),
      gt(purchaseLots.quantityRemaining, 0)
    ];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    return session
      .select()
      .from(purchaseLots)
      .where(and(...conditions))
      .orderBy(asc(purchaseLots.purchasedOn), asc(purchaseLots.createdAt))
      .for("update");
  }

  async updateRemaining(
    id: string,
    quantityRemaining: number,
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await db
      .update(purchaseLots)
      .set({ quantityRemaining, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  /** Bump original received qty + remaining (attach / found-stock correction). */
  async updateQuantities(
    id: string,
    quantity: number,
    quantityRemaining: number,
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await db
      .update(purchaseLots)
      .set({ quantity, quantityRemaining, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    data: Partial<Omit<NewPurchaseLotRow, "id" | "createdAt">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [row] = await db
      .update(purchaseLots)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(purchaseLots.id, id)];
    if (resolvedTenantId) conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));

    const [deleted] = await db
      .delete(purchaseLots)
      .where(and(...conditions))
      .returning();
    return Boolean(deleted);
  }

  async create(
    data: Omit<NewPurchaseLotRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<PurchaseLotRow> {
    const db = this.db(session);
    const [row] = await db.insert(purchaseLots).values(data).returning();
    if (!row) throw new Error("Failed to create purchase lot.");
    return row;
  }
}
