import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import { auditLogs, type AuditLogRow, type NewAuditLogRow } from "@/server/db/schema/audit-logs";
import type { ListAuditLogsQuery } from "./audit-logs.validation";

export class AuditLogRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async list(filters: ListAuditLogsQuery = {}, session?: DbSession, tenantId?: string): Promise<AuditLogRow[]> {
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

    const base = db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));

    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
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
