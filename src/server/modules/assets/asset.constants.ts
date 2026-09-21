/**
 * Single source of truth for asset enums on the app side.
 * Must match `src/server/db/schema/assets.ts`.
 * Category UI/admin free text can be mapped via `src/lib/asset-category.ts`.
 */

export const ASSET_CATEGORIES = [
  "transport",
  "computing",
  "av",
  "furniture",
] as const;

export const ASSET_STATUSES = [
  "active",
  "needs_repair",
  "out_of_service",
  "retired",
  "missing",
] as const;

export const ASSET_ASSIGNMENT_TYPES = [
  "borrowable",
  "assignable",
] as const;

export const MAINTENANCE_TYPES = [
  "inspection",
  "repair",
  "maintenance",
  "flagged",
] as const;

/**
 * Lifecycle ledger event types (append-only audit trail).
 * Must match `asset_lifecycle_event_type` in schema.
 */
export const ASSET_LIFECYCLE_EVENT_TYPES = [
  "created",
  "updated",
  "status_changed",
  "released",
  "returned",
  "flagged_maintenance",
  "deleted",
] as const;

/** Placeholder holder label used when release omits a borrower name. */
export const CHECKED_OUT_PLACEHOLDER = "Checked Out";
