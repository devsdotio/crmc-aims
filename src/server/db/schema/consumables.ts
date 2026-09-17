import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Legacy enum type; column storage is text after 0013. */
export const consumableCategoryEnum = pgEnum("consumable_category", [
  "paper",
  "ink_toner",
  "cleaning",
  "office_supplies",
  "medical",
]);

export const stockActionTypeEnum = pgEnum("stock_action_type", [
  "restock",
  "adjustment",
  "checkout",
]);

export type StockHistoryEntry = {
  id: string;
  date: string;
  type: "restock" | "adjustment" | "checkout";
  quantityChange: number;
  actor: string;
  reason?: string;
  notes?: string;
  /** Present on cost-tracked restocks and lot-aware checkouts. */
  unitCost?: string;
  supplierId?: string;
  supplierName?: string;
  lotCode?: string;
  /** Frozen total for this release line (qty × unitCost at scan time). */
  totalCost?: string;
  /** Multi-lot FIFO allocations when checkout spans lots. */
  lotAllocations?: Array<{
    lotId: string | null;
    lotCode: string | null;
    quantity: number;
    unitCost: string;
    total: string;
    supplierId?: string | null;
    supplierName?: string | null;
    uncosted?: boolean;
  }>;
  recipientName?: string;
};

export const consumables = pgTable(
  "consumables",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    itemCode: text("item_code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    /** Broad class: Consumable Supplies (`supply`) vs Consumable Materials (`material`). */
    classification: text("classification").notNull().default("supply"),
    unit: text("unit").notNull(),
    currentQty: integer("current_qty").notNull().default(0),
    /** Qty promised to approved supply requests that have not been issued yet. */
    reservedQty: integer("reserved_qty").notNull().default(0),
    minThreshold: integer("min_threshold").notNull().default(0),
    location: text("location").notNull(),
    supplier: text("supplier"),
    lastRestocked: timestamp("last_restocked", { withTimezone: true }),
    notes: text("notes"),
    /** Testing-only row; hidden from non-superadmin lists unless opted in. */
    isSandbox: boolean("is_sandbox").notNull().default(false),

    /** Legacy JSON trail. Stock events go to stock_movements; this stays empty. */
    history: jsonb("history")
      .$type<StockHistoryEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("consumables_category_idx").on(table.category),
    index("consumables_classification_idx").on(table.classification),
    index("consumables_location_idx").on(table.location),
    index("consumables_current_qty_idx").on(table.currentQty),
    index("consumables_is_sandbox_idx").on(table.isSandbox),
  ]
);

export type ConsumableRow = typeof consumables.$inferSelect;
export type NewConsumableRow = typeof consumables.$inferInsert;
