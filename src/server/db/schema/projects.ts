import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

/**
 * Custodian-managed work units (renovation, construction, etc.).
 * Materials/expenses and asset assignments land in later tables —
 * this registry is intentional Phase 1 foundation.
 *
 * Completed projects are treated as read-only at the service layer.
 */
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    projectCode: text("project_code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),

    location: text("location"),
    department: text("department"),

    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),

    /** Optional ceiling in PHP (peso), 2 decimal places. */
    budget: numeric("budget", { precision: 14, scale: 2 }),

    notes: text("notes"),

    createdByUserId: uuid("created_by_user_id").notNull(),
    createdByName: text("created_by_name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("projects_tenant_project_code_idx").on(table.tenantId, table.projectCode),
    index("projects_status_idx").on(table.status),
    index("projects_start_date_idx").on(table.startDate),
  ]
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
