import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { projects } from "./projects";

/**
 * Progress indicators and milestone checklist items for tracking project execution.
 */
export const projectProgressIndicators = pgTable(
  "project_progress_indicators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    targetDate: date("target_date", { mode: "string" }),
    completedDate: date("completed_date", { mode: "string" }),

    isCompleted: boolean("is_completed").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),

    completedByUserId: uuid("completed_by_user_id"),
    completedByName: text("completed_by_name"),

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
    index("project_progress_indicators_tenant_idx").on(table.tenantId),
    index("project_progress_indicators_project_idx").on(table.projectId),
    index("project_progress_indicators_is_completed_idx").on(table.isCompleted),
    index("project_progress_indicators_order_idx").on(table.orderIndex),
  ]
);

export type ProjectProgressIndicatorRow =
  typeof projectProgressIndicators.$inferSelect;
export type NewProjectProgressIndicatorRow =
  typeof projectProgressIndicators.$inferInsert;
