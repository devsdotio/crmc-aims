import type { ActorContext } from "@/server/shared/auth";
import { isAssetOperatorRole } from "@/server/shared/roles";
import { ForbiddenError } from "@/server/shared/errors";
import { AuditLogRepository } from "./audit-logs.repository";
import { listAuditLogsQuerySchema, type ListAuditLogsQuery } from "./audit-logs.validation";
import type { AuditLogRow } from "@/server/db/schema/audit-logs";
import { getDb } from "@/server/db";
import {
  borrowRequests,
  consumableRequests,
  assets,
  consumables,
  purchaseLots,
  maintenanceLogs,
  profiles,
} from "@/server/db/schema";
import { inArray } from "drizzle-orm";

export class AuditLogService {
  constructor(private readonly repo = new AuditLogRepository()) {}

  async list(rawQuery: unknown, actor: ActorContext): Promise<AuditLogRow[]> {
    const filters = listAuditLogsQuerySchema.parse(rawQuery ?? {});
    
    // Borrowers can only view their own actions (unless they are querying a specific entity they own, 
    // but for now, enforce actorUserId to be their own for generic queries).
    if (!isAssetOperatorRole(actor.role)) {
      if (filters.actorUserId && filters.actorUserId !== actor.userId) {
        throw new ForbiddenError("You can only view your own audit logs.");
      }
      filters.actorUserId = actor.userId;
    }

    const logs = await this.repo.list(filters);

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = (id: string) => UUID_REGEX.test(id);

    // Group IDs by entity type to resolve human-readable codes
    const borrowRequestIds = Array.from(new Set(logs.filter(l => l.entityType === 'borrow_request').map(l => l.entityId)));
    const consumableRequestIds = Array.from(new Set(logs.filter(l => l.entityType === 'consumable_request').map(l => l.entityId)));
    const assetIds = Array.from(new Set(logs.filter(l => l.entityType === 'asset').map(l => l.entityId)));
    const consumableIds = Array.from(new Set(logs.filter(l => l.entityType === 'consumable').map(l => l.entityId)));
    const lotIds = Array.from(new Set(logs.filter(l => l.entityType === 'purchase_lot' || l.entityType === 'purchase_order').map(l => l.entityId)));
    const maintenanceIds = Array.from(new Set(logs.filter(l => l.entityType === 'maintenance_log' || l.entityType === 'maintenance').map(l => l.entityId)));
    const userIds = Array.from(new Set(logs.filter(l => l.entityType === 'user' || l.entityType === 'profile').map(l => l.entityId)));

    const db = getDb();
    const codeMap = new Map<string, string>();

    // For any ID that is already a code (non-UUID), initialize it directly in codeMap
    for (const log of logs) {
      if (!isUuid(log.entityId)) {
        codeMap.set(log.entityId, log.entityId);
      }
    }

    const validBorrowUuids = borrowRequestIds.filter(isUuid);
    if (validBorrowUuids.length > 0) {
      const rows = await db.select({ id: borrowRequests.id, code: borrowRequests.requestCode }).from(borrowRequests).where(inArray(borrowRequests.id, validBorrowUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validConsumableReqUuids = consumableRequestIds.filter(isUuid);
    if (validConsumableReqUuids.length > 0) {
      const rows = await db.select({ id: consumableRequests.id, code: consumableRequests.requestCode }).from(consumableRequests).where(inArray(consumableRequests.id, validConsumableReqUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validAssetUuids = assetIds.filter(isUuid);
    if (validAssetUuids.length > 0) {
      const rows = await db.select({ id: assets.id, code: assets.assetCode }).from(assets).where(inArray(assets.id, validAssetUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validConsumableUuids = consumableIds.filter(isUuid);
    if (validConsumableUuids.length > 0) {
      const rows = await db.select({ id: consumables.id, code: consumables.itemCode }).from(consumables).where(inArray(consumables.id, validConsumableUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validLotUuids = lotIds.filter(isUuid);
    if (validLotUuids.length > 0) {
      const rows = await db.select({ id: purchaseLots.id, code: purchaseLots.lotCode }).from(purchaseLots).where(inArray(purchaseLots.id, validLotUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validMaintenanceUuids = maintenanceIds.filter(isUuid);
    if (validMaintenanceUuids.length > 0) {
      const rows = await db.select({ id: maintenanceLogs.id, code: maintenanceLogs.logCode }).from(maintenanceLogs).where(inArray(maintenanceLogs.id, validMaintenanceUuids));
      for (const r of rows) codeMap.set(r.id, r.code);
    }

    const validUserUuids = userIds.filter(isUuid);
    if (validUserUuids.length > 0) {
      const rows = await db.select({ id: profiles.userId, code: profiles.email, name: profiles.fullName }).from(profiles).where(inArray(profiles.userId, validUserUuids));
      for (const r of rows) codeMap.set(r.id, r.code || r.name || r.id);
    }

    return logs.map(log => {
      // 1. If resolved in DB codeMap
      if (codeMap.has(log.entityId)) {
        return { ...log, entityId: codeMap.get(log.entityId)! };
      }

      // 2. Fallback to metadata code fields if entity was deleted or id was already a code
      const meta = log.metadata as Record<string, unknown> | null;
      if (meta) {
        const metaCode =
          (meta.assetCode as string) ||
          (meta.itemCode as string) ||
          (meta.requestCode as string) ||
          (meta.lotCode as string) ||
          (meta.logCode as string) ||
          (meta.code as string);
        if (metaCode) {
          return { ...log, entityId: metaCode };
        }
      }

      return log;
    });
  }

  async log(data: {
    entityType: string;
    entityId: string;
    action: string;
    actorName: string;
    actorUserId?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditLogRow> {
    return this.repo.create({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorName: data.actorName,
      actorUserId: data.actorUserId ?? null,
      notes: data.notes ?? null,
      metadata: data.metadata ?? null,
    });
  }
}
