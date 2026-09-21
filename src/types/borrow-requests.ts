import type { AssetCategory } from './shared';


export type { AssetCategory };
import type { BaseFilterState, DateRangeFilter } from "./filters";

export type RequestStatus = "pending" | "approved" | "rejected" | "released" | "unreleased" | "returned" | "cancelled";

export type TabFilter = "pending" | "approved" | "rejected" | "released" | "returned" | "cancelled" | "all";

export interface ActionHistoryLog {
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
}

export interface BorrowRequest {
  id: string;
  requestCode: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  department: string;
  departmentId?: string | null;
  requestType?: "borrowable" | "assignable" | null;
  requestedByName?: string | null;
  submissionGroupId?: string | null;
  relatedRequests?: Array<{
    id: string;
    requestCode: string;
    kind: "borrow" | "assign" | "supply";
    status: string;
  }>;
  items: {
    itemDescription: string;
    assetId?: string;
    assetCode?: string;
    consumableId?: string;
    category: AssetCategory;
    quantity: number;
    itemType: "asset" | "consumable";
    unit?: string;
    purpose?: string;
  }[];
  purpose: string;
  requestedAt: string;
  relativeTime?: string;
  expectedReturnDate?: string | null;
  status: RequestStatus;
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  pickedUpBy?: string;
  history: ActionHistoryLog[];
}

export interface BorrowRequestFilterState extends BaseFilterState, DateRangeFilter {
  department: string;
}
