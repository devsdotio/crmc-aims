import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { assets } from "./assets";
import { borrowRequests } from "./borrow-requests";
import { departments } from "./departments";
import { projects } from "./projects";

/**
 * Borrow & return custody ledger (the operational "log").
 * Stored status is active | returned; "overdue" is derived in DTOs when due.
 * Unified custody: borrow (due-dated) or assignment (open-ended) to department XOR project.
 */
export const custodyKindEnum = pgEnum("custody_kind", ["borrow", "assignment"]);

export const custodySourceEnum = pgEnum("custody_source", [
  "portal",
  "admin_manual",
  "project_legacy",
]);
export const borrowTransactionStatusEnum = pgEnum("borrow_transaction_status", [
  "active",
  "returned",
  "voided",
]);

export const returnConditionEnum = pgEnum("return_condition", [
  "good",
  "damaged",
  "needs_repair",
  "lost",
  "stolen",
]);

export const borrowTransactions = pgTable(
  "borrow_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    logCode: text("log_code").notNull(),

    requestId: uuid("request_id").references(() => borrowRequests.id, {
      onDelete: "set null",
    }),
    requestCode: text("request_code"),

    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    assetCode: text("asset_code").notNull(),
    assetName: text("asset_name").notNull(),
    category: text("category").notNull(),

    borrowerUserId: uuid("borrower_user_id"),
    borrowerName: text("borrower_name").notNull(),
    borrowerEmail: text("borrower_email").notNull().default(""),
    borrowerPhone: text("borrower_phone").notNull().default(""),
    department: text("department").notNull(),

    /** Unified custody destination — exactly one should be set for new releases. */
    custodyKind: custodyKindEnum("custody_kind").notNull().default("borrow"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    source: custodySourceEnum("source").notNull().default("portal"),
    requestedByName: text("requested_by_name"),

    releasedAt: timestamp("released_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dueDate: date("due_date", { mode: "string" }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),

    status: borrowTransactionStatusEnum("status").notNull().default("active"),

    conditionOnReturn: returnConditionEnum("condition_on_return"),
    conditionNotes: text("condition_notes"),

    releasedByUserId: uuid("released_by_user_id").notNull(),
    releasedByName: text("released_by_name").notNull(),
    receivedByUserId: uuid("received_by_user_id"),
    receivedByName: text("received_by_name"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("borrow_transactions_status_idx").on(table.status),
    index("borrow_transactions_due_date_idx").on(table.dueDate),
    index("borrow_transactions_asset_id_idx").on(table.assetId),
    index("borrow_transactions_released_at_idx").on(table.releasedAt),
    index("borrow_transactions_department_idx").on(table.department),
    index("borrow_transactions_department_id_idx").on(table.departmentId),
    index("borrow_transactions_project_id_idx").on(table.projectId),
  ]
);

export type BorrowTransactionRow = typeof borrowTransactions.$inferSelect;
export type NewBorrowTransactionRow = typeof borrowTransactions.$inferInsert;
