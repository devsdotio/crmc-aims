import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
