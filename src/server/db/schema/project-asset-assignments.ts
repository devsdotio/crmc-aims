import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { assets } from "./assets";
import { projects } from "./projects";

/**
 * Project custody for coded assets (no borrower account / borrow request).
 * Assigned = custody only (no project spend). Written off via Phase 5 damage report.
 */
export const projectAssetAssignmentStatusEnum = pgEnum(
  "project_asset_assignment_status",
  ["assigned", "returned", "written_off"]
);

export const projectAssetAssignments = pgTable(
  "project_asset_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),

    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),

    assetCode: text("asset_code").notNull(),
    assetName: text("asset_name").notNull(),

    status: projectAssetAssignmentStatusEnum("status")
      .notNull()
      .default("assigned"),

    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),

    assignedByUserId: uuid("assigned_by_user_id").notNull(),
    assignedByName: text("assigned_by_name").notNull(),
    returnedByUserId: uuid("returned_by_user_id"),
    returnedByName: text("returned_by_name"),

    notes: text("notes"),
    returnNotes: text("return_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_asset_assignments_project_id_idx").on(table.projectId),
    index("project_asset_assignments_asset_id_idx").on(table.assetId),
    index("project_asset_assignments_status_idx").on(table.status),
  ]
);

export type ProjectAssetAssignmentRow =
  typeof projectAssetAssignments.$inferSelect;
export type NewProjectAssetAssignmentRow =
  typeof projectAssetAssignments.$inferInsert;
