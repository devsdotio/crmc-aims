import { and, asc, eq, inArray, sql } from "drizzle-orm";

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

export type CategoryType =
  | "asset"
  | "consumable"
  | "asset_class"
  | "consumable_class";

export type CategoryListRow = {
  id: string;
  name: string;
  type: CategoryType;
  colorToken?: string;
  iconToken?: string;
  parentId?: string | null;
  parentName?: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

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

    const parentIds = [
      ...new Set(
        rows
          .map((r) => r.parentId)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];
    const parentNameById = new Map<string, string>();
    if (parentIds.length > 0) {
      const parentConditions = [inArray(categories.id, parentIds)];
      if (resolvedTenantId) {
        parentConditions.push(eq(categories.tenantId, resolvedTenantId));
      }
      const parents = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(...parentConditions));
      for (const p of parents) parentNameById.set(p.id, p.name);
    }

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

    const assetClassConditions = [];
    if (resolvedTenantId) {
      assetClassConditions.push(eq(assets.tenantId, resolvedTenantId));
    }
    const assetClassCountsBase = db
      .select({
        classLower: sql<string>`lower(${assets.classification})`,
        count: sql<number>`count(*)::int`,
      })
      .from(assets);

    const assetClassCounts = await (assetClassConditions.length > 0
      ? assetClassCountsBase
          .where(and(...assetClassConditions))
          .groupBy(sql`lower(${assets.classification})`)
      : assetClassCountsBase.groupBy(sql`lower(${assets.classification})`));

    const childCountConditions = [];
    if (resolvedTenantId) {
      childCountConditions.push(eq(categories.tenantId, resolvedTenantId));
    }
    childCountConditions.push(
      sql`${categories.type} in ('asset', 'consumable')`
    );
    const childCounts = await db
      .select({
        parentId: categories.parentId,
        count: sql<number>`count(*)::int`,
      })
      .from(categories)
      .where(and(...childCountConditions))
      .groupBy(categories.parentId);

    const consumableConditions = [];
    if (resolvedTenantId) consumableConditions.push(eq(consumables.tenantId, resolvedTenantId));
    const consumableCountsBase = db
      .select({
        categoryLower: sql<string>`lower(${consumables.category})`,
        count: sql<number>`count(*)::int`,
      })
      .from(consumables);

    const consumableCounts = await (consumableConditions.length > 0
      ? consumableCountsBase
          .where(and(...consumableConditions))
          .groupBy(sql`lower(${consumables.category})`)
      : consumableCountsBase.groupBy(sql`lower(${consumables.category})`));

    const consumableClassConditions = [];
    if (resolvedTenantId) {
      consumableClassConditions.push(eq(consumables.tenantId, resolvedTenantId));
    }
    const consumableClassCountsBase = db
      .select({
        classLower: sql<string>`lower(${consumables.categoryClass})`,
        count: sql<number>`count(*)::int`,
      })
      .from(consumables);

    const consumableClassCounts = await (consumableClassConditions.length > 0
      ? consumableClassCountsBase
          .where(and(...consumableClassConditions))
          .groupBy(sql`lower(${consumables.categoryClass})`)
      : consumableClassCountsBase.groupBy(
          sql`lower(${consumables.categoryClass})`
        ));

    const assetCountMap = new Map(assetCounts.map((r) => [r.categoryLower, r.count]));
    const assetClassCountMap = new Map(
      assetClassCounts.map((r) => [r.classLower, r.count])
    );
    const childCountMap = new Map(
      childCounts
        .filter((r) => r.parentId)
        .map((r) => [r.parentId as string, r.count])
    );
    const consumableCountMap = new Map(
      consumableCounts.map((r) => [r.categoryLower, r.count])
    );
    const consumableClassCountMap = new Map(
      consumableClassCounts.map((r) => [r.classLower, r.count])
    );

    return rows.map((c): CategoryListRow => {
      const lowerName = c.name.trim().toLowerCase();
      let itemCount = 0;
      if (c.type === "asset") {
        itemCount = assetCountMap.get(lowerName) ?? 0;
      } else if (c.type === "consumable") {
        itemCount = consumableCountMap.get(lowerName) ?? 0;
      } else if (c.type === "asset_class") {
        // Count child specific categories + assets stamped with this class name
        itemCount =
          (childCountMap.get(c.id) ?? 0) + (assetClassCountMap.get(lowerName) ?? 0);
      } else if (c.type === "consumable_class") {
        itemCount =
          (childCountMap.get(c.id) ?? 0) +
          (consumableClassCountMap.get(lowerName) ?? 0);
      }

      return {
        id: c.id,
        name: c.name,
        type: c.type as CategoryType,
        colorToken: c.colorToken || undefined,
        iconToken: c.iconToken || undefined,
        parentId: c.parentId ?? null,
        parentName: c.parentId ? parentNameById.get(c.parentId) ?? null : null,
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
      sql`lower(${categories.name}) = lower(${name.trim()})`,
    ];
    if (resolvedTenantId) conditions.push(eq(categories.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  /**
   * Resolve the general classification label for a specific asset category name.
   * Returns "" when the category has no parent asset class.
   */
  async resolveAssetClassificationForCategoryName(
    categoryName: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<string> {
    const found = await this.findByTypeAndName(
      "asset",
      categoryName,
      session,
      tenantId
    );
    if (!found?.parentId) return "";
    const parent = await this.findById(found.parentId, session, tenantId);
    if (!parent || parent.type !== "asset_class") return "";
    return parent.name.trim();
  }

  /**
   * Resolve the general classification label for a specific consumable category name.
   * Returns "" when the category has no parent consumable class.
   * Distinct from supply|material (`consumables.classification`).
   */
  async resolveConsumableCategoryClassForCategoryName(
    categoryName: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<string> {
    const found = await this.findByTypeAndName(
      "consumable",
      categoryName,
      session,
      tenantId
    );
    if (!found?.parentId) return "";
    const parent = await this.findById(found.parentId, session, tenantId);
    if (!parent || parent.type !== "consumable_class") return "";
    return parent.name.trim();
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
    }

    if (type === "asset_class") {
      const assetConditions = [sql`lower(${assets.classification}) = ${lower}`];
      if (resolvedTenantId) {
        assetConditions.push(eq(assets.tenantId, resolvedTenantId));
      }
      const [assetRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .where(and(...assetConditions));

      // Also block delete while specific categories still parent to this class
      // (caller should pass id for child check — countUsagesById preferred).
      return assetRes?.count ?? 0;
    }

    if (type === "consumable_class") {
      const classConditions = [
        sql`lower(${consumables.categoryClass}) = ${lower}`,
      ];
      if (resolvedTenantId) {
        classConditions.push(eq(consumables.tenantId, resolvedTenantId));
      }
      const [classRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(consumables)
        .where(and(...classConditions));
      return classRes?.count ?? 0;
    }

    const conditions = [sql`lower(${consumables.category}) = ${lower}`];
    if (resolvedTenantId) conditions.push(eq(consumables.tenantId, resolvedTenantId));
    const [res] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consumables)
      .where(and(...conditions));
    return res?.count ?? 0;
  }

  async countChildCategories(
    parentId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(categories.parentId, parentId)];
    if (resolvedTenantId) conditions.push(eq(categories.tenantId, resolvedTenantId));
    const [res] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(and(...conditions));
    return res?.count ?? 0;
  }

  async updateAndCascade(
    id: string,
    payload: {
      name: string;
      type: CategoryType;
      colorToken?: string | null;
      iconToken?: string | null;
      parentId?: string | null;
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
          ...(payload.iconToken !== undefined
            ? { iconToken: payload.iconToken || null }
            : {}),
          ...(payload.parentId !== undefined
            ? { parentId: payload.parentId || null }
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

          const assetModelUpdateConditions = [
            sql`lower(${assetModels.category}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            assetModelUpdateConditions.push(eq(assetModels.tenantId, resolvedTenantId));
          }
          await tx
            .update(assetModels)
            .set({ category: newName, updatedAt: now })
            .where(and(...assetModelUpdateConditions));

          const maintenanceUpdateConditions = [
            sql`lower(${maintenanceLogs.category}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            maintenanceUpdateConditions.push(
              eq(maintenanceLogs.tenantId, resolvedTenantId)
            );
          }
          await tx
            .update(maintenanceLogs)
            .set({ category: newName, updatedAt: now })
            .where(and(...maintenanceUpdateConditions));

          const borrowUpdateConditions = [
            sql`lower(${borrowTransactions.category}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            borrowUpdateConditions.push(eq(borrowTransactions.tenantId, resolvedTenantId));
          }
          await tx
            .update(borrowTransactions)
            .set({ category: newName, updatedAt: now })
            .where(and(...borrowUpdateConditions));
        }

        if (existing.type === "asset_class" || payload.type === "asset_class") {
          const classUpdateConditions = [
            sql`lower(${assets.classification}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            classUpdateConditions.push(eq(assets.tenantId, resolvedTenantId));
          }
          await tx
            .update(assets)
            .set({ classification: newName, lastUpdated: now })
            .where(and(...classUpdateConditions));

          const modelClassConditions = [
            sql`lower(${assetModels.classification}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            modelClassConditions.push(eq(assetModels.tenantId, resolvedTenantId));
          }
          await tx
            .update(assetModels)
            .set({ classification: newName, updatedAt: now })
            .where(and(...modelClassConditions));
        }

        if (existing.type === "consumable" || payload.type === "consumable") {
          const consumableUpdateConditions = [
            sql`lower(${consumables.category}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            consumableUpdateConditions.push(eq(consumables.tenantId, resolvedTenantId));
          }
          await tx
            .update(consumables)
            .set({ category: newName, updatedAt: now })
            .where(and(...consumableUpdateConditions));
        }

        if (
          existing.type === "consumable_class" ||
          payload.type === "consumable_class"
        ) {
          const classUpdateConditions = [
            sql`lower(${consumables.categoryClass}) = ${oldLower}`,
          ];
          if (resolvedTenantId) {
            classUpdateConditions.push(
              eq(consumables.tenantId, resolvedTenantId)
            );
          }
          await tx
            .update(consumables)
            .set({ categoryClass: newName, updatedAt: now })
            .where(and(...classUpdateConditions));
        }
      }

      // When an asset category's parent class changes, restamp assets under that category
      if (
        (existing.type === "asset" || payload.type === "asset") &&
        payload.parentId !== undefined
      ) {
        let className = "";
        if (payload.parentId) {
          const parent = await this.findById(payload.parentId, tx, resolvedTenantId);
          if (parent?.type === "asset_class") {
            className = parent.name.trim();
          }
        }
        const restampConditions = [
          sql`lower(${assets.category}) = ${newName.toLowerCase()}`,
        ];
        if (resolvedTenantId) {
          restampConditions.push(eq(assets.tenantId, resolvedTenantId));
        }
        await tx
          .update(assets)
          .set({ classification: className, lastUpdated: now })
          .where(and(...restampConditions));

        const modelRestamp = [
          sql`lower(${assetModels.category}) = ${newName.toLowerCase()}`,
        ];
        if (resolvedTenantId) {
          modelRestamp.push(eq(assetModels.tenantId, resolvedTenantId));
        }
        await tx
          .update(assetModels)
          .set({ classification: className, updatedAt: now })
          .where(and(...modelRestamp));
      }

      // When a consumable category's parent class changes, restamp categoryClass
      if (
        (existing.type === "consumable" || payload.type === "consumable") &&
        payload.parentId !== undefined
      ) {
        let className = "";
        if (payload.parentId) {
          const parent = await this.findById(
            payload.parentId,
            tx,
            resolvedTenantId
          );
          if (parent?.type === "consumable_class") {
            className = parent.name.trim();
          }
        }
        const restampConditions = [
          sql`lower(${consumables.category}) = ${newName.toLowerCase()}`,
        ];
        if (resolvedTenantId) {
          restampConditions.push(eq(consumables.tenantId, resolvedTenantId));
        }
        await tx
          .update(consumables)
          .set({ categoryClass: className, updatedAt: now })
          .where(and(...restampConditions));
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
      } else if (updated.type === "asset_class") {
        const childCount = await this.countChildCategories(
          updated.id,
          tx,
          resolvedTenantId
        );
        const classConditions = [sql`lower(${assets.classification}) = ${lower}`];
        if (resolvedTenantId) {
          classConditions.push(eq(assets.tenantId, resolvedTenantId));
        }
        const [classRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .where(and(...classConditions));
        count = childCount + (classRes?.count ?? 0);
      } else if (updated.type === "consumable_class") {
        const childCount = await this.countChildCategories(
          updated.id,
          tx,
          resolvedTenantId
        );
        const classConditions = [
          sql`lower(${consumables.categoryClass}) = ${lower}`,
        ];
        if (resolvedTenantId) {
          classConditions.push(eq(consumables.tenantId, resolvedTenantId));
        }
        const [classRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(consumables)
          .where(and(...classConditions));
        count = childCount + (classRes?.count ?? 0);
      } else {
        const countConditions = [sql`lower(${consumables.category}) = ${lower}`];
        if (resolvedTenantId) {
          countConditions.push(eq(consumables.tenantId, resolvedTenantId));
        }
        const [consumableRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(consumables)
          .where(and(...countConditions));
        count = consumableRes?.count ?? 0;
      }

      let parentName: string | null = null;
      if (updated.parentId) {
        const parent = await this.findById(
          updated.parentId,
          tx,
          resolvedTenantId
        );
        parentName = parent?.name ?? null;
      }

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type as CategoryType,
        colorToken: updated.colorToken || undefined,
        iconToken: updated.iconToken || undefined,
        parentId: updated.parentId ?? null,
        parentName,
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
