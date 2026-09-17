import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { consumables } from "./consumables";
import { consumableRequests } from "./consumable-requests";
import { departments } from "./departments";
import { projects } from "./projects";
import { purchaseLots } from "./purchase-lots";

export const stockMovementDirectionEnum = pgEnum("stock_movement_direction", [
  "in",
  "out",
]);

export const stockMovementReasonEnum = pgEnum("stock_movement_reason", [
  "restock",
  "issue",
  "adjust",
]);

/**
 * Operational stock ledger for consumables.
 * One row per lot allocation (or one uncosted correction line).
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),
    movementCode: text("movement_code").notNull(),

    consumableId: uuid("consumable_id")
      .notNull()
      .references(() => consumables.id, { onDelete: "restrict" }),

    qty: integer("qty").notNull(),
    direction: stockMovementDirectionEnum("direction").notNull(),
    reason: stockMovementReasonEnum("reason").notNull(),

    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),

    purchaseLotId: uuid("purchase_lot_id").references(() => purchaseLots.id, {
      onDelete: "set null",
    }),
    lotCode: text("lot_code"),
    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }),

    requestId: uuid("request_id").references(() => consumableRequests.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),

    actorUserId: uuid("actor_user_id").notNull(),
    actorName: text("actor_name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("stock_movements_consumable_id_idx").on(table.consumableId),
    index("stock_movements_created_at_idx").on(table.createdAt),
    index("stock_movements_request_id_idx").on(table.requestId),
    index("stock_movements_department_id_idx").on(table.departmentId),
    index("stock_movements_project_id_idx").on(table.projectId),
  ]
);

export type StockMovementRow = typeof stockMovements.$inferSelect;
export type NewStockMovementRow = typeof stockMovements.$inferInsert;
