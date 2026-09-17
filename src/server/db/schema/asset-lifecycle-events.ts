import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

import { assets } from "./assets";

/**
 * Append-only accountability ledger for coded assets.
 *
 * Design rules:
 * - Rows are never updated or deleted by application code.
 * - Actor identity always comes from the authenticated session server-side
 *   (never trusted from the client request body).
 * - `assetCode` is denormalized so audit history survives asset deletion
 *   (`assetId` becomes null via ON DELETE SET NULL).
 * - Optional snapshot fields support status/holder transitions without
 *   ambiguous free-text-only logs.
 */
export const assetLifecycleEventTypeEnum = pgEnum("asset_lifecycle_event_type", [
  "created",
  "updated",
  "status_changed",
  "released",
  "returned",
  "flagged_maintenance",
  "deleted",
]);

export type AssetLifecycleEventPayload = Record<string, unknown>;

export const assetLifecycleEvents = pgTable(
  "asset_lifecycle_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),

    /** Null after hard-delete of asset; code retained for audit. */
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    assetCode: text("asset_code").notNull(),

    eventType: assetLifecycleEventTypeEnum("event_type").notNull(),

    /** Authenticated staff who performed the action (Supabase user id). */
    actorUserId: uuid("actor_user_id").notNull(),
    actorEmail: text("actor_email"),
    actorDisplayName: text("actor_display_name").notNull(),

    /** Status transition (when applicable). */
    fromStatus: text("from_status"),
    toStatus: text("to_status"),

    /** Holder / borrower transition (when applicable). */
    fromHolder: text("from_holder"),
    toHolder: text("to_holder"),

    /**
     * Structured details: field diffs, condition notes, request refs, etc.
     * Keep small and JSON-serializable; never store secrets.
     */
    payload: jsonb("payload").$type<AssetLifecycleEventPayload>().notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("asset_lifecycle_events_asset_id_created_at_idx").on(
      table.assetId,
      table.createdAt
    ),
    index("asset_lifecycle_events_asset_code_created_at_idx").on(
      table.assetCode,
      table.createdAt
    ),
    index("asset_lifecycle_events_actor_user_id_idx").on(table.actorUserId),
    index("asset_lifecycle_events_event_type_idx").on(table.eventType),
    index("asset_lifecycle_events_created_at_idx").on(table.createdAt),
  ]
);

export type AssetLifecycleEventRow = typeof assetLifecycleEvents.$inferSelect;
export type NewAssetLifecycleEventRow = typeof assetLifecycleEvents.$inferInsert;
