import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  assets,
  maintenanceLogs,
  type MaintenanceLogRow,
  type NewMaintenanceLogRow,
} from "@/server/db/schema";

import type {
  IMaintenanceRepository,
  ListMaintenanceFilters,
} from "./maintenance.types";

export class MaintenanceRepository implements IMaintenanceRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession, tenantId?: string): Promise<MaintenanceLogRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(maintenanceLogs.id, id)];
    if (resolvedTenantId) conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(maintenanceLogs)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListMaintenanceFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));
    }

    if (filters.openOnly) {
      conditions.push(eq(maintenanceLogs.isResolved, false));
    }
    if (filters.condition) {
      conditions.push(eq(maintenanceLogs.condition, filters.condition));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(maintenanceLogs.assetCode, q),
          ilike(maintenanceLogs.assetName, q),
          ilike(maintenanceLogs.logCode, q),
          ilike(maintenanceLogs.notes, q)
        )!
      );
    }
    const base = db
      .select()
      .from(maintenanceLogs)
      .orderBy(desc(maintenanceLogs.dateLogged));

    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
  }

  async countOpen(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(maintenanceLogs.isResolved, false)];
    if (resolvedTenantId) conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));

    const [row] = await db
      .select({ value: count() })
      .from(maintenanceLogs)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async countOpenByAssetId(
    assetId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(maintenanceLogs.assetId, assetId),
      eq(maintenanceLogs.isResolved, false)
    ];
    if (resolvedTenantId) conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));

    const [row] = await db
      .select({ value: count() })
      .from(maintenanceLogs)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async listByAssetId(
    assetId: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(maintenanceLogs.assetId, assetId)];
    if (resolvedTenantId) {
      conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));
    }

    return db
      .select()
      .from(maintenanceLogs)
      .where(and(...conditions))
      .orderBy(desc(maintenanceLogs.dateLogged));
  }

  /**
   * Assets marked needs_repair that have no open maintenance log
   * (e.g. status flipped via edit before the hub was wired).
   */
  async findNeedsRepairWithoutOpenLog(
    options: { includeSandbox?: boolean } = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<
    Array<{
      id: string;
      assetCode: string;
      name: string;
      category: string;
      status: string;
      notes: string | null;
      currentHolder: string | null;
    }>
  > {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [
      eq(assets.status, "needs_repair"),
      sql`not exists (
        select 1 from ${maintenanceLogs}
        where ${maintenanceLogs.assetId} = ${assets.id}
          and ${maintenanceLogs.isResolved} = false
      )`,
    ];
    if (resolvedTenantId) conditions.push(eq(assets.tenantId, resolvedTenantId));

    return db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        category: assets.category,
        status: assets.status,
        notes: assets.notes,
        currentHolder: assets.currentHolder,
      })
      .from(assets)
      .where(and(...conditions));
  }

  async countYear(session?: DbSession, tenantId?: string): Promise<number> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [sql`extract(year from ${maintenanceLogs.createdAt}) = extract(year from now())`];
    if (resolvedTenantId) conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));

    const [row] = await db
      .select({ value: count() })
      .from(maintenanceLogs)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async create(
    data: Omit<NewMaintenanceLogRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<MaintenanceLogRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(maintenanceLogs)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();
    if (!row) throw new Error("Failed to create maintenance log.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<MaintenanceLogRow, "id" | "createdAt" | "logCode">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(maintenanceLogs.id, id)];
    if (resolvedTenantId) conditions.push(eq(maintenanceLogs.tenantId, resolvedTenantId));

    const [row] = await db
      .update(maintenanceLogs)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }
}
