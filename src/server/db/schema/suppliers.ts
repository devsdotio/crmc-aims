import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

/**
 * Vendor registry — same supplier can quote different unit prices over time.
 * Price history lives on `purchase_lots`, not a single field on the item.
 */
export const supplierStatusEnum = pgEnum("supplier_status", [
  "active",
  "inactive",
]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    supplierCode: text("supplier_code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    notes: text("notes"),
    status: supplierStatusEnum("status").notNull().default("active"),

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
    index("suppliers_status_idx").on(table.status),
    index("suppliers_name_idx").on(table.name),
  ]
);

export type SupplierRow = typeof suppliers.$inferSelect;
export type NewSupplierRow = typeof suppliers.$inferInsert;
