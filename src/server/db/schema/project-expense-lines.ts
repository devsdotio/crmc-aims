import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { projects } from "./projects";

/**
 * Project spend ledger:
 * - Phase 2: miscellaneous + adjustment
 * - Phase 3: consumable (auto stock checkout + FIFO lot cost)
 * - Phase 5: asset_writeoff (broken/lost on project)
 *
 * Signed `amount`: positive = spend, negative = credit/refund (adjustments).
 */
export const projectExpenseLineTypeEnum = pgEnum("project_expense_line_type", [
  "miscellaneous",
  "adjustment",
  "consumable",
  "material",
  "asset_writeoff",
]);

export const projectExpenseCategoryEnum = pgEnum("project_expense_category", [
  "travel",
  "snacks",
  "labor",
  "broken_asset",
  "fees",
  "adjustment",
  "miscellaneous",
  "other",
]);

/** FIFO lot draws for consumable expense lines — used to reverse stock. */
export type ProjectExpenseLotAllocation = {
  lotId: string | null;
  lotCode?: string | null;
  quantity: number;
  unitCost: string;
  total: string;
  uncosted?: boolean;
};

export type ProjectExpenseMetadata = {
  lotAllocations?: ProjectExpenseLotAllocation[];
  consumableCode?: string;
  consumableName?: string;
  consumableUnit?: string;
  /** Custom label when category is `other`. */
  customCategory?: string;
  /** Links a project charge to the originating stock issue movement. */
  stockMovementId?: string;
  /** All MOV ids when an issue splits across lots (FIFO). */
  stockMovementIds?: string[];
  /** Phase 5 write-off linkage */
  assignmentId?: string;
  assetCode?: string;
  assetName?: string;
  maintenanceLogCode?: string;
  writeOffDisposition?: "out_of_service" | "retired";
};

export const projectExpenseLines = pgTable(
  "project_expense_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    lineType: projectExpenseLineTypeEnum("line_type")
      .notNull()
      .default("miscellaneous"),
    category: projectExpenseCategoryEnum("category")
      .notNull()
      .default("miscellaneous"),

    description: text("description").notNull(),
    /** PHP, 2 decimals — may be negative for credit/adjustment. */
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),

    quantity: numeric("quantity", { precision: 12, scale: 2 }),
    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),

    consumableId: uuid("consumable_id"),
    assetId: uuid("asset_id"),

    incurredOn: date("incurred_on", { mode: "string" }).notNull(),
    notes: text("notes"),

    metadata: jsonb("metadata")
      .$type<ProjectExpenseMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    recordedByName: text("recorded_by_name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_expense_lines_project_id_idx").on(table.projectId),
    index("project_expense_lines_incurred_on_idx").on(table.incurredOn),
    index("project_expense_lines_category_idx").on(table.category),
    index("project_expense_lines_consumable_id_idx").on(table.consumableId),
  ]
);

export type ProjectExpenseLineRow = typeof projectExpenseLines.$inferSelect;
export type NewProjectExpenseLineRow = typeof projectExpenseLines.$inferInsert;
