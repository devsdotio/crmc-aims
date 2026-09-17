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

import { assets } from "./assets";
import { suppliers } from "./suppliers";

/**
 * Voucher classification types:
 * - disbursement: Vendor payment or cash disbursement (linked to PO or manual)
 * - property_transfer: Property transfer voucher for asset turnover/assignment
 * - liquidation: Liquidation receipt / voucher
 */
export const voucherTypeEnum = pgEnum("voucher_type", [
  "disbursement",
  "property_transfer",
  "liquidation",
]);

/**
 * Voucher workflow statuses:
 * draft -> pending_approval -> approved -> completed (or cancelled)
 */
export const voucherStatusEnum = pgEnum("voucher_status", [
  "draft",
  "pending_approval",
  "approved",
  "completed",
  "cancelled",
]);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Unique code with hybrid format:
     * e.g. DRR2026-000428 (prefix 'DRR2026-' auto-generated from type & year, suffix '000428' manually entered)
     */
    voucherCode: text("voucher_code").notNull().unique(),
    type: voucherTypeEnum("type").notNull().default("disbursement"),
    status: voucherStatusEnum("status").notNull().default("draft"),

    /** Voucher date / issue date */
    voucherDate: date("voucher_date", { mode: "string" }).notNull(),

    /** Payee / Recipient / Beneficiary */
    payeeName: text("payee_name").notNull(),

    /** Financial amount (disbursement / liquidation) */
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0.00"),

    /** Supplier link (optional for non-vendor or manual legacy entries) */
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    supplierName: text("supplier_name"),

    /** Associated PO number if linked to or created from an existing Purchase Order */
    purchaseOrderNumber: text("purchase_order_number"),

    /** Associated Asset (for property transfer vouchers) */
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    assetCode: text("asset_code"),
    assetName: text("asset_name"),

    /** Narrative purpose / justification (paragraph) */
    purpose: text("purpose").notNull().default(""),

    /**
     * Itemized particulars as JSON:
     * [{ "description": "...", "amount": "123.45" }, ...]
     * Legacy plain-text values are still accepted and parsed on read.
     */
    particulars: text("particulars").notNull().default(""),

    /** Payment or accounting reference (e.g. check no., bank reference, or OR no.) */
    checkNumber: text("check_number"),

    /** Toggle for legacy unlinked vouchers */
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
    index("vouchers_code_idx").on(table.voucherCode),
    index("vouchers_type_idx").on(table.type),
    index("vouchers_status_idx").on(table.status),
    index("vouchers_supplier_id_idx").on(table.supplierId),
    index("vouchers_asset_id_idx").on(table.assetId),
    index("vouchers_po_number_idx").on(table.purchaseOrderNumber),
    index("vouchers_date_idx").on(table.voucherDate),
  ]
);

export type VoucherRow = typeof vouchers.$inferSelect;
export type NewVoucherRow = typeof vouchers.$inferInsert;
