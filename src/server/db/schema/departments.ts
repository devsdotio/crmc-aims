import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    code: text("code").notNull(),
    name: text("name").notNull(),
    /** Testing-only row; hidden from non-superadmin lists unless opted in. */
    isSandbox: boolean("is_sandbox").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("departments_tenant_code_idx").on(table.tenantId, table.code),
    index("departments_is_sandbox_idx").on(table.isSandbox),
  ]
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
