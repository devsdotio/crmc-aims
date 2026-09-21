import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),
    
    // The type of entity being audited (e.g., "borrow_transaction", "asset", "consumable", "maintenance_log")
    entityType: text("entity_type").notNull(),
    
    // The ID or Code of the entity being audited
    entityId: text("entity_id").notNull(),
    
    // The action performed (e.g., "created", "updated", "released", "returned", "flagged_repair")
    action: text("action").notNull(),
    
    // The name of the user who performed the action
    actorName: text("actor_name").notNull(),
    
    // The ID of the user who performed the action (optional for system automated actions)
    actorUserId: uuid("actor_user_id"),
    
    // When the action occurred
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    
    // Optional human-readable notes about the action
    notes: text("notes"),
    
    // Any extra structured data relevant to the action (e.g., old vs new values)
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_timestamp_idx").on(table.timestamp),
    index("audit_logs_actor_idx").on(table.actorUserId),
  ]
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
