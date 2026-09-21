import { and, asc, count, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  assets,
  borrowTransactions,
  projectAssetAssignments,
  type AssetRow,
  type NewAssetRow,
} from "@/server/db/schema";

import type { IAssetRepository, ListAssetsFilters } from "./asset.types";

/**
 * List projection: skips bulky `maintenance_history` JSONB (detail/mutations only).
 */
const assetListColumns = {
  id: assets.id,
  tenantId: assets.tenantId,
  assetCode: assets.assetCode,
  name: assets.name,
  category: assets.category,
  status: assets.status,
  assignmentType: assets.assignmentType,
  modelId: assets.modelId,
  serialNumber: assets.serialNumber,
  location: assets.location,
  currentHolder: assets.currentHolder,
  reservedForRequestId: assets.reservedForRequestId,
  department: assets.department,
  purchaseDate: assets.purchaseDate,
  value: assets.value,
  supplierId: assets.supplierId,
  imageUrl: assets.imageUrl,
    notes: assets.notes,
    isSandbox: assets.isSandbox,
    lastUpdated: assets.lastUpdated,
    createdAt: assets.createdAt,
    updatedAt: assets.updatedAt,
  } as const;

function withEmptyMaintenanceHistory(
  row: Omit<AssetRow, "maintenanceHistory">
): AssetRow {
  return { ...row, maintenanceHistory: [] };
}

/**
 * Data-access only. No validation, no DTO mapping, no domain rules.
 * Methods accept optional `db` so multi-step ops can share a transaction.
 */
export class AssetRepository implements IAssetRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async getCategoryDistribution(
    session?: DbSession,
    tenantId?: string
  ): Promise<{ category: string; count: number }[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = resolvedTenantId ? [eq(assets.tenantId, resolvedTenantId)] : [];

    const base = db
      .select({
        category: assets.category,
        value: count(),
      })
      .from(assets);

    const rows = conditions.length > 0 
      ? await base.where(and(...conditions)).groupBy(assets.category)
      : await base.groupBy(assets.category);

    return rows.map((r) => ({
      category: r.category,
      count: Number(r.value),
    }));
  }

  async countAssigned(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    
    const conditions = [
      eq(assets.assignmentType, "assignable"),
      or(
        sql`${assets.currentHolder} IS NOT NULL`,
        sql`exists (
          select 1 from ${projectAssetAssignments}
          where ${projectAssetAssignments.assetId} = ${assets.id}
            and ${projectAssetAssignments.status} = 'assigned'
        )`
      ),
    ];
    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select({ val: count() })
      .from(assets)
      .where(and(...conditions));
    return Number(row?.val ?? 0);
  }

  async countByType(
    type: "borrowable" | "assignable",
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    
    const conditions = [eq(assets.assignmentType, type)];
    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    const [row] = await db
      .select({ val: count() })
      .from(assets)
      .where(and(...conditions));
    return Number(row?.val ?? 0);
  }

  async findMany(
    filters?: ListAssetsFilters,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(assets.tenantId, resolvedTenantId));
    }

    if (filters?.status) {
      conditions.push(eq(assets.status, filters.status));
    }
    if (filters?.modelId) {
      conditions.push(eq(assets.modelId, filters.modelId));
    }
    if (filters?.category?.trim()) {
      conditions.push(eq(assets.category, filters.category.trim()));
    }
    if (filters?.assignmentType) {
      conditions.push(eq(assets.assignmentType, filters.assignmentType));
    }
    if (filters?.availableOnly) {
      conditions.push(eq(assets.status, "active"));
      conditions.push(isNull(assets.currentHolder));
      // Must match release checks: open project or borrow custody blocks issue/assign.
      conditions.push(
        sql`not exists (
          select 1 from ${projectAssetAssignments}
          where ${projectAssetAssignments.assetId} = ${assets.id}
            and ${projectAssetAssignments.status} = 'assigned'
        )`
      );
      conditions.push(
        sql`not exists (
          select 1 from ${borrowTransactions}
          where ${borrowTransactions.assetId} = ${assets.id}
            and ${borrowTransactions.status} = 'active'
        )`
      );
    }
    if (filters?.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.assetCode, q),
          ilike(assets.name, q),
          ilike(assets.serialNumber, q),
          ilike(assets.location, q),
          ilike(assets.currentHolder, q)
        )!
      );
    }
    const base = db
      .select(assetListColumns)
      .from(assets)
      .orderBy(asc(assets.createdAt));
    const rows =
      conditions.length === 0 ? await base : await base.where(and(...conditions));
    return rows.map(withEmptyMaintenanceHistory);
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<AssetRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.id, id)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  /** Row lock for custody mutations (release/return). */
  async findByIdForUpdate(
    id: string,
    session: DbSession,
    tenantId?: string
  ): Promise<AssetRow | null> {
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.id, id)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const [row] = await session
      .select()
      .from(assets)
      .where(and(...conditions))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  async findByAssetCode(
    assetCode: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.assetCode, assetCode)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByModelId(
    modelId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.modelId, modelId)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const rows = await db
      .select(assetListColumns)
      .from(assets)
      .where(and(...conditions))
      .orderBy(asc(assets.assetCode));
    return rows.map(withEmptyMaintenanceHistory);
  }

  async create(
    data: Omit<NewAssetRow, "id" | "createdAt" | "updatedAt" | "lastUpdated"> &
      Partial<Pick<NewAssetRow, "lastUpdated">>,
    session?: DbSession
  ): Promise<AssetRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(assets)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create asset: no row returned from insert.");
    }

    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<AssetRow, "id" | "createdAt">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.id, id)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const [row] = await db
      .update(assets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    return row ?? null;
  }

  async delete(id: string, session?: DbSession, tenantId?: string): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assets.id, id)];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    const result = await db
      .delete(assets)
      .where(and(...conditions))
      .returning({ id: assets.id });

    return result.length > 0;
  }
}
