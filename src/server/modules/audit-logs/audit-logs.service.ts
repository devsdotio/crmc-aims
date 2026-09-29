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
import { and, eq, inArray } from "drizzle-orm";
import { compactAuditMetadata, type AuditActionType, type AuditEntityType } from "./audit-events";
import type { DbSession } from "@/server/db/transaction";

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

    const logs = await this.repo.list(filters, undefined, actor.tenantId);

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

    const tenantCondition = (col: unknown) =>
      actor.tenantId ? [eq(col as typeof borrowRequests.tenantId, actor.tenantId)] : [];

    const validBorrowUuids = borrowRequestIds.filter(isUuid);
    const validConsumableReqUuids = consumableRequestIds.filter(isUuid);
    const validAssetUuids = assetIds.filter(isUuid);
    const validConsumableUuids = consumableIds.filter(isUuid);
    const validLotUuids = lotIds.filter(isUuid);
    const validMaintenanceUuids = maintenanceIds.filter(isUuid);
    const validUserUuids = userIds.filter(isUuid);

    await Promise.all([
      validBorrowUuids.length > 0
        ? db
            .select({ id: borrowRequests.id, code: borrowRequests.requestCode })
            .from(borrowRequests)
            .where(
              and(
                inArray(borrowRequests.id, validBorrowUuids),
                ...tenantCondition(borrowRequests.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validConsumableReqUuids.length > 0
        ? db
            .select({
              id: consumableRequests.id,
              code: consumableRequests.requestCode,
            })
            .from(consumableRequests)
            .where(
              and(
                inArray(consumableRequests.id, validConsumableReqUuids),
                ...tenantCondition(consumableRequests.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validAssetUuids.length > 0
        ? db
            .select({ id: assets.id, code: assets.assetCode })
            .from(assets)
            .where(
              and(
                inArray(assets.id, validAssetUuids),
                ...tenantCondition(assets.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validConsumableUuids.length > 0
        ? db
            .select({ id: consumables.id, code: consumables.itemCode })
            .from(consumables)
            .where(
              and(
                inArray(consumables.id, validConsumableUuids),
                ...tenantCondition(consumables.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validLotUuids.length > 0
        ? db
            .select({ id: purchaseLots.id, code: purchaseLots.lotCode })
            .from(purchaseLots)
            .where(
              and(
                inArray(purchaseLots.id, validLotUuids),
                ...tenantCondition(purchaseLots.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validMaintenanceUuids.length > 0
        ? db
            .select({ id: maintenanceLogs.id, code: maintenanceLogs.logCode })
            .from(maintenanceLogs)
            .where(
              and(
                inArray(maintenanceLogs.id, validMaintenanceUuids),
                ...tenantCondition(maintenanceLogs.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code);
            })
        : Promise.resolve(),
      validUserUuids.length > 0
        ? db
            .select({
              id: profiles.userId,
              code: profiles.email,
              name: profiles.fullName,
            })
            .from(profiles)
            .where(
              and(
                inArray(profiles.userId, validUserUuids),
                ...tenantCondition(profiles.tenantId)
              )
            )
            .then((rows) => {
              for (const r of rows) codeMap.set(r.id, r.code || r.name || r.id);
            })
        : Promise.resolve(),
    ]);

    return logs.map(log => {
      let entityCode: string | undefined;

      // 1. If resolved in DB codeMap
      if (codeMap.has(log.entityId)) {
        entityCode = codeMap.get(log.entityId);
      } else {
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
          if (metaCode) entityCode = metaCode;
        }
      }

      // Keep entityId as stored (UUID/code) so filters/timeline keep working;
      // expose a display code via metadata.entityCode for the UI.
      if (!entityCode || entityCode === log.entityId) return log;
      const meta =
        log.metadata && typeof log.metadata === "object"
          ? (log.metadata as Record<string, unknown>)
          : {};
      return {
        ...log,
        metadata: { ...meta, entityCode },
      };
    });
  }

  async log(data: {
    entityType: AuditEntityType | string;
    entityId: string;
    action: AuditActionType | string;
    actorName: string;
    actorUserId?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    tenantId?: string | null;
  }, session?: DbSession): Promise<AuditLogRow> {
    return this.repo.create({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorName: data.actorName,
      actorUserId: data.actorUserId ?? null,
      notes: data.notes ?? null,
      metadata: compactAuditMetadata(data.metadata),
      tenantId: data.tenantId ?? undefined,
    }, session);
  }
}
