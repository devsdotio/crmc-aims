import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import type { MaintenanceLogEntry } from "@/types/assets";

/**
 * Legacy enum retained for drizzle history only.
 * Runtime category values live in `categories` (type=asset) and store as text on assets.
 */
export const assetCategoryEnum = pgEnum("asset_category", [
  "transport",
  "computing",
  "av",
  "furniture",
]);

export const assetAssignmentTypeEnum = pgEnum("asset_assignment_type", [
  "borrowable",
  "assignable",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "active",
  "needs_repair",
  "out_of_service",
  "retired",
  "missing",
]);

/**
 * Coded capital equipment registry — one row per physical asset
 * (the QR-tagged unit the custodian manages).
 *
 * Multiple units of the same product share an optional `modelId`
 * (e.g. 30 × Epson 310 Printer). Each unit still has a unique asset_code / QR.
 *
 * Custody: `currentHolder` + `borrow_transactions` (borrowable) or
 * project assignments (assignable). Lifecycle audit → `asset_lifecycle_events`.
 * Acquisition cost history → `purchase_lots`.
 */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),

    assetCode: text("asset_code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    status: assetStatusEnum("status").notNull().default("active"),
    assignmentType: assetAssignmentTypeEnum("assignment_type").notNull().default("borrowable"),

    /**
     * Optional catalog parent (`asset_models`). Null for one-off units
     * that were registered without a bulk model.
     */
    modelId: uuid("model_id"),

    serialNumber: text("serial_number"),
    location: text("location").notNull(),
    currentHolder: text("current_holder"),
    /**
     * Set when a borrow/assign request is approved and waiting to be issued.
     * Cleared on release (holder takes over) or unrelease.
     */
    reservedForRequestId: uuid("reserved_for_request_id"),
    department: text("department"),
    purchaseDate: date("purchase_date", { mode: "string" }),
    value: numeric("value", { precision: 14, scale: 2 }),
    supplierId: uuid("supplier_id"),
    imageUrl: text("image_url"),
    notes: text("notes"),
    /** Testing-only row; hidden from non-superadmin lists unless opted in. */
    isSandbox: boolean("is_sandbox").notNull().default(false),

    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),

    maintenanceHistory: jsonb("maintenance_history")
      .$type<MaintenanceLogEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("assets_tenant_code_idx").on(table.tenantId, table.assetCode),
    index("assets_status_idx").on(table.status),
    index("assets_category_idx").on(table.category),
    index("assets_location_idx").on(table.location),
    index("assets_supplier_id_idx").on(table.supplierId),
    index("assets_model_id_idx").on(table.modelId),
    index("assets_reserved_for_request_id_idx").on(table.reservedForRequestId),
    index("assets_is_sandbox_idx").on(table.isSandbox),
  ]
);

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;
