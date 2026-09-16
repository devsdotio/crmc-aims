import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { auditLogs, type AuditLogRow, type NewAuditLogRow } from "@/server/db/schema/audit-logs";
import type { ListAuditLogsQuery } from "./audit-logs.validation";

export class AuditLogRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async list(filters: ListAuditLogsQuery = {}, session?: DbSession): Promise<AuditLogRow[]> {
    const db = this.db(session);
    const conditions = [];

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
    const [row] = await db.insert(auditLogs).values(data).returning();
    if (!row) throw new Error("Failed to create audit log.");
    return row;
  }
}
