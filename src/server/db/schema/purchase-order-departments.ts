import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { departments } from "./departments";

/**
 * Multi-department sponsorship for purchase orders (project and warehouse).
 * Keyed by PO number (`purchase_lots.reference`), not per line.
 * `purchase_lots.department_id` remains the primary (first selected) department.
 */
export const purchaseOrderDepartments = pgTable(
  "purchase_order_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001")
      .references(() => tenants.id),

    /** Shared PO number — matches `purchase_lots.reference`. */
    poReference: text("po_reference").notNull(),

    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("purchase_order_departments_tenant_po_dept_uidx").on(
      table.tenantId,
      table.poReference,
      table.departmentId
    ),
    index("purchase_order_departments_tenant_po_idx").on(
      table.tenantId,
      table.poReference
    ),
    index("purchase_order_departments_department_id_idx").on(table.departmentId),
  ]
);

export type PurchaseOrderDepartmentRow =
  typeof purchaseOrderDepartments.$inferSelect;
export type NewPurchaseOrderDepartmentRow =
  typeof purchaseOrderDepartments.$inferInsert;
