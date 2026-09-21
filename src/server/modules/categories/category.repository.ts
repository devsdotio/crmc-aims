import { and, asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { withTransaction, type DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  categories,
  assets,
  assetModels,
  maintenanceLogs,
  borrowTransactions,
  consumables,
} from "@/server/db/schema";

export type CategoryType = "asset" | "consumable";

export class CategoryRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async listByType(type?: CategoryType, session?: DbSession, tenantId?: string) {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];
    if (resolvedTenantId) conditions.push(eq(categories.tenantId, resolvedTenantId));
    if (type) conditions.push(eq(categories.type, type));

    const base = db.select().from(categories).orderBy(asc(categories.name));
    return conditions.length > 0 ? base.where(and(...conditions)) : base;
  }

  async listWithCounts(type?: CategoryType, session?: DbSession, tenantId?: string) {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const rows = await this.listByType(type, session, resolvedTenantId);

    const assetConditions = [];
    if (resolvedTenantId) assetConditions.push(eq(assets.tenantId, resolvedTenantId));
    const assetCountsBase = db
      .select({
        categoryLower: sql<string>`lower(${assets.category})`,
        count: sql<number>`count(*)::int`,
      })
      .from(assets);
    
    const assetCounts = await (assetConditions.length > 0 
      ? assetCountsBase.where(and(...assetConditions)).groupBy(sql`lower(${assets.category})`)
      : assetCountsBase.groupBy(sql`lower(${assets.category})`));

    const consumableConditions = [];
    if (resolvedTenantId) consumableConditions.push(eq(consumables.tenantId, resolvedTenantId));
    const consumableCountsBase = db
      .select({
        categoryLower: sql<string>`lower(${consumables.category})`,
        count: sql<number>`count(*)::int`,
      })
      .from(consumables);

    const consumableCounts = await (consumableConditions.length > 0
      ? consumableCountsBase.where(and(...consumableConditions)).groupBy(sql`lower(${consumables.category})`)
      : consumableCountsBase.groupBy(sql`lower(${consumables.category})`));

    const assetCountMap = new Map(assetCounts.map((r) => [r.categoryLower, r.count]));
    const consumableCountMap = new Map(
      consumableCounts.map((r) => [r.categoryLower, r.count])
    );

    return rows.map((c) => {
      const lowerName = c.name.trim().toLowerCase();
      const itemCount =
        c.type === "asset"
          ? (assetCountMap.get(lowerName) ?? 0)
          : (consumableCountMap.get(lowerName) ?? 0);

      return {
        id: c.id,
        name: c.name,
        type: c.type as CategoryType,
        colorToken: c.colorToken || undefined,
        itemCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  async findById(id: string, session?: DbSession, tenantId?: string) {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(categories.id, id)];
    if (resolvedTenantId) conditions.push(eq(categories.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  /** Case-insensitive match of settings-defined category name. */
  async findByTypeAndName(
    type: CategoryType,
    name: string,
    session?: DbSession,
    tenantId?: string
  ) {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(categories.type, type),
      sql`lower(${categories.name}) = lower(${name.trim()})`
    ];
    if (resolvedTenantId) conditions.push(eq(categories.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async countUsages(
    name: string,
    type: CategoryType,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const lower = name.trim().toLowerCase();
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;

    if (type === "asset") {
      const conditions = [sql`lower(${assets.category}) = ${lower}`];
      if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .where(and(...conditions));
      return res?.count ?? 0;
    } else {
      const conditions = [sql`lower(${consumables.category}) = ${lower}`];
      if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(consumables)
        .where(and(...conditions));
      return res?.count ?? 0;
    }
  }

  async updateAndCascade(
    id: string,
    payload: {
      name: string;
      type: CategoryType;
      colorToken?: string | null;
    },
    session?: DbSession,
    tenantId?: string
  ) {
    const run = async (tx: DbSession) => {
      const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
      const selectConditions = [eq(categories.id, id)];
      if (resolvedTenantId) selectConditions.push(eq(categories.tenantId, resolvedTenantId));

      const [existing] = await tx
        .select()
        .from(categories)
        .where(and(...selectConditions))
        .limit(1);

      if (!existing) {
        return null;
      }

      const oldName = existing.name.trim();
      const newName = payload.name.trim();
      const now = new Date();

      const [updated] = await tx
        .update(categories)
        .set({
          name: newName,
          type: payload.type,
          ...(payload.colorToken !== undefined
            ? { colorToken: payload.colorToken || null }
            : {}),
          updatedAt: now,
        })
        .where(and(...selectConditions))
        .returning();

      // If category name changed, cascade update to all entities referencing this category name
      if (oldName.toLowerCase() !== newName.toLowerCase()) {
        const oldLower = oldName.toLowerCase();

        if (existing.type === "asset" || payload.type === "asset") {
          const assetUpdateConditions = [sql`lower(${assets.category}) = ${oldLower}`];
          if (resolvedTenantId) assetUpdateConditions.push(eq(assets.tenantId, resolvedTenantId));
          await tx
            .update(assets)
            .set({ category: newName, lastUpdated: now })
            .where(and(...assetUpdateConditions));

          const assetModelUpdateConditions = [sql`lower(${assetModels.category}) = ${oldLower}`];
          if (resolvedTenantId) assetModelUpdateConditions.push(eq(assetModels.tenantId, resolvedTenantId));
          await tx
            .update(assetModels)
            .set({ category: newName, updatedAt: now })
            .where(and(...assetModelUpdateConditions));

          const maintenanceUpdateConditions = [sql`lower(${maintenanceLogs.category}) = ${oldLower}`];
          if (resolvedTenantId) maintenanceUpdateConditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));
          await tx
            .update(maintenanceLogs)
            .set({ category: newName, updatedAt: now })
            .where(and(...maintenanceUpdateConditions));

          const borrowUpdateConditions = [sql`lower(${borrowTransactions.category}) = ${oldLower}`];
          if (resolvedTenantId) borrowUpdateConditions.push(eq(borrowTransactions.tenantId, resolvedTenantId));
          await tx
            .update(borrowTransactions)
            .set({ category: newName, updatedAt: now })
            .where(and(...borrowUpdateConditions));
        }

        if (existing.type === "consumable" || payload.type === "consumable") {
          const consumableUpdateConditions = [sql`lower(${consumables.category}) = ${oldLower}`];
          if (resolvedTenantId) consumableUpdateConditions.push(eq(consumables.tenantId, resolvedTenantId));
          await tx
            .update(consumables)
            .set({ category: newName, updatedAt: now })
            .where(and(...consumableUpdateConditions));
        }
      }

      // Compute item count after update
      const lower = newName.toLowerCase();
      let count = 0;
      if (updated.type === "asset") {
        const countConditions = [sql`lower(${assets.category}) = ${lower}`];
        if (resolvedTenantId) countConditions.push(eq(assets.tenantId, resolvedTenantId));
        const [assetRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .where(and(...countConditions));
        count = assetRes?.count ?? 0;
      } else {
        const countConditions = [sql`lower(${consumables.category}) = ${lower}`];
        if (resolvedTenantId) countConditions.push(eq(consumables.tenantId, resolvedTenantId));
        const [consumableRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(consumables)
          .where(and(...countConditions));
        count = consumableRes?.count ?? 0;
      }

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type as CategoryType,
        colorToken: updated.colorToken || undefined,
        itemCount: count,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    };

    if (session) {
      return run(session);
    }
    return withTransaction(run);
  }
}
