import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { consumables } from "./consumables";
import { departments } from "./departments";
import { projects } from "./projects";
import { purchaseLots } from "./purchase-lots";

export const consumableRequestSourceEnum = pgEnum("consumable_request_source", [
  "portal",
  "admin_manual",
]);

/**
 * Dedicated consumable issue queue (multi-line).
 * Stock is never deducted until release — admin chooses supplier lots per line.
 */
export const consumableRequestStatusEnum = pgEnum("consumable_request_status", [
  "pending",
  "approved",
  "rejected",
  "released",
  "cancelled",
]);

export type ConsumableRequestHistoryEntry = {
  id: string;
  action:
    | "submitted"
    | "approved"
    | "rejected"
    | "released"
    | "cancelled"
    | "approval_undone"
    | "edited";
  actor: string;
  timestamp: string;
  note?: string;
};

export const consumableRequests = pgTable(
  "consumable_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    requestCode: text("request_code").notNull(),

    requesterUserId: uuid("requester_user_id"),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    requesterPhone: text("requester_phone").notNull().default(""),
    department: text("department").notNull(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    source: consumableRequestSourceEnum("source").notNull().default("portal"),
    requestedByName: text("requested_by_name"),
    /** Shared with `requests.submission_group_id` for multi-type wizard submits. */
    submissionGroupId: uuid("submission_group_id"),

    purpose: text("purpose").notNull(),
    status: consumableRequestStatusEnum("status").notNull().default("pending"),

    notes: text("notes"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    /** Person who physically received the issued supplies. */
    receivedBy: text("received_by"),

    history: jsonb("history")
      .$type<ConsumableRequestHistoryEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id"),
    approvedByName: text("approved_by_name"),

    releasedAt: timestamp("released_at", { withTimezone: true }),
    releasedByUserId: uuid("released_by_user_id"),
    releasedByName: text("released_by_name"),

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
    index("consumable_requests_status_idx").on(table.status),
    index("consumable_requests_department_idx").on(table.department),
    index("consumable_requests_department_id_idx").on(table.departmentId),
    index("consumable_requests_project_id_idx").on(table.projectId),
    index("consumable_requests_submission_group_id_idx").on(table.submissionGroupId),
    index("consumable_requests_requested_at_idx").on(table.requestedAt),
    index("consumable_requests_requester_user_id_idx").on(table.requesterUserId),
    index("consumable_requests_status_user_idx").on(table.status, table.requesterUserId),
  ]
);

export const consumableRequestLines = pgTable(
  "consumable_request_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => consumableRequests.id, { onDelete: "cascade" }),

    lineNo: integer("line_no").notNull(),

    consumableId: uuid("consumable_id")
      .notNull()
      .references(() => consumables.id, { onDelete: "restrict" }),

    /** Snapshots so the request stays readable if the item is renamed later. */
    itemCode: text("item_code").notNull(),
    itemName: text("item_name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull(),

    quantityRequested: integer("quantity_requested").notNull(),
    /** Purpose / justification for this line (supports multi-purpose requests). */
    purpose: text("purpose").notNull().default("General"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("consumable_request_lines_request_id_idx").on(table.requestId),
    index("consumable_request_lines_consumable_id_idx").on(table.consumableId),
    index("consumable_request_lines_purpose_idx").on(table.purpose),
  ]
);

/**
 * Frozen cost lines written at release time (accountability + department expense).
 */
export const consumableRequestReleaseAllocations = pgTable(
  "consumable_request_release_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => consumableRequests.id, { onDelete: "cascade" }),
    requestLineId: uuid("request_line_id")
      .notNull()
      .references(() => consumableRequestLines.id, { onDelete: "cascade" }),
    consumableId: uuid("consumable_id")
      .notNull()
      .references(() => consumables.id, { onDelete: "restrict" }),

    purchaseLotId: uuid("purchase_lot_id").references(() => purchaseLots.id, {
      onDelete: "set null",
    }),
    lotCode: text("lot_code"),
    supplierId: uuid("supplier_id"),
    supplierName: text("supplier_name"),

    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),

    releasedAt: timestamp("released_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedByUserId: uuid("released_by_user_id").notNull(),
    releasedByName: text("released_by_name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("consumable_release_alloc_request_id_idx").on(table.requestId),
    index("consumable_release_alloc_line_id_idx").on(table.requestLineId),
    index("consumable_release_alloc_consumable_id_idx").on(table.consumableId),
    index("consumable_release_alloc_lot_id_idx").on(table.purchaseLotId),
  ]
);

export type ConsumableRequestRow = typeof consumableRequests.$inferSelect;
export type NewConsumableRequestRow = typeof consumableRequests.$inferInsert;
export type ConsumableRequestLineRow = typeof consumableRequestLines.$inferSelect;
export type NewConsumableRequestLineRow =
  typeof consumableRequestLines.$inferInsert;
export type ConsumableRequestReleaseAllocationRow =
  typeof consumableRequestReleaseAllocations.$inferSelect;
export type NewConsumableRequestReleaseAllocationRow =
  typeof consumableRequestReleaseAllocations.$inferInsert;
