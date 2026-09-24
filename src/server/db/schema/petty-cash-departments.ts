import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { departments } from "./departments";
import { pettyCashVouchers } from "./petty-cash";

/**
 * Extra charging departments on a petty-cash voucher.
 * Primary remains `petty_cash_vouchers.department_id`.
 */
export const pettyCashDepartments = pgTable(
  "petty_cash_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),
    pettyCashId: uuid("petty_cash_id")
      .notNull()
      .references(() => pettyCashVouchers.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("petty_cash_departments_tenant_pc_dept_uidx").on(
      table.tenantId,
      table.pettyCashId,
      table.departmentId
    ),
    index("petty_cash_departments_tenant_pc_idx").on(
      table.tenantId,
      table.pettyCashId
    ),
    index("petty_cash_departments_department_id_idx").on(table.departmentId),
  ]
);

export type PettyCashDepartmentRow = typeof pettyCashDepartments.$inferSelect;
export type NewPettyCashDepartmentRow = typeof pettyCashDepartments.$inferInsert;
