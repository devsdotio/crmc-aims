import type { BorrowRequest } from "@/types/borrow-requests";
import type { BorrowLogRecord } from "@/types/borrow-log";
import type { Asset, AssetStatus, AssetAssignmentType } from "@/types/assets";
import type { ConsumableItem } from "@/types/inventory";

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { BorrowRequest, BorrowLogRecord, Asset, AssetStatus, ConsumableItem };

// ─── Portal-specific extensions ───────────────────────────────────────────────

/** Extends the base RequestStatus with portal-side pickup tracking */
export type PortalRequestReleasedStatus = "waiting_pickup" | "released";

export interface PortalBorrowRequest extends BorrowRequest {
  /** Present only when status === "approved" */
  releasedStatus?: PortalRequestReleasedStatus;
  requestedDateFrom: string;
  requestedDateTo: string;
  /** Set when mapped from a consumable requisition (Supplies). */
  portalKind?: "supply";
}

export type PortalBorrowLogRecord = BorrowLogRecord;

// ─── Browse item union ────────────────────────────────────────────────────────

export type BrowseItemType = "asset" | "consumable";

export interface BrowseAssetItem {
  type: "asset";
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  assignmentType: AssetAssignmentType;
  assetCode: string;
  location: string;
  notes?: string;
  currentHolder?: string;
  reservedForRequestId?: string | null;
  /** If unavailable, reason to show in disabled tooltip */
  unavailableReason?: string;
}

export interface BrowseConsumableItem {
  type: "consumable";
  id: string;
  name: string;
  category: string;
  status: "available" | "low_stock" | "out_of_stock";
  itemCode: string;
  unit: string;
  currentQty: number;
  location: string;
  notes?: string;
  unavailableReason?: string;
}

export type BrowseItem = BrowseAssetItem | BrowseConsumableItem;

// ─── Wizard ───────────────────────────────────────────────────────────────────

export type RequestWizardStep = "type" | "select" | "details" | "review";

export type WizardRequestType = "borrowable" | "assignable" | "consumable";

export interface WizardPurposeGroup {
  id: string;
  purpose: string;
  lines: Array<{ itemId: string; quantity: number }>;
}

/** One selected request type with its item pool and purpose sections. */
export interface WizardTypeBundle {
  requestType: WizardRequestType;
  selectedItems: BrowseItem[];
  purposeGroups: WizardPurposeGroup[];
}

export interface WizardFormValues {
  /** One or more request types; each has its own purposes and lines. */
  typeBundles: WizardTypeBundle[];
  dateFrom: string;
  dateTo: string;
  /** Catalog department id when selected; null for free-text-only. */
  departmentId: string | null;
  /** Display / free-text department name. */
  department: string;
  notes: string;
  /** Person the request is for; defaults to department account name, overridable. */
  requestedByName: string;
  /** Account = fill from signed-in profile; Manual = type name and department. */
  requesterMode: "account" | "manual";
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export type ActiveTab = "browse" | "my-requests" | "history";

export type RequestStatusFilter = "all" | "pending" | "approved" | "rejected" | "returned" | "cancelled";

// ─── Summary stats ────────────────────────────────────────────────────────────

export interface PortalSummaryStats {
  activeBorrowings: number;
  pendingRequests: number;
  overdueItems: number;
  completedThisSemester: number;
}
