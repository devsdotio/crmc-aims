import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { profiles } from "./profiles";

/**
 * Institutional taxonomy rows.
 * - `asset_class`: general asset classification (e.g. "Computer Equipments")
 * - `asset`: specific asset category (e.g. "Monitors") — optional parent_id → asset_class
 * - `consumable`: consumable category (e.g. "Office Supplies")
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),

    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull().default("asset"),
    colorToken: text("color_token"),
    iconToken: text("icon_token"),
    /** Parent general class when type=asset (FK → categories.id of type asset_class). */
    parentId: uuid("parent_id"),

    createdByUserId: uuid("created_by_user_id").references(() => profiles.userId),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("categories_parent_id_idx").on(table.parentId)]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
