import {
  date,
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

import { assets } from "./assets";
import { consumables } from "./consumables";
import { departments } from "./departments";
import { projects } from "./projects";
import { suppliers } from "./suppliers";

/**
 * Immutable-ish purchase receipt for inventory flow and multi-supplier pricing.
 * Each restock (or asset acquisition) appends a lot with its own unit cost.
 * `quantityRemaining` supports FIFO costing when project consumables ship later.
 */
export const purchaseLotItemTypeEnum = pgEnum("purchase_lot_item_type", [
  "consumable",
  "asset",
]);

export const purchaseLots = pgTable(
  "purchase_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    lotCode: text("lot_code").notNull(),
    itemType: purchaseLotItemTypeEnum("item_type").notNull(),

    consumableId: uuid("consumable_id").references(() => consumables.id, {
      onDelete: "set null",
    }),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    /** Snapshot labels keep receipt readable if the row is unlinked later. */
    itemCode: text("item_code").notNull(),
    itemName: text("item_name").notNull(),

    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    supplierName: text("supplier_name"),

    /** Requesting / target department for this PO line */
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    departmentName: text("department_name"),

    /** Target project when procured for a project work unit */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    projectName: text("project_name"),

    /** Original received quantity (assets = 1). */
    quantity: integer("quantity").notNull(),
    /** Remaining quantity for FIFO (assets typically 1 until written off). */
    quantityRemaining: integer("quantity_remaining").notNull(),

    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
    totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),

    purchasedOn: date("purchased_on", { mode: "string" }).notNull(),
    reference: text("reference"),
    notes: text("notes"),
    receiptUrl: text("receipt_url"),

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
    index("purchase_lots_item_type_idx").on(table.itemType),
    index("purchase_lots_consumable_id_idx").on(table.consumableId),
    index("purchase_lots_asset_id_idx").on(table.assetId),
    index("purchase_lots_supplier_id_idx").on(table.supplierId),
    index("purchase_lots_department_id_idx").on(table.departmentId),
    index("purchase_lots_project_id_idx").on(table.projectId),
    index("purchase_lots_purchased_on_idx").on(table.purchasedOn),
  ]
);

export type PurchaseLotRow = typeof purchaseLots.$inferSelect;
export type NewPurchaseLotRow = typeof purchaseLots.$inferInsert;
