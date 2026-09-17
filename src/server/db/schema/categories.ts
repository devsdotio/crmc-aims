import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { profiles } from "./profiles";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("asset"),
  colorToken: text("color_token"),

  createdByUserId: uuid("created_by_user_id").references(() => profiles.userId),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
