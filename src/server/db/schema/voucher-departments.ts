import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { departments } from "./departments";
import { vouchers } from "./vouchers";

/**
 * Extra charging departments on a voucher.
 * Primary remains `vouchers.department_id` (first selected / inherited from PO).
 */
export const voucherDepartments = pgTable(
  "voucher_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),
    voucherId: uuid("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("voucher_departments_tenant_voucher_dept_uidx").on(
      table.tenantId,
      table.voucherId,
      table.departmentId
    ),
    index("voucher_departments_tenant_voucher_idx").on(
      table.tenantId,
      table.voucherId
    ),
    index("voucher_departments_department_id_idx").on(table.departmentId),
  ]
);

export type VoucherDepartmentRow = typeof voucherDepartments.$inferSelect;
export type NewVoucherDepartmentRow = typeof voucherDepartments.$inferInsert;
