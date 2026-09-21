import type {
  AssetLifecycleEventPayload,
  AssetRow,
} from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";

import { ASSET_LIFECYCLE_EVENT_TYPES } from "./asset.constants";

export type AssetLifecycleEventType = (typeof ASSET_LIFECYCLE_EVENT_TYPES)[number];

export interface AssetFieldChange<T = unknown> {
  from: T;
  to: T;
}

export type AssetChangesMap = Record<string, AssetFieldChange>;

export interface AssetUpdatePayload {
  changes?: AssetChangesMap;
  [key: string]: unknown;
}

export interface AssetReleasePayload {
  requestId?: string;
  expectedReturnDate?: string;
  borrowerDepartment?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface AssetReturnPayload {
  condition?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface AssetFlagMaintenancePayload {
  description?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface AssetStatusChangePayload {
  via?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface AssetDeletePayload {
  snapshot?: Record<string, unknown>;
  [key: string]: unknown;
}

export type AssetLifecycleEventPayloadTyped =
  | AssetUpdatePayload
  | AssetReleasePayload
  | AssetReturnPayload
  | AssetFlagMaintenancePayload
  | AssetStatusChangePayload
  | AssetDeletePayload
  | Record<string, unknown>;

export interface AssetLifecycleEventDTO {
  id: string;
  assetId: string | null;
  assetCode: string;
  eventType: AssetLifecycleEventType;
  actor: {
    userId: string;
    email: string | null;
    displayName: string;
  };
  fromStatus: string | null;
  toStatus: string | null;
  fromHolder: string | null;
  toHolder: string | null;
  payload: AssetLifecycleEventPayloadTyped;
  createdAt: string;
}

export interface RecordLifecycleEventInput {
  assetId: string | null;
  assetCode: string;
  eventType: AssetLifecycleEventType;
  /** Role is allowed on ActorContext but not persisted on ledger for privacy flexibility. */
  actor: Pick<ActorContext, "userId" | "email" | "displayName">;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromHolder?: string | null;
  toHolder?: string | null;
  payload?: AssetLifecycleEventPayloadTyped;
}

export interface ListLifecycleEventsFilters {
  assetId?: string;
  assetCode?: string;
  eventType?: AssetLifecycleEventType;
  limit?: number;
}

/** Build a compact field-level diff for `updated` events. */
export function buildAssetFieldChanges(
  before: AssetRow,
  after: AssetRow,
  keys: (keyof AssetRow)[]
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    if (normalizeComparable(from) !== normalizeComparable(to)) {
      changes[String(key)] = { from: serializeValue(from), to: serializeValue(to) };
    }
  }

  return changes;
}

function normalizeComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}
