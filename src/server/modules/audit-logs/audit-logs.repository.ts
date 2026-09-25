import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import { auditLogs, type AuditLogRow, type NewAuditLogRow } from "@/server/db/schema/audit-logs";
import { CRITICAL_AUDIT_ACTIONS } from "./audit-events";
import type { ListAuditLogsQuery } from "./audit-logs.validation";

export class AuditLogRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async list(filters: ListAuditLogsQuery, session?: DbSession, tenantId?: string): Promise<AuditLogRow[]> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(auditLogs.tenantId, resolvedTenantId));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.criticalOnly) {
      conditions.push(
        inArray(auditLogs.action, Array.from(CRITICAL_AUDIT_ACTIONS))
      );
    }
    if (filters.from) {
      conditions.push(gte(auditLogs.timestamp, new Date(`${filters.from}T00:00:00`)));
    }
    if (filters.to) {
      conditions.push(lte(auditLogs.timestamp, new Date(`${filters.to}T23:59:59`)));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogs.actorName, q),
          ilike(auditLogs.action, q),
          ilike(auditLogs.entityType, q),
          ilike(auditLogs.entityId, q),
          ilike(sql`coalesce(${auditLogs.notes}, '')`, q)
        )!
      );
    }

    const limit = filters.limit ?? 200;
    const offset = filters.offset ?? 0;

    const base = db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    if (conditions.length === 0) {
      return base.limit(limit).offset(offset);
    }
    return base.where(and(...conditions)).limit(limit).offset(offset);
  }

  async create(data: NewAuditLogRow, session?: DbSession): Promise<AuditLogRow> {
    const db = this.db(session);
    const resolvedTenantId =
      data.tenantId ?? getTenantContext()?.tenantId;
    const insertPayload = resolvedTenantId
      ? { ...data, tenantId: resolvedTenantId }
      : data;

    const [row] = await db.insert(auditLogs).values(insertPayload).returning();
    if (!row) throw new Error("Failed to create audit log.");
    return row;
  }
}
