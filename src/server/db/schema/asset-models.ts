import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { assetAssignmentTypeEnum } from "./assets";

/**
 * Catalog entry for multi-unit capital equipment.
 *
 * Example: model "Epson 310 Printer" → 30 physical rows in `assets`,
 * each with its own `asset_code` / QR for individual custody tracking.
 *
 * Models do not themselves get QR tags — only units (assets) do.
 */
export const assetModels = pgTable(
  "asset_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    /** Stable short code, e.g. PRT-EPSON-310 */
    modelCode: text("model_code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    manufacturer: text("manufacturer"),

    defaultAssignmentType: assetAssignmentTypeEnum("default_assignment_type")
      .notNull()
      .default("borrowable"),
    defaultLocation: text("default_location"),
    defaultUnitValue: numeric("default_unit_value", {
      precision: 14,
      scale: 2,
    }),
    imageUrl: text("image_url"),
    notes: text("notes"),
    /** Testing-only row; hidden from non-superadmin lists unless opted in. */
    isSandbox: boolean("is_sandbox").notNull().default(false),

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
    index("asset_models_category_idx").on(table.category),
    index("asset_models_name_idx").on(table.name),
    index("asset_models_is_sandbox_idx").on(table.isSandbox),
  ]
);

export type AssetModelRow = typeof assetModels.$inferSelect;
export type NewAssetModelRow = typeof assetModels.$inferInsert;
