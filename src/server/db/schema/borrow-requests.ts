import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
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
import { departments } from "./departments";

/**
 * Staff-facing borrow request queue (approve / reject).
 * Actual custody transfer lives on borrow_transactions + assets.current_holder.
 */
export const assetRequestTypeEnum = pgEnum("asset_request_type", [
  "borrowable",
  "assignable",
]);

export const borrowRequestStatusEnum = pgEnum("borrow_request_status", [
  "pending",
  "approved",
  "rejected",
  "released",
  "unreleased",
  "returned",
  "cancelled",
]);

export type BorrowRequestHistoryEntry = {
  id: string;
  action:
    | "submitted"
    | "approved"
    | "rejected"
    | "released"
    | "unreleased"
    | "returned"
    | "cancelled"
    | "approval_undone"
    | "edited";
  actor: string;
  timestamp: string;
  note?: string;
};

export const borrowRequests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    requestCode: text("request_code").notNull(),

    /** Linked borrower profile when known (auth user id). */
    requesterUserId: uuid("requester_user_id"),

    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    requesterPhone: text("requester_phone").notNull().default(""),
    department: text("department").notNull(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),

    /** borrowable = due-dated loan; assignable = open-ended department assignment. */
    requestType: assetRequestTypeEnum("request_type"),
    requestedByName: text("requested_by_name"),

    items: jsonb("items")
      .$type<{
        itemDescription: string;
        assetId?: string;
        assetCode?: string;
        consumableId?: string;
        category: string;
        quantity: number;
        itemType: "asset" | "consumable";
        unit?: string;
      }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    purpose: text("purpose").notNull(),

    expectedReturnDate: date("expected_return_date", { mode: "string" }),
    status: borrowRequestStatusEnum("status").notNull().default("pending"),

    notes: text("notes"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    pickedUpBy: text("picked_up_by"),

    history: jsonb("history")
      .$type<BorrowRequestHistoryEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("requests_status_idx").on(table.status),
    index("requests_department_idx").on(table.department),
    index("requests_department_id_idx").on(table.departmentId),
    index("requests_request_type_idx").on(table.requestType),
    index("requests_requested_at_idx").on(table.requestedAt),
    index("requests_status_user_idx").on(table.status, table.requesterUserId),
  ]
);

export type BorrowRequestRow = typeof borrowRequests.$inferSelect;
export type NewBorrowRequestRow = typeof borrowRequests.$inferInsert;
