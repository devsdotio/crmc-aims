import {
  boolean,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { departments } from "./departments";
import { suppliers } from "./suppliers";

/**
 * Petty Cash Voucher workflow statuses:
 * draft -> pending_approval -> approved -> completed (disbursed) (or cancelled)
 */
export const pettyCashStatusEnum = pgEnum("petty_cash_status", [
  "draft",
  "pending_approval",
  "approved",
  "completed",
  "cancelled",
]);

export const pettyCashVouchers = pgTable(
  "petty_cash_vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Unique code with hybrid format:
     * e.g. PCV2026-000001 (prefix 'PCV2026-' auto-generated from year, suffix '000001' sequential or custom)
     */
    pcvNumber: text("pcv_number").notNull().unique(),
    status: pettyCashStatusEnum("status").notNull().default("draft"),

    /** Petty Cash Voucher date / issue date */
    voucherDate: date("voucher_date", { mode: "string" }).notNull(),

    /** Payee / Recipient / Claimant */
    payeeName: text("payee_name").notNull(),

    /** Disbursement amount */
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0.00"),

    /**
     * Expense category / classification:
     * e.g. supplies, transportation, meals, repairs, courier, emergency, miscellaneous
     */
    category: text("category").notNull().default("supplies"),

    /** Narrative purpose / justification (paragraph) */
    purpose: text("purpose").notNull().default(""),

    /**
     * Itemized particulars as JSON:
     * [{ "description": "...", "amount": "123.45" }, ...]
     * Legacy plain-text values are still accepted and parsed on read.
     */
    particulars: text("particulars").notNull().default(""),

    /** Receipt or accounting slip reference (e.g. OR #, Sales Invoice #, Trip Ticket #, Cash Slip #) */
    receiptNumber: text("receipt_number"),

    /** Supplier link (optional for non-vendor or manual entries) */
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    supplierName: text("supplier_name"),

    /** Associated PO number if linked to or created from an existing Purchase Order */
    purchaseOrderNumber: text("purchase_order_number"),

    /** Optional department attribution */
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    departmentName: text("department_name"),

    /** Toggle for legacy / unlinked micro-disbursements */
    isLegacy: boolean("is_legacy").notNull().default(false),

    /** Workflow & Audit */
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdByName: text("created_by_name").notNull(),

    approvedByUserId: uuid("approved_by_user_id"),
    approvedByName: text("approved_by_name"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    completedByUserId: uuid("completed_by_user_id"),
    completedByName: text("completed_by_name"),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("petty_cash_pcv_number_idx").on(table.pcvNumber),
    index("petty_cash_status_idx").on(table.status),
    index("petty_cash_category_idx").on(table.category),
    index("petty_cash_date_idx").on(table.voucherDate),
    index("petty_cash_department_id_idx").on(table.departmentId),
    index("petty_cash_po_number_idx").on(table.purchaseOrderNumber),
    index("petty_cash_supplier_id_idx").on(table.supplierId),
  ]
);

export type PettyCashRow = typeof pettyCashVouchers.$inferSelect;
export type NewPettyCashRow = typeof pettyCashVouchers.$inferInsert;
