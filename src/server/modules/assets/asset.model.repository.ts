import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  assetModels,
  assets,
  borrowTransactions,
  projectAssetAssignments,
  type AssetModelRow,
  type NewAssetModelRow,
} from "@/server/db/schema";

export type ListAssetModelFilters = {
  category?: string;
  search?: string;
  includeSandbox?: boolean;
};

export class AssetModelRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetModelRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assetModels.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(assetModels.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(assetModels)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByModelCode(
    modelCode: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetModelRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assetModels.modelCode, modelCode)];
    if (resolvedTenantId) {
      conditions.push(eq(assetModels.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select()
      .from(assetModels)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListAssetModelFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetModelRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(assetModels.tenantId, resolvedTenantId));
    }
    if (filters.category?.trim()) {
      conditions.push(eq(assetModels.category, filters.category.trim()));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(assetModels.name, q),
          ilike(assetModels.modelCode, q),
          ilike(assetModels.manufacturer, q)
        )!
      );
    }
    const base = db
      .select()
      .from(assetModels)
      .orderBy(asc(assetModels.name));

    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
  }

  async countUnits(modelId: string, session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.modelId, modelId)];
    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select({ value: count() })
      .from(assets)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  /**
   * Highest unit sequence for `prefix-###` codes (global by prefix).
   * Used when bulk-adding units so a batch stays contiguous after the current max.
   */
  async maxUnitSequenceForPrefix(
    prefix: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const used = await this.collectSequencesForPrefix(prefix, session, tenantId);
    let max = 0;
    for (const n of used) {
      if (n > max) max = n;
    }
    return max;
  }

  /**
   * Lowest free sequence starting at 1 (fills gaps like a missing 011).
   */
  async firstAvailableSequenceForPrefix(
    prefix: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const used = await this.collectSequencesForPrefix(prefix, session, tenantId);
    let n = 1;
    while (used.has(n)) n += 1;
    return n;
  }

  private async collectSequencesForPrefix(
    prefix: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<Set<number>> {
    const db = this.db(session);
    const pattern = `${prefix}-%`;
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;

    const conditions = [ilike(assets.assetCode, pattern)];
    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    const rows = await db
      .select({ assetCode: assets.assetCode })
      .from(assets)
      .where(and(...conditions));

    const used = new Set<number>();
    const re = new RegExp(
      `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`,
      "i"
    );
    for (const row of rows) {
      const match = row.assetCode.match(re);
      if (match?.[1]) {
        const n = Number(match[1]);
        if (Number.isFinite(n) && n > 0) used.add(n);
      }
    }
    return used;
  }

  async create(
    data: Omit<NewAssetModelRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<AssetModelRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const insertPayload = resolvedTenantId
      ? { ...data, tenantId: resolvedTenantId }
      : data;

    const [row] = await db.insert(assetModels).values(insertPayload).returning();
    if (!row) throw new Error("Failed to create asset model.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<AssetModelRow, "id" | "createdAt">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetModelRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assetModels.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(assetModels.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .update(assetModels)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assetModels.id, id)];
    if (resolvedTenantId) {
      conditions.push(eq(assetModels.tenantId, resolvedTenantId));
    }

    const result = await db
      .delete(assetModels)
      .where(and(...conditions))
      .returning({ id: assetModels.id });
    return result.length > 0;
  }

  /**
   * Count of available (in stock) units: active, no holder, not reserved,
   * and no open project assignment (same rules as release / availableOnly).
   */
  async countAvailableUnits(
    modelId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(assets.modelId, modelId),
      eq(assets.status, "active"),
      sql`${assets.currentHolder} is null`,
      sql`not exists (
        select 1 from ${projectAssetAssignments}
        where ${projectAssetAssignments.assetId} = ${assets.id}
          and ${projectAssetAssignments.status} = 'assigned'
      )`,
      sql`not exists (
        select 1 from ${borrowTransactions}
        where ${borrowTransactions.assetId} = ${assets.id}
          and ${borrowTransactions.status} = 'active'
      )`
    ];
    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select({ value: count() })
      .from(assets)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }
}
