import { and, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  assetLifecycleEvents,
  type AssetLifecycleEventRow,
  type NewAssetLifecycleEventRow,
} from "@/server/db/schema";

import type { ListLifecycleEventsFilters } from "./asset.lifecycle.types";

/**
 * Append-only lifecycle ledger access.
 * Intentionally no update/delete methods — audit integrity.
 */
export class AssetLifecycleRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async append(
    event: Omit<NewAssetLifecycleEventRow, "id" | "createdAt">,
    session?: DbSession
  ): Promise<AssetLifecycleEventRow> {
    const db = this.db(session);
    const tenantId =
      event.tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(assetLifecycleEvents)
      .values({
        ...event,
        ...(tenantId ? { tenantId } : {}),
      })
      .returning();

    if (!row) {
      throw new Error("Failed to append lifecycle event: no row returned.");
    }

    return row;
  }

  async findByAssetId(
    assetId: string,
    limit = 100,
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetLifecycleEventRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(assetLifecycleEvents.assetId, assetId)];
    if (resolvedTenantId) {
      conditions.push(eq(assetLifecycleEvents.tenantId, resolvedTenantId));
    }
    return db
      .select()
      .from(assetLifecycleEvents)
      .where(and(...conditions))
      .orderBy(desc(assetLifecycleEvents.createdAt))
      .limit(limit);
  }

  async findMany(
    filters: ListLifecycleEventsFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<AssetLifecycleEventRow[]> {
    const db = this.db(session);
    const limit = Math.min(filters.limit ?? 100, 500);
    const conditions = [];
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    if (resolvedTenantId) {
      conditions.push(eq(assetLifecycleEvents.tenantId, resolvedTenantId));
    }

    if (filters.assetId) {
      conditions.push(eq(assetLifecycleEvents.assetId, filters.assetId));
    }
    if (filters.assetCode) {
      conditions.push(eq(assetLifecycleEvents.assetCode, filters.assetCode));
    }
    if (filters.eventType) {
      conditions.push(eq(assetLifecycleEvents.eventType, filters.eventType));
    }

    if (!filters.assetId && !filters.assetCode) {
      conditions.push(isNotNull(assetLifecycleEvents.assetId));
    }

    if (conditions.length === 0) {
      return db
        .select()
        .from(assetLifecycleEvents)
        .orderBy(desc(assetLifecycleEvents.createdAt))
        .limit(limit);
    }

    return db
      .select()
      .from(assetLifecycleEvents)
      .where(and(...conditions))
      .orderBy(desc(assetLifecycleEvents.createdAt))
      .limit(limit);
  }
}
